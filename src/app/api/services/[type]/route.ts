// Path: /src/app/api/services/[type]/route.ts
// Module: Service Collection Route
// Depends on: @/lib/auth/withAuth, @/services/_registry, zod, @/lib/utils/api, @/lib/cache/ApiCache
// Description: Lists and creates service accounts. List responses are cached in-memory (30s TTL)
//              với in-flight deduplication để tránh gọi RTDB nhiều lần cùng lúc.

import { z } from 'zod'
import { withAuth } from '@/lib/auth/withAuth'
import { ServiceRegistry } from '@/services/_registry'
import { fail, ok } from '@/lib/utils/api'
import { ApiCache } from '@/lib/cache/ApiCache'

const createSchema = z.object({
  name: z.string().min(1).max(100),
  config: z.record(z.string(), z.unknown()).default({}),
  credentials: z.record(z.string(), z.unknown()).default({}),
})

function toHttpStatus(error: unknown): number {
  const candidate = (error as { status?: unknown; statusCode?: unknown } | null)
  const status = Number(candidate?.statusCode ?? candidate?.status)
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500
}

function toErrorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code
  return typeof code === 'string' && code ? code : 'SERVICE-ERR-001'
}

function toErrorMessage(error: unknown): string {
  const message = (error as { message?: unknown } | null)?.message
  return typeof message === 'string' && message ? message : 'Service operation failed'
}

export const GET = withAuth(async (_req, { params, user }) => {
  if (!ServiceRegistry.has(params.type)) {
    return fail('SERVICE-404', 'Service not registered', 404)
  }
  const service = ServiceRegistry.get(params.type)
  const url = new URL(_req.url)
  const forceRefresh = url.searchParams.get('refresh') === '1'

  // Cache GET list 30 giây — tránh RTDB read mỗi navigation
  const cacheKey = ApiCache.serviceListKey(user.uid, params.type)
  const items = forceRefresh
    ? await service.list(user.uid)
    : await ApiCache.get(
        cacheKey,
        () => service.list(user.uid),
        30_000,
      )

  return ok(items, undefined, { total: items.length })
})

export const POST = withAuth(async (req, { params, user }) => {
  if (!ServiceRegistry.has(params.type)) {
    return fail('SERVICE-404', 'Service not registered', 404)
  }

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return fail('SERVICE-REQ-001', 'Invalid request payload', 400, parsed.error.flatten())
  }

  const service = ServiceRegistry.get(params.type)
  const credentials = { ...(parsed.data.credentials as Record<string, unknown>) }
  const config = parsed.data.config as Record<string, unknown>
  if (
    typeof config.credential_type === 'string'
    && typeof credentials.credential_type !== 'string'
  ) {
    credentials.credential_type = config.credential_type
  }

  try {
    const isValid = await service.validateCredentials(credentials, config)
    if (!isValid) {
      return fail('SERVICE-AUTH-001', 'Credential validation failed', 400)
    }

    const metadata = await service.fetchMetadata(credentials, config)
    const result = await service.save(user.uid, {
      name: parsed.data.name,
      config: { ...config, ...metadata },
      credentials,
    })

    // Invalidate cache sau khi tạo mới → GET tiếp theo sẽ fetch fresh
    ApiCache.invalidate(ApiCache.serviceListKey(user.uid, params.type))

    return ok({ ...result, message: 'Account created' }, { status: 201 })
  } catch (error) {
    return fail(
      toErrorCode(error),
      toErrorMessage(error),
      toHttpStatus(error),
    )
  }
})
