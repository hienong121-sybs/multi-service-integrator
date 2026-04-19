// Path: /src/lib/firebase/index.ts
// Module: Firebase Types and Exports
// Depends on: none
// Description: Shared firebase-related type exports and module re-exports.

export interface ShardConfig {
  id: string
  projectId: string
  databaseUrl: string
  serviceAccountBase64: string
  capacity: number
  currentLoad: number
  isAvailable: boolean
}

export interface WriteResult {
  shardId: string
  path: string
  key: string
}

export interface ReadResult<T = unknown> {
  data: T
  shardId: string
  path: string
}

export interface ShardIndexEntry {
  shardId: string
  createdAt: string
  replicatedShards?: Record<string, string>
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

export interface HealthStatus {
  shardId: string
  isHealthy: boolean
  latencyMs?: number
  error?: string
  checkedAt: string
}

export * from './FirebaseAdmin'
export * from './FirebaseClient'
export * from './ShardSelector'
export * from './ShardManager'
