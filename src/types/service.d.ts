// Path: /src/types/service.d.ts
// Module: Shared Service Types
// Depends on: none
// Description: Shared types used across services, APIs, and logging.

export type ServiceType =
  | 'github'
  | 'cloudflare'
  | 'supabase'
  | 'resend'
  | 'google-creds'
  | 'azure'

export type ServiceStatus = 'active' | 'invalid' | 'pending' | 'error'

export interface ServiceListItem {
  id: string
  uid: string
  serviceType: ServiceType | string
  name: string
  email?: string
  status: ServiceStatus
  shardId: string
  createdAt: string
  updatedAt: string
}

export interface ServiceDetail extends ServiceListItem {
  config: Record<string, unknown>
}

export interface SubResourceDef {
  type: string
  label: string
  icon: string
  canCreate: boolean
  canDelete: boolean
  requiresInput?: string[]
  createFields?: string[]
  createActionLabel?: string
  deleteActionLabel?: string
  description?: string
}

export interface ExportPayload {
  version: '1.0'
  exported_at: string
  exported_by: string
  scope: ServiceType | 'all' | string
  schema_version: '1'
  data: Record<string, unknown>
  checksum: string
}

export interface ApiResponse<T = unknown> {
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  meta?: {
    page?: number
    cursor?: string
    total?: number
    duration_ms?: number
  }
}

export interface AuditEntry {
  id: string
  action: 'SERVICE_CREATE' | 'SERVICE_UPDATE' | 'SERVICE_DELETE' | 'API_CALL' | 'EXPORT' | 'IMPORT'
  actor: string
  target: {
    type: string
    id: string
  }
  payload?: {
    before?: unknown
    after?: unknown
  }
  result: 'SUCCESS' | 'FAILURE'
  errorCode?: string
  durationMs: number
  timestamp: string
}

export interface RTDBNode {
  _meta: {
    created_at: string
    updated_at: string
    version: number
    schema_v: string
    [key: string]: unknown
  }
  credentials: Record<string, string>
  config: Record<string, unknown>
  sub_resources?: Record<string, Record<string, unknown>>
}
