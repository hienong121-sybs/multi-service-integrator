// Path: /src/services/cloudflare/CloudflareApi.ts
// Module: CloudflareApi
// Depends on: axios, crypto
// Description: Cloudflare REST API adapter.

import { randomBytes } from 'crypto'
import axios, { AxiosError } from 'axios'
import type {
  CFDnsRecord,
  CFTunnel,
  CFTunnelConnector,
  CFZone,
  CreateDnsRecordInput,
  CreateZoneInput,
} from './types'

const CF_ERROR_MAP: Record<number, string> = {
  400: 'CF-API-000',
  401: 'CF-AUTH-001',
  403: 'CF-AUTH-001',
  404: 'CF-API-002',
  429: 'CF-API-001',
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class CloudflareApi {
  private readonly baseUrl = 'https://api.cloudflare.com/client/v4'

  constructor(private readonly cred: { api_key?: string; api_token?: string; email?: string }) {}

  /** Builds Cloudflare authorization headers. */
  private headers(): Record<string, string> {
    if (this.cred.api_token) {
      return {
        Authorization: `Bearer ${this.cred.api_token}`,
        'Content-Type': 'application/json',
      }
    }

    return {
      'X-Auth-Email': this.cred.email ?? '',
      'X-Auth-Key': this.cred.api_key ?? '',
      'Content-Type': 'application/json',
    }
  }

  /** Returns the first accessible account. */
  async getAccount(): Promise<{ id: string; name: string }> {
    const response = await this.request<Array<{ id: string; name: string }>>('/accounts?page=1&per_page=1')
    return response.result[0]
  }

  /** Lists zones for the account. */
  async listZones(page = 1): Promise<{ result: CFZone[]; result_info: { total_pages: number } }> {
    return this.request(`/zones?page=${page}&per_page=50`)
  }

  /** Lists account tunnels. */
  async listTunnels(accountId: string): Promise<CFTunnel[]> {
    const response = await this.request<CFTunnel[]>(`/accounts/${accountId}/cfd_tunnel`)
    return response.result
  }

  /** Lists active connectors for one tunnel. */
  async listTunnelConnectors(accountId: string, tunnelId: string): Promise<CFTunnelConnector[]> {
    const response = await this.request<CFTunnelConnector[]>(`/accounts/${accountId}/cfd_tunnel/${tunnelId}/connections`)
    return response.result
  }

  /** Disconnects one connector (or all if clientId omitted) from a tunnel. */
  async disconnectTunnelConnector(accountId: string, tunnelId: string, clientId?: string): Promise<void> {
    const suffix = clientId ? `?client_id=${encodeURIComponent(clientId)}` : ''
    await this.request(`/accounts/${accountId}/cfd_tunnel/${tunnelId}/connections${suffix}`, { method: 'DELETE' })
  }

  /** Creates a Cloudflare tunnel. */
  async createTunnel(accountId: string, name: string): Promise<CFTunnel> {
    const response = await this.request<CFTunnel>(`/accounts/${accountId}/cfd_tunnel`, {
      method: 'POST',
      body: {
        name,
        tunnel_secret: randomBytes(32).toString('base64'),
      },
    })
    return response.result
  }

  /** Deletes a Cloudflare tunnel. */
  async deleteTunnel(accountId: string, tunnelId: string): Promise<void> {
    await this.request(`/accounts/${accountId}/cfd_tunnel/${tunnelId}`, { method: 'DELETE' })
  }

  /** Returns a tunnel token string. */
  async getTunnelToken(accountId: string, tunnelId: string): Promise<string> {
    const response = await this.request<string>(`/accounts/${accountId}/cfd_tunnel/${tunnelId}/token`)
    return response.result
  }

  /** Creates a new zone (domain) under account. */
  async createZone(input: CreateZoneInput): Promise<CFZone> {
    const response = await this.request<CFZone>('/zones', {
      method: 'POST',
      body: {
        name: input.name,
        account: { id: input.account_id },
        type: input.type ?? 'full',
      },
    })
    return response.result
  }

  /** Deletes a zone. */
  async deleteZone(zoneId: string): Promise<void> {
    await this.request(`/zones/${zoneId}`, { method: 'DELETE' })
  }

  /** Lists DNS records for a zone. */
  async listDnsRecords(zoneId: string): Promise<CFDnsRecord[]> {
    const response = await this.request<CFDnsRecord[]>(`/zones/${zoneId}/dns_records`)
    return response.result
  }

  /** Creates a DNS record. */
  async createDnsRecord(zoneId: string, record: CreateDnsRecordInput): Promise<CFDnsRecord> {
    const response = await this.request<CFDnsRecord>(`/zones/${zoneId}/dns_records`, {
      method: 'POST',
      body: {
        type: record.type,
        name: record.name,
        content: record.content,
        ttl: record.ttl ?? 1,
        proxied: record.proxied ?? true,
      },
    })
    return response.result
  }

  /** Deletes a DNS record. */
  async deleteDnsRecord(zoneId: string, recordId: string): Promise<void> {
    await this.request(`/zones/${zoneId}/dns_records/${recordId}`, { method: 'DELETE' })
  }

  /** Updates a DNS record in place. */
  async updateDnsRecord(zoneId: string, recordId: string, record: Partial<CreateDnsRecordInput>): Promise<CFDnsRecord> {
    const response = await this.request<CFDnsRecord>(`/zones/${zoneId}/dns_records/${recordId}`, {
      method: 'PATCH',
      body: {
        ...(record.type ? { type: record.type } : {}),
        ...(record.name ? { name: record.name } : {}),
        ...(record.content ? { content: record.content } : {}),
        ...(typeof record.ttl === 'number' ? { ttl: record.ttl } : {}),
        ...(typeof record.proxied === 'boolean' ? { proxied: record.proxied } : {}),
      },
    })
    return response.result
  }

  /** Performs a Cloudflare API request with retry. */
  private async request<T>(path: string, options: { method?: string; body?: unknown; retries?: number } = {}): Promise<{ result: T; result_info: { total_pages: number } }> {
    const retries = options.retries ?? 3

    try {
      const response = await axios({
        url: `${this.baseUrl}${path}`,
        method: options.method ?? 'GET',
        data: options.body,
        headers: this.headers(),
        timeout: 30_000,
      })
      return response.data as { result: T; result_info: { total_pages: number } }
    } catch (error) {
      const axiosError = error as AxiosError
      const status = axiosError.response?.status ?? 500
      if (retries > 0 && (status === 429 || status >= 500)) {
        await sleep((4 - retries) * 500)
        return this.request<T>(path, { ...options, retries: retries - 1 })
      }
      throw {
        code: CF_ERROR_MAP[status] ?? 'CF-API-001',
        message: axiosError.message,
        statusCode: status,
      }
    }
  }
}
