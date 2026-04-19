// Path: /src/services/cloudflare/CloudflareService.ts
// Module: CloudflareService
// Depends on: ../_base/BaseService, ./CloudflareApi, ../_registry/ServiceRegistry
// Description: Cloudflare service business logic.

import { BaseService } from '../_base/BaseService'
import { CloudflareApi } from './CloudflareApi'
import { ServiceRegistry } from '../_registry/ServiceRegistry'
import type {
  CloudflareConfig,
  CloudflareCredential,
  CFDnsRecord,
  CFTunnel,
  CFTunnelConnector,
  CFTunnelToken,
  CFZone,
} from './types'
import type { SubResourceDef } from '@/types/service'

export class CloudflareService extends BaseService<
  CloudflareConfig,
  CloudflareCredential,
  CFZone | CFTunnel | CFDnsRecord | CFTunnelConnector | CFTunnelToken
> {
  readonly SERVICE_TYPE = 'cloudflare' as const
  readonly SERVICE_LABEL = 'Cloudflare'
  readonly CREDENTIAL_FIELDS = ['api_key', 'api_token']
  readonly ICON = 'cloud'
  readonly DESCRIPTION = 'Manage Cloudflare zones, tunnels, and DNS records'

  /** Validates Cloudflare credentials by reading an account. */
  async validateCredentials(creds: CloudflareCredential): Promise<boolean> {
    try {
      await new CloudflareApi(creds).getAccount()
      return true
    } catch {
      return false
    }
  }

  /** Fetches Cloudflare account metadata. */
  async fetchMetadata(creds: CloudflareCredential): Promise<Partial<CloudflareConfig>> {
    const account = await new CloudflareApi(creds).getAccount()
    return {
      account_id: account.id,
      account_name: account.name,
      plan: creds.api_token ? 'token' : 'global-key',
    }
  }

  /** Returns Cloudflare sub-resource definitions. */
  getSubResourceTypes(): SubResourceDef[] {
    return [
      { type: 'zones', label: 'Zones', icon: 'globe', canCreate: true, canDelete: true },
      { type: 'tunnels', label: 'Tunnels', icon: 'cloud', canCreate: true, canDelete: true },
      { type: 'dns_records', label: 'DNS Records', icon: 'webhook', canCreate: true, canDelete: true, requiresInput: ['zone_id'] },
      { type: 'tunnel_connectors', label: 'Tunnel Connectors', icon: 'plug', canCreate: false, canDelete: true, requiresInput: ['tunnel_id'] },
      { type: 'tunnel_token', label: 'Tunnel Token', icon: 'key-round', canCreate: false, canDelete: false, requiresInput: ['tunnel_id'] },
    ]
  }

  private async loadCachedSubResources(uid: string, accountId: string, cacheKey: string) {
    const raw = await this.loadNode(uid, accountId)
    const subResources = raw.node.sub_resources ?? {}
    const cached = subResources[cacheKey]
    if (!cached) return null
    return Object.values(cached)
  }

  /** Fetches Cloudflare sub-resources. */
  async fetchSubResources(
    type: string,
    accountId: string,
    uid: string,
    params: Record<string, string> = {},
  ): Promise<(CFZone | CFTunnel | CFDnsRecord | CFTunnelConnector | CFTunnelToken)[]> {
    const { config, credentials } = await this.load(uid, accountId)
    const api = new CloudflareApi(credentials)
    const shouldRefresh = params.refresh === '1' || params.refresh === 'true'
    const zoneId = typeof params.zone_id === 'string' ? params.zone_id : ''
    const tunnelId = typeof params.tunnel_id === 'string' ? params.tunnel_id : ''
    const cacheKey = type === 'dns_records' && zoneId
      ? `${type}_${zoneId}`
      : (type === 'tunnel_connectors' || type === 'tunnel_token') && tunnelId
        ? `${type}_${tunnelId}`
        : type

    if (!shouldRefresh) {
      const cached = await this.loadCachedSubResources(uid, accountId, cacheKey)
      if (cached) return cached as (CFZone | CFTunnel | CFDnsRecord | CFTunnelConnector | CFTunnelToken)[]
    }

    switch (type) {
      case 'zones': {
        const firstPage = await api.listZones(1)
        await this.saveSubResources(uid, accountId, type, firstPage.result as unknown as Record<string, unknown>[])
        return firstPage.result
      }
      case 'tunnels': {
        const tunnels = await api.listTunnels(String(config.account_id))
        await this.saveSubResources(uid, accountId, type, tunnels as unknown as Record<string, unknown>[])
        return tunnels
      }
      case 'dns_records': {
        if (!zoneId) return []
        const records = await api.listDnsRecords(zoneId)
        await this.saveSubResources(uid, accountId, cacheKey, records as unknown as Record<string, unknown>[])
        return records
      }
      case 'tunnel_connectors': {
        if (!tunnelId) return []
        const connectors = await api.listTunnelConnectors(String(config.account_id), tunnelId)
        await this.saveSubResources(uid, accountId, cacheKey, connectors as unknown as Record<string, unknown>[])
        return connectors
      }
      case 'tunnel_token': {
        if (!tunnelId) return []
        const token = await api.getTunnelToken(String(config.account_id), tunnelId)
        const payload: CFTunnelToken = {
          tunnel_id: tunnelId,
          token,
          fetched_at: new Date().toISOString(),
        }
        await this.saveSubResources(uid, accountId, cacheKey, [payload as unknown as Record<string, unknown>])
        return [payload]
      }
      default:
        return []
    }
  }

  /** Creates a Cloudflare tunnel or DNS record. */
  async createSubResource(type: string, accountId: string, uid: string, data: Record<string, unknown>) {
    const { config, credentials } = await this.load(uid, accountId)
    const api = new CloudflareApi(credentials)

    if (type === 'tunnels') {
      if (!data.name) return { missing_fields: ['name'], defaults: {} }
      return api.createTunnel(String(config.account_id), String(data.name))
    }

    if (type === 'zones') {
      if (!data.name) return { missing_fields: ['name'], defaults: { type: 'full' } }
      return api.createZone({
        account_id: String(config.account_id),
        name: String(data.name),
        type: data.type === 'partial' ? 'partial' : 'full',
      })
    }

    if (type === 'dns_records') {
      const missing = ['zone_id', 'type', 'name', 'content'].filter((field) => !data[field])
      if (missing.length > 0) return { missing_fields: missing, defaults: { ttl: 1, proxied: true } }
      if (data.record_id) {
        return api.updateDnsRecord(String(data.zone_id), String(data.record_id), {
          type: String(data.type) as CFDnsRecord['type'],
          name: String(data.name),
          content: String(data.content),
          ttl: data.ttl ? Number(data.ttl) : 1,
          proxied: data.proxied !== 'false',
        })
      }
      return api.createDnsRecord(String(data.zone_id), {
        zone_id: String(data.zone_id),
        type: String(data.type) as CFDnsRecord['type'],
        name: String(data.name),
        content: String(data.content),
        ttl: data.ttl ? Number(data.ttl) : 1,
        proxied: data.proxied !== 'false',
      })
    }

    return { missing_fields: ['type'], defaults: {} }
  }

  /** Deletes a Cloudflare tunnel or DNS record. */
  async deleteSubResource(type: string, accountId: string, uid: string, id: string, data: Record<string, unknown> = {}): Promise<void> {
    const { config, credentials } = await this.load(uid, accountId)
    const api = new CloudflareApi(credentials)

    if (type === 'tunnels') {
      await api.deleteTunnel(String(config.account_id), id)
      return
    }

    if (type === 'zones') {
      await api.deleteZone(id)
      return
    }

    if (type === 'tunnel_connectors') {
      const tunnelId = typeof data.tunnel_id === 'string' ? data.tunnel_id : ''
      if (!tunnelId) return
      const clientId = typeof data.client_id === 'string' ? data.client_id : undefined
      await api.disconnectTunnelConnector(String(config.account_id), tunnelId, clientId)
      return
    }

    if (type === 'dns_records' && data.zone_id) {
      await api.deleteDnsRecord(String(data.zone_id), id)
    }
  }
}

ServiceRegistry.register(new CloudflareService())
