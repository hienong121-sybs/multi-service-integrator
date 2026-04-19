// Path: /src/services/cloudflare/types.ts
// Module: Cloudflare Types
// Depends on: none
// Description: Shared types for Cloudflare service flows.

export interface CloudflareCredential {
  api_key?: string
  api_token?: string
  email?: string
}

export interface CloudflareConfig {
  account_id: string
  account_name: string
  plan: string
}

export interface CFZone {
  id: string
  name: string
  status: 'active' | 'pending' | 'initializing' | 'moved' | 'deleted'
  plan: { name: string }
  name_servers: string[]
  modified_on: string
}

export interface CFTunnel {
  id: string
  name: string
  status: 'healthy' | 'degraded' | 'down' | 'inactive'
  created_at: string
  connections: Array<{ colo_name: string; is_pending_reconnect: boolean; opened_at: string }>
}

export interface CFTunnelConnector {
  id: string
  colo_name?: string
  is_pending_reconnect?: boolean
  opened_at?: string
  client_id?: string
  origin_ip?: string
}

export interface CFTunnelToken {
  tunnel_id: string
  token: string
  fetched_at: string
}

export interface CFDnsRecord {
  id: string
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SRV'
  name: string
  content: string
  ttl: number
  proxied: boolean
  modified_on: string
}

export interface CreateDnsRecordInput {
  zone_id: string
  type: CFDnsRecord['type']
  name: string
  content: string
  ttl?: number
  proxied?: boolean
}

export interface CreateZoneInput {
  account_id: string
  name: string
  type?: 'full' | 'partial'
}
