// Path: /src/services/_registry/serviceForms.ts
// Module: Service Form Definitions
// Depends on: none
// Description: Dynamic form definitions used by generic add-account flows.

export interface DynamicFormField {
  name: string
  label: string
  type: 'text' | 'password' | 'select' | 'textarea' | 'url' | 'email'
  required: boolean
  section: 'config' | 'credentials'
  placeholder?: string
  options?: { value: string; label: string }[]
  defaultValue?: string
  showWhen?: { field: string; values: string[] }
}

export const SERVICE_FORM_FIELDS: Record<string, DynamicFormField[]> = {
  github: [
    { name: 'account_email', label: 'Account email', type: 'email', required: false, section: 'config', placeholder: 'owner@example.com' },
    { name: 'token', label: 'Personal access token', type: 'password', required: true, section: 'credentials', placeholder: 'ghp_...' },
    { name: 'webhook_secret', label: 'Webhook secret', type: 'password', required: false, section: 'credentials' },
  ],
  cloudflare: [
    { name: 'email', label: 'Account email', type: 'email', required: false, section: 'credentials', placeholder: 'owner@example.com' },
    { name: 'api_token', label: 'Scoped API token', type: 'password', required: false, section: 'credentials' },
    { name: 'api_key', label: 'Global API key', type: 'password', required: false, section: 'credentials' },
  ],
  supabase: [
    { name: 'project_url', label: 'Project URL', type: 'url', required: true, section: 'config', placeholder: 'https://xyz.supabase.co' },
    { name: 'service_role_key', label: 'Service role key', type: 'password', required: true, section: 'credentials' },
    { name: 'anon_key', label: 'Anon key', type: 'password', required: true, section: 'credentials' },
    { name: 'access_token', label: 'Management access token', type: 'password', required: false, section: 'credentials' },
  ],
  resend: [
    { name: 'api_key', label: 'API key', type: 'password', required: true, section: 'credentials', placeholder: 're_...' },
  ],
  'google-creds': [
    {
      name: 'credential_type',
      label: 'Credential type',
      type: 'select',
      required: true,
      section: 'config',
      defaultValue: 'service_account',
      options: [
        { value: 'service_account', label: 'Service Account' },
        { value: 'oauth_app', label: 'OAuth App' },
        { value: 'api_key', label: 'API Key' },
      ],
    },
    {
      name: 'json_key',
      label: 'Service account JSON',
      type: 'textarea',
      required: true,
      section: 'credentials',
      showWhen: { field: 'credential_type', values: ['service_account'] },
    },
    {
      name: 'client_id',
      label: 'OAuth client ID',
      type: 'text',
      required: true,
      section: 'credentials',
      showWhen: { field: 'credential_type', values: ['oauth_app'] },
    },
    {
      name: 'client_secret',
      label: 'OAuth client secret',
      type: 'password',
      required: true,
      section: 'credentials',
      showWhen: { field: 'credential_type', values: ['oauth_app'] },
    },
    {
      name: 'redirect_uris',
      label: 'Redirect URIs (one per line)',
      type: 'textarea',
      required: false,
      section: 'credentials',
      showWhen: { field: 'credential_type', values: ['oauth_app'] },
    },
    {
      name: 'app_type',
      label: 'OAuth app type',
      type: 'select',
      required: false,
      section: 'credentials',
      defaultValue: 'web',
      options: [
        { value: 'web', label: 'Web' },
        { value: 'desktop', label: 'Desktop' },
        { value: 'mobile', label: 'Mobile' },
      ],
      showWhen: { field: 'credential_type', values: ['oauth_app'] },
    },
    {
      name: 'key',
      label: 'API key',
      type: 'password',
      required: true,
      section: 'credentials',
      showWhen: { field: 'credential_type', values: ['api_key'] },
    },
    {
      name: 'restrictions',
      label: 'Restrictions (comma separated)',
      type: 'textarea',
      required: false,
      section: 'credentials',
      showWhen: { field: 'credential_type', values: ['api_key'] },
    },
  ],
  azure: [
    { name: 'organization', label: 'Organization (optional)', type: 'text', required: false, section: 'config', placeholder: 'your-org' },
    { name: 'org_hints', label: 'Org hints (comma separated)', type: 'textarea', required: false, section: 'config', placeholder: 'org-a,org-b' },
    { name: 'default_project', label: 'Default project', type: 'text', required: false, section: 'config' },
    { name: 'account_email', label: 'Account email', type: 'email', required: false, section: 'config' },
    { name: 'pat', label: 'PAT token', type: 'password', required: true, section: 'credentials', placeholder: 'azdpat...' },
  ],
}

/** Returns the dynamic field definitions for a service. */
export function getServiceFormFields(serviceType: string): DynamicFormField[] {
  return SERVICE_FORM_FIELDS[serviceType] ?? []
}
