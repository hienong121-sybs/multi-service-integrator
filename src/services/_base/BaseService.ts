// Path: /src/services/_base/BaseService.ts
// Module: BaseService
// Depends on: @/lib/firebase/ShardManager, @/lib/crypto/FieldEncryptor, @/lib/logger/AuditLogger, nanoid, crypto
// Description: Abstract base class that implements the common persistence workflow for service modules.
// Fix (P1): list() now reads summary fields from shard_index instead of fetching
//           each full RTDBNode individually, eliminating the N+1 RTDB read pattern.

import { createHash } from 'crypto'
import { nanoid } from 'nanoid'
import { encryptService, decryptService } from '@/lib/crypto/FieldEncryptor'
import { ShardManager } from '@/lib/firebase/ShardManager'
import { AuditLogger } from '@/lib/logger/AuditLogger'
import type { ExportPayload, RTDBNode, SubResourceDef } from '@/types/service'
import type { ServiceListItem, ServiceSaveInput, ServiceSaveResult } from './BaseSchema'

export abstract class BaseService<
  TConfig extends object,
  TCredential extends object,
  TSubResource extends object,
> {
  abstract readonly SERVICE_TYPE: string
  abstract readonly SERVICE_LABEL: string
  abstract readonly CREDENTIAL_FIELDS: string[]
  abstract readonly ICON: string
  abstract readonly DESCRIPTION: string

  /**
   * Validates credentials. Config is passed in so subclasses (e.g. Supabase) can use
   * project_url without mutating instance state.
   */
  abstract validateCredentials(creds: TCredential, config?: Partial<TConfig>): Promise<boolean>

  /**
   * Fetches remote metadata. Config is passed in so subclasses can resolve project context
   * without relying on instance-level currentConfig mutation.
   */
  abstract fetchMetadata(creds: TCredential, config?: Partial<TConfig>): Promise<Partial<TConfig>>

  abstract getSubResourceTypes(): SubResourceDef[]
  abstract fetchSubResources(
    type: string,
    accountId: string,
    uid: string,
    params?: Record<string, string>,
  ): Promise<TSubResource[]>
  abstract createSubResource(
    type: string,
    accountId: string,
    uid: string,
    data: Record<string, unknown>,
  ): Promise<TSubResource | Record<string, unknown>>
  abstract deleteSubResource(
    type: string,
    accountId: string,
    uid: string,
    id: string,
    data?: Record<string, unknown>,
  ): Promise<void>

  private buildSummary(
    name: string,
    config: Record<string, unknown>,
    status = 'active',
  ): { name: string; status: string; email?: string; updatedAt: string } {
    return {
      name,
      status,
      updatedAt: new Date().toISOString(),
      email:
        typeof config.account_email === 'string'
          ? config.account_email
          : typeof config.email === 'string'
            ? config.email
            : undefined,
    }
  }

  /** Saves a service account with encrypted credentials. */
  async save(
    uid: string,
    input: ServiceSaveInput<TConfig, TCredential>,
  ): Promise<ServiceSaveResult> {
    const startedAt = Date.now()
    const id = nanoid(16)
    const encryptedCreds = encryptService(
      this.SERVICE_TYPE,
      input.credentials as Record<string, unknown>,
    )
    const node: RTDBNode = {
      _meta: this.buildMeta({
        name: input.name,
        status: 'active',
      }),
      credentials: encryptedCreds as Record<string, string>,
      config: input.config as Record<string, unknown>,
      sub_resources: {},
    }

    const summary = this.buildSummary(
      input.name,
      input.config as Record<string, unknown>,
      'active',
    )
    const result = await ShardManager.getInstance().write(
      `/${uid}/services/${this.SERVICE_TYPE}/${id}`,
      node,
      summary,
    )
    await AuditLogger.getInstance().log({
      action: 'SERVICE_CREATE',
      actor: uid,
      target: { type: this.SERVICE_TYPE, id },
      payload: { after: input.config },
      result: 'SUCCESS',
      durationMs: Date.now() - startedAt,
    })

    return { id, shardId: result.shardId }
  }

  /** Loads a service account and decrypts its credentials. */
  async load(uid: string, id: string): Promise<{ config: TConfig; credentials: TCredential }> {
    const result = await ShardManager.getInstance().read<RTDBNode>(uid, this.SERVICE_TYPE, id)
    return {
      config: result.data.config as TConfig,
      credentials: decryptService(
        this.SERVICE_TYPE,
        result.data.credentials as Record<string, unknown>,
      ) as TCredential,
    }
  }

  /** Loads a raw encrypted RTDB node for advanced workflows. */
  async loadNode(
    uid: string,
    id: string,
  ): Promise<{ node: RTDBNode; shardId: string; path: string }> {
    const result = await ShardManager.getInstance().read<RTDBNode>(uid, this.SERVICE_TYPE, id)
    return { node: result.data, shardId: result.shardId, path: result.path }
  }

  /**
   * Lists service accounts without exposing credentials.
   * Fast path uses shard_index summary cache to avoid N+1 reads.
   */
  async list(uid: string): Promise<ServiceListItem[]> {
    const entries = await ShardManager.getInstance().list(uid, this.SERVICE_TYPE)
    const items = await Promise.all(
      entries.map(async ({ id, shardId, createdAt, summary }) => {
        if (summary) {
          return {
            id,
            uid,
            serviceType: this.SERVICE_TYPE,
            name: summary.name,
            email: summary.email,
            status: summary.status as ServiceListItem['status'],
            shardId,
            createdAt: createdAt ?? summary.updatedAt,
            updatedAt: summary.updatedAt,
          } satisfies ServiceListItem
        }

        const { data } = await ShardManager.getInstance().read<RTDBNode>(
          uid,
          this.SERVICE_TYPE,
          id,
        )
        return {
          id,
          uid,
          serviceType: this.SERVICE_TYPE,
          name: String(data._meta.name ?? id),
          email:
            typeof data.config.account_email === 'string'
              ? data.config.account_email
              : typeof data.config.email === 'string'
                ? data.config.email
                : undefined,
          status: (data._meta.status as ServiceListItem['status']) ?? 'active',
          shardId,
          createdAt: data._meta.created_at,
          updatedAt: data._meta.updated_at,
        } satisfies ServiceListItem
      }),
    )

    return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  /** Updates a service account in place while preserving encrypted fields. */
  async update(
    uid: string,
    id: string,
    input: { name?: string; config?: Partial<TConfig>; credentials?: Partial<TCredential> },
  ): Promise<void> {
    const startedAt = Date.now()
    const loaded = await this.load(uid, id)
    const raw = await this.loadNode(uid, id)
    const mergedCredentials = {
      ...loaded.credentials,
      ...(input.credentials ?? {}),
    } as TCredential
    const encrypted = encryptService(
      this.SERVICE_TYPE,
      mergedCredentials as Record<string, unknown>,
    )
    const mergedConfig = { ...loaded.config, ...(input.config ?? {}) }
    const newName = input.name ?? String(raw.node._meta.name ?? id)
    const nextStatus = String(raw.node._meta.status ?? 'active')

    await ShardManager.getInstance().update(
      raw.shardId,
      raw.path,
      {
        config: mergedConfig as Record<string, unknown>,
        credentials: encrypted as Record<string, string>,
        _meta: {
          ...raw.node._meta,
          name: newName,
        },
      },
      this.buildSummary(newName, mergedConfig as Record<string, unknown>, nextStatus),
    )

    await AuditLogger.getInstance().log({
      action: 'SERVICE_UPDATE',
      actor: uid,
      target: { type: this.SERVICE_TYPE, id },
      payload: { before: raw.node.config, after: mergedConfig },
      result: 'SUCCESS',
      durationMs: Date.now() - startedAt,
    })
  }

  /** Persists sub-resources back into the service node. */
  async saveSubResources(
    uid: string,
    id: string,
    type: string,
    resources: Record<string, unknown>[],
  ): Promise<void> {
    const raw = await this.loadNode(uid, id)
    const keyed = Object.fromEntries(
      resources.map((item, index) => [
        String(item.id ?? item.name ?? index),
        item,
      ]),
    )
    await ShardManager.getInstance().update(raw.shardId, raw.path, {
      sub_resources: {
        ...(raw.node.sub_resources ?? {}),
        [type]: keyed,
      },
    })
  }

  /** Deletes a service account and records an audit entry. */
  async delete(uid: string, id: string): Promise<void> {
    const startedAt = Date.now()
    const record = await this.loadNode(uid, id)
    await ShardManager.getInstance().delete(
      record.shardId,
      `/${uid}/services/${this.SERVICE_TYPE}/${id}`,
    )
    await ShardManager.getInstance().delete(
      record.shardId,
      `/shard_index/${uid}/${this.SERVICE_TYPE}/${id}`,
    )

    await AuditLogger.getInstance().log({
      action: 'SERVICE_DELETE',
      actor: uid,
      target: { type: this.SERVICE_TYPE, id },
      payload: { before: record.node.config },
      result: 'SUCCESS',
      durationMs: Date.now() - startedAt,
    })
  }

  /** Builds an encrypted export payload for one service scope. */
  async export(uid: string, ids?: string[]): Promise<ExportPayload> {
    const all = await this.list(uid)
    const selected = ids?.length ? all.filter((item) => ids.includes(item.id)) : all
    const entries = await Promise.all(
      selected.map(async (item) => {
        const loaded = await this.loadNode(uid, item.id)
        return [item.id, loaded.node] as const
      }),
    )
    const data = Object.fromEntries(entries)
    const checksum = createHash('sha256').update(JSON.stringify(data)).digest('hex')

    return {
      version: '1.0',
      exported_at: new Date().toISOString(),
      exported_by: uid,
      scope: this.SERVICE_TYPE,
      schema_version: '1',
      data,
      checksum,
    }
  }

  /** Imports raw encrypted records into RTDB. */
  async import(uid: string, payload: ExportPayload): Promise<void> {
    for (const [id, node] of Object.entries(payload.data)) {
      await ShardManager.getInstance().write(`/${uid}/services/${this.SERVICE_TYPE}/${id}`, node)
    }
  }

  /** Builds standard metadata for service nodes. */
  protected buildMeta(extra?: Record<string, unknown>): RTDBNode['_meta'] {
    return {
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      schema_v: '1',
      ...extra,
    }
  }
}
