// Path: /src/services/_registry/index.ts
// Module: Service Registry Entry Point
// Depends on: ./ServiceRegistry, ./serviceMeta, service modules
// Description: Imports service implementations for registration side-effects and exports registry helpers.

import '@/services/github'
import '@/services/cloudflare'
import '@/services/supabase'
import '@/services/resend'
import '@/services/google-creds'
import '@/services/azure'

export * from './ServiceRegistry'
export * from './serviceMeta'
export * from './serviceForms'
