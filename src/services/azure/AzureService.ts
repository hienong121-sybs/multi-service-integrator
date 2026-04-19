// Path: /src/services/azure/AzureService.ts
// Module: AzureService
// Depends on: ../_base/BaseService, ./AzureApi, ../_registry/ServiceRegistry
// Description: Azure DevOps business logic implementation.

import { BaseService } from '../_base/BaseService'
import { AzureApi } from './AzureApi'
import { ServiceRegistry } from '../_registry/ServiceRegistry'
import type { SubResourceDef } from '@/types/service'
import type {
  AzureOrganization,
  AzureConfig,
  AzureCredential,
  AzurePipelineCreateInput,
  AzurePipeline,
  AzurePipelineRun,
  AzureProject,
  AzureRepo,
  AzureRepoFile,
  AzureRepoZip,
} from './types'

type AzureSubResource = AzureOrganization | AzureProject | AzureRepo | AzurePipeline | AzurePipelineRun | AzureRepoFile | AzureRepoZip

export class AzureService extends BaseService<AzureConfig, AzureCredential, AzureSubResource> {
  readonly SERVICE_TYPE = 'azure' as const
  readonly SERVICE_LABEL = 'Azure DevOps'
  readonly CREDENTIAL_FIELDS = ['pat']
  readonly ICON = 'cloud'
  readonly DESCRIPTION = 'Manage Azure DevOps projects, repos, pipelines, runs, and repository files'

  async validateCredentials(creds: AzureCredential, config?: Partial<AzureConfig>): Promise<boolean> {
    try {
      const org = String(config?.organization ?? '').trim()
      if (org) {
        await new AzureApi(org, creds.pat).listProjects()
      } else {
        await new AzureApi('dev.azure.com', creds.pat).getProfile()
      }
      return true
    } catch {
      return false
    }
  }

  async fetchMetadata(creds: AzureCredential, config?: Partial<AzureConfig>): Promise<Partial<AzureConfig>> {
    const organization = String(config?.organization ?? '').trim()
    const api = new AzureApi(organization || 'dev.azure.com', creds.pat)
    const profile = await api.getProfile().catch(() => ({}))
    let organizations: string[] = []
    if (profile.id) {
      const orgResult = await api.listOrganizations(profile.id).catch(() => ({ value: [] as AzureOrganization[] }))
      organizations = orgResult.value.map((org) => org.accountName).filter(Boolean)
    }
    const hinted = String(config?.org_hints ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
    const mergedOrganizations = Array.from(new Set([...organizations, ...hinted]))

    return {
      organization: organization || mergedOrganizations[0],
      organizations: mergedOrganizations,
      org_hints: config?.org_hints,
      default_project: config?.default_project,
      account_email: config?.account_email ?? profile.emailAddress,
      profile_name: profile.displayName,
    }
  }

  getSubResourceTypes(): SubResourceDef[] {
    return [
      { type: 'organizations', label: 'Organizations', icon: 'building-2', canCreate: false, canDelete: false },
      { type: 'projects', label: 'Projects', icon: 'folder-kanban', canCreate: false, canDelete: false },
      { type: 'repos', label: 'Repositories', icon: 'folder-git-2', canCreate: false, canDelete: false, requiresInput: ['project'] },
      { type: 'pipelines', label: 'Pipelines', icon: 'workflow', canCreate: true, canDelete: false, requiresInput: ['project'], createFields: ['project', 'name', 'repo_id', 'repo_name', 'yaml_path', 'branch'], createActionLabel: 'Create pipeline from YAML' },
      { type: 'pipeline-runs', label: 'Pipeline Runs', icon: 'activity', canCreate: true, canDelete: true, requiresInput: ['project', 'pipeline_id'], createFields: ['project', 'pipeline_id', 'branch'], createActionLabel: 'Run pipeline', deleteActionLabel: 'Stop run' },
      { type: 'repo-file', label: 'Repository File', icon: 'file-code-2', canCreate: false, canDelete: false, requiresInput: ['project', 'repo_id', 'path', 'branch'] },
      { type: 'repo-zip', label: 'Repository ZIP', icon: 'file-archive', canCreate: false, canDelete: false, requiresInput: ['project', 'repo_id', 'branch'] },
    ]
  }

  private async loadCachedSubResources(uid: string, accountId: string, cacheKey: string) {
    const raw = await this.loadNode(uid, accountId)
    const cached = raw.node.sub_resources?.[cacheKey]
    if (!cached) return null
    return Object.values(cached)
  }

  async fetchSubResources(type: string, accountId: string, uid: string, params: Record<string, string> = {}): Promise<AzureSubResource[]> {
    const { config, credentials } = await this.load(uid, accountId)
    const selectedOrg = String(params.organization ?? config.organization ?? '').trim()
    if (!selectedOrg && type !== 'organizations') return []
    const api = new AzureApi(selectedOrg || 'dev.azure.com', credentials.pat)
    const shouldRefresh = params.refresh === '1' || params.refresh === 'true'

    const cacheKey =
      type === 'repos' && params.project
        ? `${type}_${selectedOrg}_${params.project}`
        : type === 'pipelines' && params.project
          ? `${type}_${selectedOrg}_${params.project}`
          : type === 'pipeline-runs' && params.project && params.pipeline_id
            ? `${type}_${selectedOrg}_${params.project}_${params.pipeline_id}`
            : type === 'repo-file' && params.project && params.repo_id && params.path
              ? `${type}_${selectedOrg}_${params.project}_${params.repo_id}_${params.path}_${params.branch ?? 'main'}`
              : type === 'repo-zip' && params.project && params.repo_id
                ? `${type}_${selectedOrg}_${params.project}_${params.repo_id}_${params.branch ?? 'main'}`
                : type === 'projects'
                  ? `${type}_${selectedOrg}`
                  : type

    if (!shouldRefresh) {
      const cached = await this.loadCachedSubResources(uid, accountId, cacheKey)
      if (cached) return cached as AzureSubResource[]
    }

    switch (type) {
      case 'projects': {
        const projects = await api.listProjects()
        await this.saveSubResources(uid, accountId, cacheKey, projects.value as unknown as Record<string, unknown>[])
        return projects.value
      }
      case 'organizations': {
        const profile = await api.getProfile()
        if (!profile.id) return []
        const orgResult = await api.listOrganizations(profile.id)
        const orgs = orgResult.value
        await this.saveSubResources(uid, accountId, type, orgs as unknown as Record<string, unknown>[])
        return orgs
      }
      case 'repos': {
        if (!params.project) return []
        const repos = await api.listRepos(params.project)
        await this.saveSubResources(uid, accountId, cacheKey, repos as unknown as Record<string, unknown>[])
        return repos
      }
      case 'pipelines': {
        if (!params.project) return []
        const pipelines = await api.listPipelines(params.project)
        await this.saveSubResources(uid, accountId, cacheKey, pipelines as unknown as Record<string, unknown>[])
        return pipelines
      }
      case 'pipeline-runs': {
        if (!params.project || !params.pipeline_id) return []
        const runs = await api.listPipelineRuns(params.project, Number(params.pipeline_id))
        await this.saveSubResources(uid, accountId, cacheKey, runs as unknown as Record<string, unknown>[])
        return runs
      }
      case 'repo-file': {
        if (!params.project || !params.repo_id || !params.path) return []
        const file = await api.getRepoFile(params.project, params.repo_id, params.path, params.branch ?? 'main')
        await this.saveSubResources(uid, accountId, cacheKey, [file as unknown as Record<string, unknown>])
        return [file]
      }
      case 'repo-zip': {
        if (!params.project || !params.repo_id) return []
        const zip = api.getRepoZipUrl(params.project, params.repo_id, params.branch ?? 'main')
        await this.saveSubResources(uid, accountId, cacheKey, [zip as unknown as Record<string, unknown>])
        return [zip]
      }
      default:
        return []
    }
  }

  async createSubResource(type: string, accountId: string, uid: string, data: Record<string, unknown>) {
    const loaded = await this.load(uid, accountId)
    const { credentials, config } = loaded
    const organization = String(data.organization ?? config.organization ?? '').trim()
    if (!organization) return { missing_fields: ['organization'], defaults: {} }
    const api = new AzureApi(organization, credentials.pat)

    if (type === 'pipelines') {
      const missing = ['project', 'name', 'repo_id', 'repo_name', 'yaml_path'].filter((field) => !data[field])
      if (missing.length > 0) {
        return { missing_fields: missing, defaults: { branch: 'main' } }
      }
      return api.createPipelineFromYaml({
        project: String(data.project),
        name: String(data.name),
        repo_id: String(data.repo_id),
        repo_name: String(data.repo_name),
        yaml_path: String(data.yaml_path),
        branch: typeof data.branch === 'string' ? data.branch : 'main',
      } satisfies AzurePipelineCreateInput)
    }

    if (type === 'pipeline-runs') {
      const missing = ['project', 'pipeline_id'].filter((field) => !data[field])
      if (missing.length > 0) {
        return { missing_fields: missing, defaults: { branch: 'refs/heads/main' } }
      }
      const branch = typeof data.branch === 'string' && data.branch.trim() ? data.branch : 'refs/heads/main'
      return api.runPipeline(String(data.project), Number(data.pipeline_id), branch)
    }

    return { missing_fields: ['type'], defaults: {} }
  }

  async deleteSubResource(type: string, accountId: string, uid: string, id: string, data: Record<string, unknown> = {}): Promise<void> {
    const loaded = await this.load(uid, accountId)
    const api = new AzureApi(String(loaded.config.organization), loaded.credentials.pat)

    if (type === 'pipeline-runs') {
      const project = typeof data.project === 'string' ? data.project : ''
      const pipelineId = typeof data.pipeline_id === 'string' ? Number(data.pipeline_id) : Number(data.pipeline_id ?? 0)
      if (!project || !pipelineId) return
      await api.cancelPipelineRun(project, pipelineId, Number(id))
    }
  }
}

ServiceRegistry.register(new AzureService())
