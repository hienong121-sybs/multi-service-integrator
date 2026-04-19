// Path: /src/services/azure/types.ts
// Module: Azure DevOps Types
// Depends on: none
// Description: Shared types for Azure DevOps service integration.

export interface AzureCredential {
  pat: string
}

export interface AzureConfig {
  organization: string
  default_project?: string
  account_email?: string
  profile_name?: string
}

export interface AzureProject {
  id: string
  name: string
  description?: string
  state?: string
  visibility?: string
}

export interface AzureRepo {
  id: string
  name: string
  defaultBranch?: string
  webUrl?: string
  project?: {
    id: string
    name: string
  }
}

export interface AzurePipeline {
  id: number
  name: string
  folder?: string
}

export interface AzurePipelineRun {
  id: number
  name?: string
  state?: string
  result?: string
  createdDate?: string
  finishedDate?: string
  url?: string
}

export interface AzureRepoFile {
  repo_id: string
  path: string
  branch: string
  content: string
}

export interface AzureRepoZip {
  repo_id: string
  branch: string
  download_url: string
}
