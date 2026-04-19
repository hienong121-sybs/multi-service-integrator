// Path: /src/app/dashboard/services/[type]/[id]/page.tsx
// Module: ServiceDetailPage
// Depends on: @/lib/auth/auth, @/services/_registry/serviceMeta, @/services/_registry, @/components/services/_shared/SubResourcePanel
// Description: Shows overview and sub-resources for a service account.

import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { getServiceMeta } from '@/services/_registry/serviceMeta'
import { ServiceRegistry } from '@/services/_registry'
import { SubResourcePanel } from '@/components/services/_shared/SubResourcePanel'
import { GithubActionsPanel } from '@/components/services/_shared/GithubActionsPanel'
import { CloudflareActionsPanel } from '@/components/services/_shared/CloudflareActionsPanel'
import { AzureActionsPanel } from '@/components/services/_shared/AzureActionsPanel'

export default async function ServiceDetailPage({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params
  const session = await auth()
  if (!session?.user?.uid) notFound()

  const meta = getServiceMeta(type)
  if (!meta) notFound()
  const resolvedMeta = meta

  const service = ServiceRegistry.get(type)
  const account = await service.load(session.user.uid, id).catch(() => null)
  if (!account) notFound()
  const resolvedAccount = account

  const subResourceTypes = service.getSubResourceTypes()
  const title = String(
    resolvedAccount.config.owner
      ?? resolvedAccount.config.display_name
      ?? resolvedAccount.config.account_email
      ?? id,
  )

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <p className="text-sm text-sky-400">{resolvedMeta.label}</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">{title}</h1>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {'account_email' in resolvedAccount.config ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Account email</p>
              <p className="mt-2 text-sm text-slate-200">{String(resolvedAccount.config.account_email ?? '-')}</p>
            </div>
          ) : null}
          {'html_url' in resolvedAccount.config ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Profile URL</p>
              <a href={String(resolvedAccount.config.html_url)} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm text-sky-400 hover:text-sky-300">{String(resolvedAccount.config.html_url)}</a>
            </div>
          ) : null}
        </div>
        <pre className="code-block mt-4">{JSON.stringify(resolvedAccount.config, null, 2)}</pre>
      </section>

      {type === 'github' ? (
        <section>
          <GithubActionsPanel serviceType={type} accountId={id} />
        </section>
      ) : type === 'cloudflare' ? (
        <section>
          <CloudflareActionsPanel serviceType={type} accountId={id} />
        </section>
      ) : type === 'azure' ? (
        <section>
          <AzureActionsPanel serviceType={type} accountId={id} />
        </section>
      ) : (
        <section className="grid gap-6 xl:grid-cols-2">
          {subResourceTypes.map((subType) => (
            <SubResourcePanel key={subType.type} serviceType={type} accountId={id} uid={session.user.uid} subResourceType={subType} />
          ))}
        </section>
      )}
    </div>
  )
}
