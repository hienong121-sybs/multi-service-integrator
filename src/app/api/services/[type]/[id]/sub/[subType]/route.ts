// Path: /src/app/api/services/[type]/[id]/sub/[subType]/route.ts
// Module: Service Sub-Resource Collection Route
// Depends on: @/lib/auth/withAuth, @/services/_registry, @/lib/utils/api
// Description: Lists and creates service sub-resources.

import { withAuth } from '@/lib/auth/withAuth'
import { ServiceRegistry } from '@/services/_registry'
import { fail, ok } from '@/lib/utils/api'

function toHttpStatus(error: unknown): number {
  const candidate = (error as { status?: unknown; statusCode?: unknown } | null)
  const status = Number(candidate?.statusCode ?? candidate?.status)
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500
}

function toErrorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code
  return typeof code === 'string' && code ? code : 'SERVICE-SUB-001'
}

function toErrorMessage(error: unknown): string {
  const message = (error as { message?: unknown } | null)?.message
  return typeof message === 'string' && message ? message : 'Sub-resource operation failed'
}

export const GET = withAuth(async (req, { params, user }) => {
  if (!ServiceRegistry.has(params.type)) return fail('SERVICE-404', 'Service not registered', 404)
  const service = ServiceRegistry.get(params.type)
  const url = new URL(req.url)
  const query = Object.fromEntries(url.searchParams.entries())
  try {
    const resources = await service.fetchSubResources(params.subType, params.id, user.uid, query)
    return ok(resources)
  } catch (error) {
    return fail(toErrorCode(error), toErrorMessage(error), toHttpStatus(error))
  }
})

export const POST = withAuth(async (req, { params, user }) => {
  if (!ServiceRegistry.has(params.type)) return fail('SERVICE-404', 'Service not registered', 404)
  const service = ServiceRegistry.get(params.type)
  const body = await req.json().catch(() => null)
  const payload = body?.data ?? {}
  try {
    const result = await service.createSubResource(params.subType, params.id, user.uid, payload)

    if ('missing_fields' in result && result.missing_fields?.length) {
      return ok(result)
    }

    return ok({ resource: result }, { status: 201 })
  } catch (error) {
    return fail(toErrorCode(error), toErrorMessage(error), toHttpStatus(error))
  }
})
