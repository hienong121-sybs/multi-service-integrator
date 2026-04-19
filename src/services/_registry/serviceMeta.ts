// Path: /src/services/_registry/serviceMeta.ts
// Module: Service Metadata Registry
// Depends on: none
// Description: Client-safe metadata for all supported services.

export interface ServiceMeta {
  type: string
  label: string
  icon: string
  description: string
}

export const SERVICE_META: ServiceMeta[] = [
  {
    type: 'github',
    label: 'GitHub',
    icon: 'github',
    description: 'Manage repositories, workflows, and webhooks.',
  },
  {
    type: 'cloudflare',
    label: 'Cloudflare',
    icon: 'cloud',
    description: 'Manage zones, tunnels, DNS, and account-level resources.',
  },
  {
    type: 'supabase',
    label: 'Supabase',
    icon: 'database',
    description: 'Manage projects, tables, keys, and edge functions.',
  },
  {
    type: 'resend',
    label: 'Resend',
    icon: 'mail',
    description: 'Manage email domains and API keys.',
  },
  {
    type: 'azure',
    label: 'Azure DevOps',
    icon: 'cloud',
    description: 'Manage Azure projects, repositories, pipelines, and artifacts.',
  },
  {
    type: 'google-creds',
    label: 'Google Credentials',
    icon: 'key-round',
    description: 'Store OAuth apps, service accounts, and API keys.',
  },
]

/** Returns metadata for a service type. */
export function getServiceMeta(type: string): ServiceMeta | undefined {
  return SERVICE_META.find((item) => item.type === type)
}
