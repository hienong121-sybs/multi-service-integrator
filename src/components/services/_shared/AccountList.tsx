// Path: /src/components/services/_shared/AccountList.tsx
// Module: AccountList
// Depends on: react, ./AccountCard, ./AddAccountModal, @/lib/hooks/useServiceAccounts, @/components/ui/SkeletonCard, @/components/ui/EmptyState
// Description: Generic service account list view.

'use client'

import { useMemo, useState } from 'react'
import { AccountCard } from './AccountCard'
import { AddAccountModal } from './AddAccountModal'
import { useServiceAccounts } from '@/lib/hooks/useServiceAccounts'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { EmptyState } from '@/components/ui/EmptyState'

/** Renders the generic account grid for a service type. */
export function AccountList({ serviceType }: { serviceType: string; uid: string }) {
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const { accounts, isLoading, deleteAccount, refetch } = useServiceAccounts(serviceType)

  const filtered = useMemo(
    () => accounts.filter((account) => account.name.toLowerCase().includes(search.toLowerCase())),
    [accounts, search],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Accounts</h2>
          <p className="mt-1 text-sm text-slate-400">Manage service accounts, sub-resources, and metadata hydration.</p>
        </div>
        <div className="flex gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search account name"
            className="msi-field w-64 py-2.5 text-sm"
          />
          <button type="button" onClick={() => setAddOpen(true)} className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-400">
            + Add account
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} lines={4} hasAvatar />)}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <EmptyState
          title="No accounts yet"
          description="Create your first account to start syncing service metadata and sub-resources."
          icon="box"
          action={{ label: 'Add account', onClick: () => setAddOpen(true) }}
        />
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => <AccountCard key={item.id} item={item} onDelete={deleteAccount} />)}
        </div>
      )}

      <AddAccountModal
        serviceType={serviceType}
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => {
          setAddOpen(false)
          refetch()
        }}
      />
    </div>
  )
}
