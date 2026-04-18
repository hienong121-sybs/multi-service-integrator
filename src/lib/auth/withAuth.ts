// Path: /src/lib/auth/withAuth.ts
// Module: withAuth
// Depends on: ./auth
// Description: Wraps Route Handlers with a session and role guard.
// Fix: Next.js 15 makes params a Promise in both Page and Route Handler contexts.
//      withAuth resolves params before passing to the handler.

import { auth } from './auth'

export interface AuthContext {
  uid: string
  email: string
  role: 'owner' | 'admin' | 'viewer'
}

export interface WithAuthOptions {
  role?: 'owner' | 'admin'
}

export type AuthenticatedHandler = (
  req: Request,
  ctx: { params: Record<string, string>; user: AuthContext }
) => Promise<Response>

/**
 * Protects a route handler with session and optional role checks.
 *
 * Next.js 15 passes `params` as a Promise inside the second argument to Route Handlers.
 * This wrapper awaits the params regardless of whether they arrive as a Promise or plain
 * object so that downstream handlers always receive a resolved Record<string, string>.
 */
export function withAuth(handler: AuthenticatedHandler, options: WithAuthOptions = {}) {
  return async (
    req: Request,
    ctx: { params: Promise<Record<string, string>> },
  ) => {
    const session = await auth()
    if (!session?.user?.uid) {
      return Response.json(
        { error: { code: 'AUTH-JWT-001', message: 'Unauthorized' } },
        { status: 401 },
      )
    }

    const user: AuthContext = {
      uid: session.user.uid,
      email: session.user.email,
      role: session.user.role,
    }

    if (options.role === 'admin' && user.role !== 'admin' && user.role !== 'owner') {
      return Response.json(
        { error: { code: 'AUTH-ROLE-001', message: 'Forbidden' } },
        { status: 403 },
      )
    }

    if (options.role === 'owner' && user.role !== 'owner') {
      return Response.json(
        { error: { code: 'AUTH-ROLE-001', message: 'Forbidden' } },
        { status: 403 },
      )
    }

    const resolvedParams: Record<string, string> = await Promise.resolve(ctx?.params ?? {})

    return handler(req, { params: resolvedParams, user })
  }
}
