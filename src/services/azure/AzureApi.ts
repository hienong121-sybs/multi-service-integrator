// Path: /src/services/azure/AzureApi.ts
// Module: AzureApi
// Depends on: axios
// Description: Azure DevOps REST API adapter.

import axios, { AxiosError } from 'axios'
import type {
  AzurePipeline,
  AzurePipelineRun,
  AzureProject,
  AzureRepo,
  AzureRepoFile,
  AzureRepoZip,
} from './types'

const AZ_ERROR_MAP: Record<number, string> = {
  401: 'AZ-AUTH-001',
  403: 'AZ-AUTH-001',
  404: 'AZ-API-002',
  429: 'AZ-API-001',
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class AzureApi {
  private readonly baseUrl: string
  private readonly authHeader: string

  constructor(private readonly organization: string, pat: string) {
    this.baseUrl = `https://dev.azure.com/${organization}`
    this.authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`
  }

  /** Reads current profile display name for metadata. */
  async getProfile(): Promise<{ displayName?: string }> {
    return this.request<{ displayName?: string }>('https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.1-preview.3', true)
  }

  /** Lists projects in organization. */
  async listProjects(): Promise<AzureProject[]> {
    const response = await this.request<{ value: AzureProject[] }>(`/_apis/projects?api-version=7.1`)
    return response.value
  }

  /** Lists repositories in one project. */
  async listRepos(project: string): Promise<AzureRepo[]> {
    const response = await this.request<{ value: AzureRepo[] }>(`/${encodeURIComponent(project)}/_apis/git/repositories?api-version=7.1`)
    return response.value
  }

  /** Lists pipelines in one project. */
  async listPipelines(project: string): Promise<AzurePipeline[]> {
    const response = await this.request<{ value: AzurePipeline[] }>(`/${encodeURIComponent(project)}/_apis/pipelines?api-version=7.1`)
    return response.value
  }

  /** Runs one pipeline. */
  async runPipeline(project: string, pipelineId: number, branch = 'refs/heads/main'): Promise<AzurePipelineRun> {
    return this.request<AzurePipelineRun>(`/${encodeURIComponent(project)}/_apis/pipelines/${pipelineId}/runs?api-version=7.1`, false, {
      method: 'POST',
      body: { resources: { repositories: { self: { refName: branch } } } },
    })
  }

  /** Lists pipeline runs. */
  async listPipelineRuns(project: string, pipelineId: number): Promise<AzurePipelineRun[]> {
    const response = await this.request<{ value: AzurePipelineRun[] }>(`/${encodeURIComponent(project)}/_apis/pipelines/${pipelineId}/runs?api-version=7.1`)
    return response.value
  }

  /** Cancels a pipeline run. */
  async cancelPipelineRun(project: string, pipelineId: number, runId: number): Promise<void> {
    await this.request(`/${encodeURIComponent(project)}/_apis/pipelines/${pipelineId}/runs/${runId}?api-version=7.1`, false, {
      method: 'PATCH',
      body: { state: 'cancelling' },
    })
  }

  /** Reads repository file content. */
  async getRepoFile(project: string, repoId: string, path: string, branch = 'main'): Promise<AzureRepoFile> {
    const safePath = path.startsWith('/') ? path : `/${path}`
    const response = await this.request<string>(
      `/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repoId)}/items?path=${encodeURIComponent(safePath)}&includeContent=true&versionDescriptor.versionType=branch&versionDescriptor.version=${encodeURIComponent(branch)}&api-version=7.1`,
    )
    return {
      repo_id: repoId,
      path: safePath,
      branch,
      content: typeof response === 'string' ? response : JSON.stringify(response),
    }
  }

  /** Returns Azure repo ZIP download URL. */
  getRepoZipUrl(project: string, repoId: string, branch = 'main'): AzureRepoZip {
    return {
      repo_id: repoId,
      branch,
      download_url: `${this.baseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repoId)}/items?path=%2F&$format=zip&download=true&versionDescriptor.versionType=branch&versionDescriptor.version=${encodeURIComponent(branch)}&api-version=7.1`,
    }
  }

  /** Executes Azure API request with retries. */
  private async request<T>(path: string, absolute = false, options: { method?: string; body?: unknown; retries?: number } = {}): Promise<T> {
    const retries = options.retries ?? 3

    try {
      const response = await axios({
        url: absolute ? path : `${this.baseUrl}${path}`,
        method: options.method ?? 'GET',
        data: options.body,
        timeout: 30_000,
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
        },
      })
      return response.data as T
    } catch (error) {
      const axiosError = error as AxiosError
      const status = axiosError.response?.status ?? 500
      if (retries > 0 && (status === 429 || status >= 500)) {
        await sleep((4 - retries) * 500)
        return this.request<T>(path, absolute, { ...options, retries: retries - 1 })
      }
      throw {
        code: AZ_ERROR_MAP[status] ?? 'AZ-API-001',
        message: axiosError.message,
        statusCode: status,
      }
    }
  }
}
