// Path: /src/components/services/_shared/SubResourcePanel.tsx
// Module: SubResourcePanel
// Depends on: react, @/lib/hooks/useSubResources, @/components/ui/EmptyState, ./index
// Description: Generic sub-resource list and creation panel.

'use client'

import { useMemo, useState } from 'react'
import { useSubResources } from '@/lib/hooks/useSubResources'
import { EmptyState } from '@/components/ui/EmptyState'
import type { SubResourcePanelProps } from './index'

/** Renders a generic sub-resource panel. */
export function SubResourcePanel({ serviceType, accountId, subResourceType }: SubResourcePanelProps) {
  const [queryValues, setQueryValues] = useState<Record<string, string>>({})
  const [createData, setCreateData] = useState<Record<string, string>>({})
  const params = useMemo(() => queryValues, [queryValues])
  const { resources, isLoading, createResource, deleteResource, refetch } = useSubResources(serviceType, accountId, subResourceType.type, params)
  const [message, setMessage] = useState<string>('')

  async function handleCreate() {
    let payload: Record<string, unknown> = { ...createData }
    if (createData.payload) {
      try {
        payload = { ...payload, ...JSON.parse(createData.payload) }
      } catch {
        payload = { ...payload }
      }
    }
    const result = await createResource(payload)
    if (result.missing_fields?.length) {
      setMessage(`Missing fields: ${result.missing_fields.join(', ')}`)
      return
    }
    setMessage('Resource action completed successfully.')
    setCreateData({})
    refetch()
  }

  const createFields = subResourceType.createFields ?? subResourceType.requiresInput ?? ['name']

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{subResourceType.label}</h3>
          <p className="mt-1 text-sm text-slate-400">{subResourceType.description ?? `${subResourceType.canCreate ? 'Create and manage' : 'View'} ${subResourceType.label.toLowerCase()} for this account.`}</p>
        </div>
        <button type="button" onClick={refetch} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Refresh</button>
      </div>

      {subResourceType.requiresInput?.length ? (
        <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:grid-cols-2">
          {subResourceType.requiresInput.map((field) => (
            <input
              key={field}
              value={queryValues[field] ?? ''}
              onChange={(e) => setQueryValues((current) => ({ ...current, [field]: e.target.value }))}
              className="msi-field text-sm"
              placeholder={`Enter ${field}`}
            />
          ))}
        </div>
      ) : null}

      {subResourceType.canCreate && (
        <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:grid-cols-2">
          {createFields.map((field) => (
            field.toLowerCase().includes('value') ? (
              <textarea
                key={field}
                value={createData[field] ?? ''}
                onChange={(e) => setCreateData((current) => ({ ...current, [field]: e.target.value }))}
                className="msi-field min-h-[110px] text-sm"
                placeholder={`Create field: ${field}`}
              />
            ) : (
              <input
                key={field}
                value={createData[field] ?? ''}
                onChange={(e) => setCreateData((current) => ({ ...current, [field]: e.target.value }))}
                className="msi-field text-sm"
                placeholder={`Create field: ${field}`}
              />
            )
          ))}
          <textarea
            value={createData.payload ?? ''}
            onChange={(e) => setCreateData((current) => ({ ...current, payload: e.target.value }))}
            className="msi-field min-h-[110px] text-sm sm:col-span-2"
            placeholder="Optional JSON helper payload for advanced inputs"
          />
          <div className="sm:col-span-2 flex justify-end">
            <button type="button" onClick={handleCreate} className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400">{subResourceType.createActionLabel ?? 'Create resource'}</button>
          </div>
        </div>
      )}

      {message && <p className="text-sm text-slate-400">{message}</p>}

      {isLoading && <p className="text-sm text-slate-500">Loading resources...</p>}

      {!isLoading && resources.length === 0 && (
        <EmptyState title="No resources found" description="Adjust the required inputs or create a new sub-resource if this type supports creation." icon={subResourceType.icon} />
      )}

      {!isLoading && resources.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <div className="overflow-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Resource</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900">
                {resources.map((resource, index) => {
                  const item = resource as Record<string, unknown>
                  const itemId = String(item.id ?? item.name ?? item.run_id ?? item.slug ?? index)
                  return (
                    <tr key={itemId}>
                      <td className="px-4 py-3 text-white">{String(item.name ?? item.full_name ?? item.slug ?? item.run_id ?? itemId)}</td>
                      <td className="px-4 py-3 text-slate-400"><pre className="whitespace-pre-wrap text-xs">{JSON.stringify(item, null, 2)}</pre></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {typeof item.html_url === 'string' ? (
                            <a href={String(item.html_url)} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800">Open</a>
                          ) : null}
                          {subResourceType.canDelete ? (
                            <button type="button" onClick={() => deleteResource(itemId, params)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800">{subResourceType.deleteActionLabel ?? 'Delete'}</button>
                          ) : (
                            <span className="text-xs text-slate-500">Read only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
