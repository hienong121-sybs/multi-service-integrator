// Path: /src/services/github/GithubService.ts
// Module: GithubService
// Depends on: ../_base/BaseService, ./GithubApi, ../_registry/ServiceRegistry
// Description: GitHub business logic implementation.

import { BaseService } from '../_base/BaseService'
import { GithubApi } from './GithubApi'
import { ServiceRegistry } from '../_registry/ServiceRegistry'
import type { SubResourceDef } from '@/types/service'
import type {
  GithubConfig,
  GithubCredential,
  GithubHook,
  GithubOrg,
  GithubRepo,
  GithubRepoFile,
  GithubRepoZip,
  GithubRepoSecret,
  GithubWorkflow,
  GithubWorkflowLog,
  GithubWorkflowRun,
} from './types'

export class GithubService extends BaseService<
  GithubConfig,
  GithubCredential,
  GithubRepo | GithubOrg | GithubWorkflow | GithubHook | GithubWorkflowRun | GithubRepoSecret | GithubWorkflowLog | GithubRepoFile | GithubRepoZip
> {
  readonly SERVICE_TYPE = 'github' as const
  readonly SERVICE_LABEL = 'GitHub'
  readonly CREDENTIAL_FIELDS = ['token', 'webhook_secret']
  readonly ICON = 'github'
  readonly DESCRIPTION = 'Manage GitHub accounts, repositories, workflows, workflow runs, logs, webhooks, and actions secrets'

  /** Validates a GitHub token by fetching the current user. */
  async validateCredentials(creds: GithubCredential): Promise<boolean> {
    try {
      await new GithubApi(creds.token).getUser()
      return true
    } catch {
      return false
    }
  }

  /**
   * Fetches GitHub account metadata from the API.
   * Config is passed in to preserve account_email without instance mutation.
   */
  async fetchMetadata(creds: GithubCredential, config?: Partial<GithubConfig>): Promise<Partial<GithubConfig>> {
    const user = await new GithubApi(creds.token).getUser()
    const plan = (user.plan?.name?.toLowerCase() ?? 'free') as GithubConfig['plan']
    return {
      owner: user.login,
      account_email: config?.account_email ?? creds.email ?? user.email ?? undefined,
      avatar_url: user.avatar_url,
      html_url: user.html_url,
      plan: ['free', 'pro', 'team', 'enterprise'].includes(plan) ? plan : 'free',
      public_repos: user.public_repos,
      private_repos: user.total_private_repos ?? 0,
      followers: user.followers,
      following: user.following,
    }
  }

  /** Returns supported GitHub sub-resource types. */
  getSubResourceTypes(): SubResourceDef[] {
    return [
      {
        type: 'orgs',
        label: 'Organizations',
        icon: 'building-2',
        canCreate: false,
        canDelete: false,
        description: 'List organizations available to this account.',
      },
      {
        type: 'repos',
        label: 'Repositories',
        icon: 'folder-git-2',
        canCreate: false,
        canDelete: false,
        description: 'List repositories available to this account.',
      },
      {
        type: 'workflows',
        label: 'Workflows',
        icon: 'play-circle',
        canCreate: true,
        canDelete: false,
        requiresInput: ['repo_name'],
        createFields: ['repo_name', 'workflow_id', 'ref'],
        createActionLabel: 'Run workflow',
        description: 'List workflow YAML files by repository and trigger a workflow dispatch.',
      },
      {
        type: 'workflow-runs',
        label: 'Workflow Runs',
        icon: 'activity',
        canCreate: false,
        canDelete: true,
        requiresInput: ['repo_name', 'workflow_id'],
        deleteActionLabel: 'Stop run',
        description: 'List recent runs for a workflow and stop in-progress runs.',
      },
      {
        type: 'workflow-logs',
        label: 'Workflow Logs',
        icon: 'file-text',
        canCreate: false,
        canDelete: false,
        requiresInput: ['repo_name', 'run_id'],
        description: 'Fetch and preview workflow run logs by run ID.',
      },
      {
        type: 'webhooks',
        label: 'Webhooks',
        icon: 'webhook',
        canCreate: true,
        canDelete: true,
        requiresInput: ['repo_name'],
        createFields: ['repo_name', 'url', 'events', 'secret'],
        createActionLabel: 'Create webhook',
        deleteActionLabel: 'Delete webhook',
        description: 'Create and delete repository webhooks.',
      },
      {
        type: 'secrets',
        label: 'Actions Secrets',
        icon: 'key-round',
        canCreate: true,
        canDelete: true,
        requiresInput: ['repo_name'],
        createFields: ['repo_name', 'secret_name', 'secret_value'],
        createActionLabel: 'Save secret',
        deleteActionLabel: 'Delete secret',
        description: 'List names of GitHub Actions secrets and create or update them.',
      },
      {
        type: 'repo-file',
        label: 'Repository File',
        icon: 'file-code-2',
        canCreate: false,
        canDelete: false,
        requiresInput: ['repo_name', 'path', 'ref'],
        description: 'Fetch file content from repository by path to view or copy.',
      },
      {
        type: 'repo-zip',
        label: 'Repository ZIP',
        icon: 'file-archive',
        canCreate: false,
        canDelete: false,
        requiresInput: ['repo_name', 'ref'],
        description: 'Generate source ZIP download URL for selected branch/ref.',
      },
    ]
  }

  private getCacheFromNode(node: Record<string, unknown>, cacheKey: string) {
    const subResources = (node.sub_resources ?? {}) as Record<string, Record<string, unknown>>
    const cached = subResources[cacheKey]
    if (!cached) return null
    return Object.values(cached)
  }

  private async loadCachedSubResources(uid: string, accountId: string, cacheKey: string) {
    const raw = await this.loadNode(uid, accountId)
    return this.getCacheFromNode(raw.node as unknown as Record<string, unknown>, cacheKey)
  }

  /** Fetches GitHub sub-resources using optional query params. */
  async fetchSubResources(type: string, accountId: string, uid: string, params: Record<string, string> = {}) {
    const { config, credentials } = await this.load(uid, accountId)
    const api = new GithubApi(credentials.token)
    const owner = String(config.owner)
    const shouldRefresh = params.refresh === '1' || params.refresh === 'true'

    const repoName = typeof params.repo_name === 'string' ? params.repo_name : ''
    const workflowId = params.workflow_id ? Number(params.workflow_id) : undefined
    const cacheKey =
      type === 'workflows' && repoName
        ? `${type}_${repoName}`
        : type === 'workflow-runs' && repoName
          ? `${type}_${repoName}_${workflowId ?? 'all'}`
          : type === 'workflow-logs' && repoName && params.run_id
            ? `${type}_${repoName}_${params.run_id}`
            : type === 'repo-file' && repoName && params.path
              ? `${type}_${repoName}_${params.path}_${params.ref ?? 'main'}`
              : type === 'repo-zip' && repoName
                ? `${type}_${repoName}_${params.ref ?? 'main'}`
            : (type === 'webhooks' || type === 'secrets') && repoName
              ? `${type}_${repoName}`
              : type

    if (!shouldRefresh) {
      const cached = await this.loadCachedSubResources(uid, accountId, cacheKey)
      if (cached) return cached
    }

    switch (type) {
      case 'orgs': {
        const orgs = await api.listOrgs()
        await this.saveSubResources(uid, accountId, type, orgs as unknown as Record<string, unknown>[])
        return orgs
      }
      case 'repos': {
        const repos = await api.listAllRepos()
        await this.saveSubResources(uid, accountId, type, repos as unknown as Record<string, unknown>[])
        return repos
      }
      case 'workflows': {
        if (!repoName) return []
        const workflows = await api.listWorkflows(owner, repoName)
        await this.saveSubResources(uid, accountId, cacheKey, workflows as unknown as Record<string, unknown>[])
        return workflows
      }
      case 'workflow-runs': {
        if (!repoName) return []
        const runs = await api.listWorkflowRuns(owner, repoName, workflowId)
        await this.saveSubResources(uid, accountId, cacheKey, runs as unknown as Record<string, unknown>[])
        return runs
      }
      case 'workflow-logs': {
        if (!repoName || !params.run_id) return []
        const logs = await api.getWorkflowRunLogs(owner, repoName, Number(params.run_id))
        await this.saveSubResources(uid, accountId, cacheKey, [logs as unknown as Record<string, unknown>])
        return [logs]
      }
      case 'webhooks': {
        if (!repoName) return []
        const hooks = await api.listHooks(owner, repoName)
        await this.saveSubResources(uid, accountId, cacheKey, hooks as unknown as Record<string, unknown>[])
        return hooks
      }
      case 'secrets': {
        if (!repoName) return []
        const secrets = await api.listRepoSecrets(owner, repoName)
        await this.saveSubResources(uid, accountId, cacheKey, secrets as unknown as Record<string, unknown>[])
        return secrets
      }
      case 'repo-file': {
        if (!repoName || !params.path) return []
        const ref = typeof params.ref === 'string' && params.ref.trim() ? params.ref : 'main'
        const file = await api.getRepoFile(owner, repoName, params.path, ref)
        await this.saveSubResources(uid, accountId, `${type}_${repoName}_${params.path}_${ref}`, [file as unknown as Record<string, unknown>])
        return [file]
      }
      case 'repo-zip': {
        if (!repoName) return []
        const ref = typeof params.ref === 'string' && params.ref.trim() ? params.ref : 'main'
        const zip = api.getRepoZipUrl(owner, repoName, ref)
        await this.saveSubResources(uid, accountId, `${type}_${repoName}_${ref}`, [zip as unknown as Record<string, unknown>])
        return [zip]
      }
      default:
        return []
    }
  }

  /** Creates GitHub webhooks, workflow dispatches, and repository secrets. */
  async createSubResource(type: string, accountId: string, uid: string, data: Record<string, unknown>) {
    const { config, credentials } = await this.load(uid, accountId)
    const api = new GithubApi(credentials.token)
    const owner = String(config.owner)

    if (type === 'workflows') {
      const missing = ['repo_name', 'workflow_id'].filter((field) => !data[field])
      if (missing.length > 0) return { missing_fields: missing, defaults: { ref: 'main' } }
      const ref = typeof data.ref === 'string' && data.ref.trim() ? data.ref : 'main'
      await api.triggerWorkflow(owner, String(data.repo_name), Number(data.workflow_id), ref)
      return {
        id: `${data.workflow_id}-${Date.now()}`,
        name: `Workflow ${data.workflow_id}`,
        status: 'queued',
        conclusion: null,
        html_url: `https://github.com/${owner}/${String(data.repo_name)}/actions`,
        run_number: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        workflow_id: Number(data.workflow_id),
        head_branch: ref,
        event: 'workflow_dispatch',
      }
    }

    if (type === 'webhooks') {
      const missing = ['repo_name', 'url', 'events'].filter((field) => !data[field])
      if (missing.length > 0) {
        return { missing_fields: missing, defaults: { contentType: 'json' } }
      }
      return api.createHook(owner, String(data.repo_name), {
        repo_name: String(data.repo_name),
        url: String(data.url),
        events: Array.isArray(data.events)
          ? data.events.map(String)
          : String(data.events).split(',').map((item) => item.trim()).filter(Boolean),
        secret: typeof data.secret === 'string' ? data.secret : undefined,
        contentType: data.contentType === 'form' ? 'form' : 'json',
      })
    }

    if (type === 'secrets') {
      const missing = ['repo_name', 'secret_name', 'secret_value'].filter((field) => !data[field])
      if (missing.length > 0) {
        return { missing_fields: missing, defaults: {} }
      }
      return api.saveRepoSecret(owner, String(data.repo_name), String(data.secret_name), String(data.secret_value))
    }

    return { missing_fields: ['type'], defaults: {} }
  }

  /** Deletes GitHub webhooks, workflow runs, and repository secrets. */
  async deleteSubResource(type: string, accountId: string, uid: string, id: string, data: Record<string, unknown> = {}): Promise<void> {
    const { config, credentials } = await this.load(uid, accountId)
    const api = new GithubApi(credentials.token)
    const owner = String(config.owner)
    const repoName = typeof data.repo_name === 'string' ? data.repo_name : ''

    if (type === 'webhooks' && repoName) {
      await api.deleteHook(owner, repoName, Number(id))
      return
    }

    if (type === 'workflow-runs' && repoName) {
      await api.cancelWorkflowRun(owner, repoName, Number(id))
      return
    }

    if (type === 'secrets' && repoName) {
      await api.deleteRepoSecret(owner, repoName, id)
    }
  }
}

ServiceRegistry.register(new GithubService())
