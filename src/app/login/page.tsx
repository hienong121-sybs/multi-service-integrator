// Path: /src/app/login/page.tsx
// Module: LoginPage
// Depends on: react, next-auth/react
// Description: Standardized login page under a real App Router folder.

'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'

/** Renders the login entry page for the dashboard. */
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <p className="text-sm text-sky-400">Multi-Service Integrator</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Đăng nhập</h1>
        <p className="mt-2 text-sm text-slate-400">Sử dụng provider đã bật trong môi trường triển khai.</p>

        <div className="mt-6 space-y-3">
          <button type="button" onClick={() => signIn('google', { callbackUrl: '/dashboard' })} className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-100">
            Đăng nhập với Google
          </button>

          <div className="rounded-xl border border-slate-800 p-4">
            <p className="mb-3 text-sm font-medium text-slate-200">Custom / Supabase credentials</p>
            <div className="space-y-3">
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="msi-field-dark" />
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" className="msi-field-dark" />
              <button type="button" onClick={() => signIn('custom', { email, password, callbackUrl: '/dashboard' })} className="w-full rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-400">
                Đăng nhập bằng credentials
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
