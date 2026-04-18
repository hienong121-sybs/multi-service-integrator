// Path: /src/components/services/_shared/AddAccountModal.tsx
// Module: AddAccountModal
// Depends on: react, ./DynamicForm, @/services/_registry/serviceForms, ./index
// Description: Generic account creation modal.

'use client'

import { useMemo, useState } from 'react'
import { DynamicForm } from './DynamicForm'
import { getServiceFormFields } from '@/services/_registry/serviceForms'
import type { AddAccountModalProps } from './index'

function normalizeValue(name: string, value: string) {
  if (name === 'redirect_uris') return value.split('\n').map((item) => item.trim()).filter(Boolean)
  if (name === 'restrictions') return value.split(',').map((item) => item.trim()).filter(Boolean)
  return value
}

/** Renders a create-account modal for the chosen service type. */
export function AddAccountModal({ serviceType, isOpen, onClose, onSuccess }: AddAccountModalProps) {
  const fields = useMemo(() => getServiceFormFields(serviceType), [serviceType])
  const [values, setValues] = useState<Record<string, string>>({ credential_type: 'service_account' })
  const [name, setName] = useState('')
  const [step, setStep] = useState<'form' | 'loading' | 'error'>('form')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit() {
    setStep('loading')
    setErrorMsg('')

    const config: Record<string, unknown> = {}
    const credentials: Record<string, unknown> = {}

    for (const field of fields) {
      const value = values[field.name] ?? field.defaultValue ?? ''
      if (!value && !field.required) continue
      const normalized = normalizeValue(field.name, value)
      if (field.section === 'config') config[field.name] = normalized
      if (field.section === 'credentials') credentials[field.name] = normalized
    }

    const response = await fetch(`/api/services/${serviceType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, config, credentials }),
    })

    const body = await response.json().catch(() => null)
    if (!response.ok) {
      setStep('error')
      setErrorMsg(body?.error?.message ?? 'Failed to create account')
      return
    }

    onSuccess(body.data.id)
    setValues({ credential_type: 'service_account' })
    setName('')
    setStep('form')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Add {serviceType} account</h2>
            <p className="mt-1 text-sm text-slate-400">Provide the credentials required to validate and hydrate this service account.</p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-slate-400 hover:text-white">Close</button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Account name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="msi-field"
              placeholder="Primary production account"
            />
          </div>

          <DynamicForm fields={fields} values={values} onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))} />
        </div>

        {step === 'error' && <p className="mt-4 rounded-xl border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">{errorMsg}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
          <button type="button" disabled={step === 'loading' || !name} onClick={handleSubmit} className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400 disabled:opacity-70">
            {step === 'loading' ? 'Creating...' : 'Create account'}
          </button>
        </div>
      </div>
    </div>
  )
}
