// Path: /src/services/azure/AzureSchema.ts
// Module: Azure DevOps Schemas
// Depends on: zod
// Description: Validation schemas for Azure credential/config payloads.

import { z } from 'zod'

export const azureCredentialSchema = z.object({
  pat: z.string().min(1),
})

export const azureConfigSchema = z.object({
  organization: z.string().min(1),
  default_project: z.string().optional(),
  account_email: z.string().email().optional(),
})
