// Path: /src/lib/auth/auth.ts
// Module: AuthConfig
// Depends on: next-auth, ./providers/google, ./providers/supabase, ./providers/custom
// Description: Central NextAuth configuration used by dashboard pages and API handlers.

import NextAuth from 'next-auth'
import { createGoogleProvider } from './providers/google'
import { createSupabaseProvider } from './providers/supabase'
import { createCustomProvider } from './providers/custom'
import { upsertUserToRTDB } from './AuthAdapter'

function getProviders() {
  const enabled = (process.env.AUTH_PROVIDERS ?? 'custom').split(',').map((item) => item.trim()).filter(Boolean)
  const providers = [] as any[]

  if (enabled.includes('google')) {
    const google = createGoogleProvider()
    if (google) providers.push(google)
  }
  if (enabled.includes('supabase')) providers.push(createSupabaseProvider())
  if (enabled.includes('custom')) providers.push(createCustomProvider())

  if (providers.length === 0) providers.push(createCustomProvider())
  return providers
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: getProviders(),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        const provider = account?.provider
        const authProvider: 'google' | 'supabase' | 'custom' =
          provider === 'google' || provider === 'supabase' || provider === 'custom'
            ? provider
            : 'custom'

        token.uid = user.id ?? token.sub ?? ''
        token.email = user.email ?? token.email
        token.name = user.name ?? token.name
        token.role = 'owner'
        token.authProvider = authProvider

        if (token.uid && token.email) {
          try {
            await upsertUserToRTDB({
              uid: String(token.uid),
              email: String(token.email),
              displayName: token.name ? String(token.name) : undefined,
              authProvider: String(token.authProvider ?? 'custom'),
            })
          } catch (error) {
            console.warn('AuthAdapter upsert skipped:', error)
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        uid: String(token.uid ?? token.sub ?? ''),
        email: String(token.email ?? session.user?.email ?? ''),
        displayName: token.name ? String(token.name) : undefined,
        role: (token.role as 'owner' | 'admin' | 'viewer' | undefined) ?? 'owner',
        authProvider: (token.authProvider as 'google' | 'supabase' | 'custom' | undefined) ?? 'custom',
      }
      return session
    },
  },
})
