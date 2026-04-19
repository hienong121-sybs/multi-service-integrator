// Path: /src/services/google-creds/GoogleCredsService.ts
// Module: GoogleCredsService
// Depends on: ../_base/BaseService, ./GoogleCredsApi, ../_registry/ServiceRegistry
// Description: Google credential storage service.

import { BaseService } from '../_base/BaseService'
import { GoogleCredsApi } from './GoogleCredsApi'
import { ServiceRegistry } from '../_registry/ServiceRegistry'
import type { GCPProject, GoogleCredential, GoogleCredType, GoogleCredsConfig } from './types'
import type { SubResourceDef } from '@/types/service'

export class GoogleCredsService extends BaseService<GoogleCredsConfig, GoogleCredential, GCPProject> {
  readonly SERVICE_TYPE = 'google-creds' as const
  readonly SERVICE_LABEL = 'Google Credentials'
  readonly CREDENTIAL_FIELDS = ['client_secret', 'json_key', 'key']
  readonly ICON = 'key-round'
  readonly DESCRIPTION = 'Manage Google OAuth apps, service accounts, and API keys'

  private resolveCredentialType(
    creds: Record<string, unknown>,
    config?: Partial<GoogleCredsConfig>,
  ): GoogleCredType | null {
    const value = typeof creds.credential_type === 'string'
      ? creds.credential_type
      : config?.credential_type

    if (
      value === 'oauth_app'
      || value === 'service_account'
      || value === 'api_key'
    ) {
      return value
    }
    return null
  }

  /** Validates Google credentials based on the credential subtype. */
  async validateCredentials(
    creds: GoogleCredential,
    config?: Partial<GoogleCredsConfig>,
  ): Promise<boolean> {
    const api = new GoogleCredsApi()
    const plainCreds = creds as unknown as Record<string, unknown>
    const credentialType = this.resolveCredentialType(plainCreds, config)
    try {
      switch (credentialType) {
        case 'oauth_app':
          return api.validateOAuthApp(
            typeof plainCreds.client_id === 'string' ? plainCreds.client_id : '',
            typeof plainCreds.client_secret === 'string' ? plainCreds.client_secret : '',
          )
        case 'service_account': {
          const jsonKey = typeof plainCreds.json_key === 'string' ? plainCreds.json_key : ''
          const parsed = JSON.parse(jsonKey) as { type?: string; project_id?: string; private_key?: string }
          return parsed.type === 'service_account' && Boolean(parsed.project_id && parsed.private_key)
        }
        case 'api_key': {
          const key = typeof plainCreds.key === 'string' ? plainCreds.key : ''
          return api.validateApiKey(key)
        }
        default:
          return false
      }
    } catch {
      return false
    }
  }

  /** Derives metadata from Google credential content. */
  async fetchMetadata(
    creds: GoogleCredential,
    config?: Partial<GoogleCredsConfig>,
  ): Promise<Partial<GoogleCredsConfig>> {
    const plainCreds = creds as unknown as Record<string, unknown>
    const credentialType = this.resolveCredentialType(plainCreds, config)

    if (credentialType === 'service_account') {
      const jsonKey = typeof plainCreds.json_key === 'string' ? plainCreds.json_key : '{}'
      const parsed = JSON.parse(jsonKey) as { project_id?: string; client_email?: string }
      return {
        credential_type: 'service_account',
        display_name: parsed.client_email ?? 'Service Account',
        project_id: parsed.project_id,
        client_email: parsed.client_email,
      }
    }

    if (credentialType === 'oauth_app') {
      const clientId = typeof plainCreds.client_id === 'string' ? plainCreds.client_id : 'unknown-client'
      return {
        credential_type: 'oauth_app',
        display_name: `OAuth App - ${clientId}`,
      }
    }

    return {
      credential_type: 'api_key',
      display_name: 'Google API Key',
    }
  }

  /** Returns Google credential sub-resource definitions. */
  getSubResourceTypes(): SubResourceDef[] {
    return [
      { type: 'projects', label: 'GCP Projects', icon: 'folder', canCreate: false, canDelete: false },
    ]
  }

  /** Lists GCP projects when a service account is stored. */
  async fetchSubResources(type: string, accountId: string, uid: string): Promise<GCPProject[]> {
    if (type !== 'projects') return []
    const { credentials, config } = await this.load(uid, accountId)
    const plainCreds = credentials as unknown as Record<string, unknown>
    const credentialType = this.resolveCredentialType(plainCreds, config)
    if (credentialType !== 'service_account') return []
    const jsonKey = typeof plainCreds.json_key === 'string' ? plainCreds.json_key : ''
    if (!jsonKey) return []
    return new GoogleCredsApi().listProjects(jsonKey)
  }

  /** Google project creation is not supported. */
  async createSubResource() {
    return { missing_fields: ['unsupported'], defaults: {} }
  }

  /** Google project deletion is not supported. */
  async deleteSubResource(): Promise<void> {
    throw { code: 'GC-API-001', message: 'Deleting GCP projects is not supported' }
  }
}

ServiceRegistry.register(new GoogleCredsService())
