// Path: /src/services/github/GithubApi.ts
// Module: GithubApi
// Depends on: axios, libsodium-wrappers, jszip
// Description: GitHub REST API adapter with retries and error mapping.

import axios, { AxiosError } from 'axios'
import sodium from 'libsodium-wrappers'
import JSZip from 'jszip'
import type {
  CreateHookInput,
  GithubHook,
  GithubOrg,
  GithubRepo,
  GithubRepoFile,
  GithubRepoZip,
  GithubRepoSecret,
  GithubUser,
  GithubWorkflow,
  GithubWorkflowLog,
  GithubWorkflowRun,
} from './types'

const GITHUB_ERROR_MAP: Record<number, string> = {
  401: 'GH-AUTH-001',
  403: 'GH-API-001',
  404: 'GH-API-002',
  422: 'GH-HOOK-001',
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class GithubApi {
  private readonly baseUrl = 'https://api.github.com'
  private readonly timeout = 30_000

  constructor(private readonly token: string) {}

  /** Fetches the authenticated GitHub user. */
  async getUser(): Promise<GithubUser> {
    return this.request<GithubUser>('/user')
  }

  /** Lists repositories for the authenticated user. */
  async listRepos(page = 1, perPage = 100): Promise<GithubRepo[]> {
    return this.request<GithubRepo[]>(`/user/repos?per_page=${Math.min(perPage, 100)}&page=${page}&sort=updated`)
  }

  /** Lists organizations available to the authenticated user. */
  async listOrgs(): Promise<GithubOrg[]> {
    return this.request<GithubOrg[]>('/user/orgs?per_page=100')
  }

  /** Lists all repositories by paginating until the last page. */
  async listAllRepos(): Promise<GithubRepo[]> {
    const output: GithubRepo[] = []
    let page = 1
    while (true) {
      const chunk = await this.listRepos(page)
      output.push(...chunk)
      if (chunk.length < 100) break
      page += 1
    }
    return output
  }

  /** Lists workflows for a repository. */
  async listWorkflows(owner: string, repo: string): Promise<GithubWorkflow[]> {
    const result = await this.request<{ workflows: GithubWorkflow[] }>(`/repos/${owner}/${repo}/actions/workflows`)
    return result.workflows
  }

  /** Downloads repository file content by path/ref. */
  async getRepoFile(owner: string, repo: string, path: string, ref = 'main'): Promise<GithubRepoFile> {
    const safePath = path.replace(/^\/+/, '')
    const result = await this.request<{ content?: string; encoding?: string; size?: number }>(
      `/repos/${owner}/${repo}/contents/${safePath}?ref=${encodeURIComponent(ref)}`,
    )

    let content = ''
    if (result.encoding === 'base64' && typeof result.content === 'string') {
      content = Buffer.from(result.content.replace(/\n/g, ''), 'base64').toString('utf8')
    } else if (typeof result.content === 'string') {
      content = result.content
    }

    return {
      repo_name: repo,
      path: `/${safePath}`,
      ref,
      encoding: result.encoding,
      size: result.size,
      content,
    }
  }

  /** Returns direct zip download URL for repository source by ref. */
  getRepoZipUrl(owner: string, repo: string, ref = 'main'): GithubRepoZip {
    return {
      repo_name: repo,
      ref,
      download_url: `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${encodeURIComponent(ref)}`,
    }
  }

  /** Triggers a workflow dispatch. */
  async triggerWorkflow(owner: string, repo: string, workflowId: number, ref = 'main'): Promise<void> {
    await this.request(`/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`, {
      method: 'POST',
      body: { ref },
    })
  }

  /** Lists workflow runs for a workflow or repository. */
  async listWorkflowRuns(owner: string, repo: string, workflowId?: number): Promise<GithubWorkflowRun[]> {
    const path = workflowId
      ? `/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs?per_page=30`
      : `/repos/${owner}/${repo}/actions/runs?per_page=30`
    const result = await this.request<{ workflow_runs: GithubWorkflowRun[] }>(path)
    return result.workflow_runs
  }

  /** Cancels an in-progress workflow run. */
  async cancelWorkflowRun(owner: string, repo: string, runId: number): Promise<void> {
    await this.request(`/repos/${owner}/${repo}/actions/runs/${runId}/cancel`, { method: 'POST' })
  }

  /** Downloads and unpacks workflow run logs for inline viewing. */
  async getWorkflowRunLogs(owner: string, repo: string, runId: number): Promise<GithubWorkflowLog> {
    const response = await axios({
      url: `${this.baseUrl}/repos/${owner}/${repo}/actions/runs/${runId}/logs`,
      method: 'GET',
      timeout: this.timeout,
      responseType: 'arraybuffer',
      maxRedirects: 5,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
      },
      validateStatus: (status) => status >= 200 && status < 400,
    })

    const buffer = Buffer.from(response.data)
    const logFiles: Array<{ name: string; content: string }> = []

    try {
      const zip = await JSZip.loadAsync(buffer)
      const names = Object.keys(zip.files).filter((name) => !zip.files[name].dir).slice(0, 20)
      for (const name of names) {
        const content = await zip.files[name].async('string')
        logFiles.push({ name, content: content.slice(0, 20000) })
      }
    } catch {
      logFiles.push({ name: `run-${runId}.log`, content: buffer.toString('utf8').slice(0, 20000) })
    }

    const preview = logFiles.map((item) => `# ${item.name}\n${item.content}`).join('\n\n').slice(0, 50000)
    return {
      run_id: runId,
      repo_name: repo,
      fetched_at: new Date().toISOString(),
      log_files: logFiles,
      preview,
    }
  }

  /** Lists webhook subscriptions for a repository. */
  async listHooks(owner: string, repo: string): Promise<GithubHook[]> {
    return this.request<GithubHook[]>(`/repos/${owner}/${repo}/hooks`)
  }

  /** Creates a webhook for a repository. */
  async createHook(owner: string, repo: string, input: CreateHookInput): Promise<GithubHook> {
    return this.request<GithubHook>(`/repos/${owner}/${repo}/hooks`, {
      method: 'POST',
      body: {
        name: 'web',
        active: true,
        events: input.events,
        config: {
          url: input.url,
          content_type: input.contentType ?? 'json',
          secret: input.secret,
        },
      },
    })
  }

  /** Deletes a webhook from a repository. */
  async deleteHook(owner: string, repo: string, hookId: number): Promise<void> {
    await this.request(`/repos/${owner}/${repo}/hooks/${hookId}`, { method: 'DELETE' })
  }

  /** Lists repository action secrets. Secret values are never returned by GitHub. */
  async listRepoSecrets(owner: string, repo: string): Promise<GithubRepoSecret[]> {
    const result = await this.request<{ total_count: number; secrets: GithubRepoSecret[] }>(`/repos/${owner}/${repo}/actions/secrets`)
    return result.secrets
  }

  /** Creates or updates a repository action secret. */
  async saveRepoSecret(owner: string, repo: string, secretName: string, secretValue: string): Promise<GithubRepoSecret> {
    const publicKey = await this.request<{ key_id: string; key: string }>(`/repos/${owner}/${repo}/actions/secrets/public-key`)
    await sodium.ready
    const messageBytes = sodium.from_string(secretValue)
    const publicKeyBytes = sodium.from_base64(publicKey.key, sodium.base64_variants.ORIGINAL)
    const encryptedBytes = sodium.crypto_box_seal(messageBytes, publicKeyBytes)
    const encryptedValue = sodium.to_base64(encryptedBytes, sodium.base64_variants.ORIGINAL)

    await this.request(`/repos/${owner}/${repo}/actions/secrets/${encodeURIComponent(secretName)}`, {
      method: 'PUT',
      body: {
        encrypted_value: encryptedValue,
        key_id: publicKey.key_id,
      },
    })

    return {
      name: secretName,
      visibility: 'private',
      updated_at: new Date().toISOString(),
    }
  }

  /** Deletes a repository action secret. */
  async deleteRepoSecret(owner: string, repo: string, secretName: string): Promise<void> {
    await this.request(`/repos/${owner}/${repo}/actions/secrets/${encodeURIComponent(secretName)}`, { method: 'DELETE' })
  }

  /** Executes a GitHub API request with retry and error mapping. */
  private async request<T>(path: string, options: { method?: string; body?: unknown; retries?: number } = {}): Promise<T> {
    const retries = options.retries ?? 3

    try {
      const response = await axios({
        url: `${this.baseUrl}${path}`,
        method: options.method ?? 'GET',
        data: options.body,
        timeout: this.timeout,
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
      })
      return response.data as T
    } catch (error) {
      const axiosError = error as AxiosError
      const status = axiosError.response?.status ?? 500
      const code = GITHUB_ERROR_MAP[status] ?? 'GH-API-001'

      if (retries > 0 && (status === 429 || status >= 500)) {
        const retryAfter = Number(axiosError.response?.headers?.['retry-after'] ?? 0)
        await sleep(retryAfter > 0 ? retryAfter * 1000 : (4 - retries) * 500)
        return this.request<T>(path, { ...options, retries: retries - 1 })
      }

      throw {
        code,
        message: axiosError.message,
        statusCode: status,
      }
    }
  }
}
