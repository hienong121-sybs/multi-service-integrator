// Path: /src/services/github/types.ts
// Module: GitHub Types
// Depends on: none
// Description: Shared types for the GitHub service.

export interface GithubCredential {
  token: string
  email?: string
  webhook_secret?: string
}

export interface GithubConfig {
  owner: string
  account_email?: string
  plan: 'free' | 'pro' | 'team' | 'enterprise'
  avatar_url: string
  public_repos: number
  private_repos: number
  html_url: string
  followers: number
  following: number
}

export interface GithubRepo {
  id: number
  name: string
  full_name: string
  private: boolean
  default_branch: string
  language: string | null
  stargazers_count: number
  updated_at: string
  html_url: string
  clone_url: string
  owner?: {
    login: string
  }
}

export interface GithubOrg {
  id: number
  login: string
  avatar_url: string
  url: string
  repos_url: string
  description?: string | null
}

export interface GithubWorkflow {
  id: number
  name: string
  path: string
  state: 'active' | 'disabled_manually' | 'disabled_fork'
  html_url: string
}

export interface GithubWorkflowRun {
  id: number
  name?: string
  status: string
  conclusion: string | null
  html_url: string
  run_number: number
  created_at: string
  updated_at: string
  workflow_id: number
  head_branch?: string
  event?: string
}

export interface GithubHook {
  id: number
  url: string
  config: {
    url: string
    content_type: string
    insecure_ssl: string
  }
  events: string[]
  active: boolean
  created_at: string
}

export interface GithubRepoSecret {
  name: string
  created_at?: string
  updated_at?: string
  visibility?: string
  selected_repositories_url?: string
}

export interface GithubWorkflowLog {
  run_id: number
  repo_name: string
  fetched_at: string
  log_files: Array<{
    name: string
    content: string
  }>
  preview: string
}

export interface GithubRepoFile {
  repo_name: string
  path: string
  ref: string
  encoding?: string
  size?: number
  content: string
}

export interface GithubRepoZip {
  repo_name: string
  ref: string
  download_url: string
}

export interface GithubUser {
  id: number
  login: string
  avatar_url: string
  html_url: string
  email?: string | null
  plan?: { name: string }
  public_repos: number
  total_private_repos?: number
  followers: number
  following: number
}

export interface CreateHookInput {
  repo_name: string
  url: string
  events: string[]
  secret?: string
  contentType?: 'json' | 'form'
}

export interface SaveRepoSecretInput {
  repo_name: string
  secret_name: string
  secret_value: string
}
