// Path: /src/components/services/_shared/GithubActionsPanel.tsx
// Module: GithubActionsPanel
// Depends on: react
// Description: Optimized GitHub actions flow with cached org/repo/workflow data and manual refresh actions.

'use client'

import { useEffect, useMemo, useState } from 'react'

interface GithubActionsPanelProps {
  serviceType: string
  accountId: string
}

interface OptionItem {
  id?: number
  name?: string
  login?: string
  full_name?: string
}

interface WorkflowRun {
  id: number
  status?: string
  conclusion?: string | null
  html_url?: string
  created_at?: string
  name?: string
}

/** GitHub panel focused on combo-select and button actions with minimal API calls. */
export function GithubActionsPanel({ serviceType, accountId }: GithubActionsPanelProps) {
  const [orgs, setOrgs] = useState<OptionItem[]>([])
  const [repos, setRepos] = useState<OptionItem[]>([])
  const [workflows, setWorkflows] = useState<OptionItem[]>([])
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [secrets, setSecrets] = useState<Array<{ name: string }>>([])

  const [selectedRepo, setSelectedRepo] = useState('')
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('')
  const [selectedRunId, setSelectedRunId] = useState('')

  const [secretName, setSecretName] = useState('')
  const [secretValue, setSecretValue] = useState('')
  const [logsPreview, setLogsPreview] = useState('')
  const [filePath, setFilePath] = useState('/README.md')
  const [fileRef, setFileRef] = useState('main')
  const [fileContent, setFileContent] = useState('')
  const [zipUrl, setZipUrl] = useState('')
  const [message, setMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  async function fetchSubType(subType: string, query: Record<string, string> = {}, refresh = false) {
    const params = new URLSearchParams({
      ...query,
      ...(refresh ? { refresh: '1' } : {}),
    })
    const url = `/api/services/${serviceType}/${accountId}/sub/${subType}${params.toString() ? `?${params.toString()}` : ''}`
    const res = await fetch(url)
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      throw new Error(body?.error?.message ?? 'Load failed')
    }
    return (body?.data ?? []) as unknown[]
  }

  async function initialLoad() {
    setIsBusy(true)
    setMessage('')
    try {
      const [cachedOrgs, cachedRepos] = await Promise.all([
        fetchSubType('orgs'),
        fetchSubType('repos'),
      ])

      let finalOrgs = cachedOrgs
      let finalRepos = cachedRepos

      if (cachedOrgs.length === 0 || cachedRepos.length === 0) {
        const [freshOrgs, freshRepos] = await Promise.all([
          fetchSubType('orgs', {}, true),
          fetchSubType('repos', {}, true),
        ])
        finalOrgs = freshOrgs
        finalRepos = freshRepos
      }

      setOrgs(finalOrgs as OptionItem[])
      const nextRepos = (finalRepos as OptionItem[])
      setRepos(nextRepos)
      if (!selectedRepo && nextRepos[0]?.name) {
        setSelectedRepo(nextRepos[0].name)
      }
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể tải organization/repository'))
    } finally {
      setIsBusy(false)
    }
  }

  useEffect(() => {
    initialLoad()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceType, accountId])

  async function loadWorkflows(refresh = false) {
    if (!selectedRepo) return
    setIsBusy(true)
    setMessage('')
    try {
      const rows = await fetchSubType('workflows', { repo_name: selectedRepo }, refresh)
      const parsed = rows as OptionItem[]
      setWorkflows(parsed)
      if (parsed[0]?.id) {
        setSelectedWorkflowId(String(parsed[0].id))
      }
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể tải workflows'))
    } finally {
      setIsBusy(false)
    }
  }

  async function loadRuns(refresh = false) {
    if (!selectedRepo) return
    setIsBusy(true)
    setMessage('')
    try {
      const rows = await fetchSubType(
        'workflow-runs',
        {
          repo_name: selectedRepo,
          ...(selectedWorkflowId ? { workflow_id: selectedWorkflowId } : {}),
        },
        refresh,
      )
      const parsed = rows as WorkflowRun[]
      setRuns(parsed)
      if (parsed[0]?.id) {
        setSelectedRunId(String(parsed[0].id))
      }
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể tải workflow runs'))
    } finally {
      setIsBusy(false)
    }
  }

  async function runWorkflow() {
    if (!selectedRepo || !selectedWorkflowId) return
    setIsBusy(true)
    setMessage('')
    try {
      const res = await fetch(`/api/services/${serviceType}/${accountId}/sub/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { repo_name: selectedRepo, workflow_id: Number(selectedWorkflowId), ref: 'main' } }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error?.message ?? 'Run workflow failed')
      setMessage('Đã gửi lệnh chạy workflow.')
      await loadRuns(true)
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể chạy workflow'))
    } finally {
      setIsBusy(false)
    }
  }

  async function stopRun() {
    if (!selectedRepo || !selectedRunId) return
    setIsBusy(true)
    setMessage('')
    try {
      const qs = new URLSearchParams({ repo_name: selectedRepo })
      const res = await fetch(`/api/services/${serviceType}/${accountId}/sub/workflow-runs/${selectedRunId}?${qs.toString()}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error?.message ?? 'Stop run failed')
      }
      setMessage('Đã gửi lệnh stop workflow run.')
      await loadRuns(true)
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể stop run'))
    } finally {
      setIsBusy(false)
    }
  }

  async function viewLogs(refresh = false) {
    if (!selectedRepo || !selectedRunId) return
    setIsBusy(true)
    setMessage('')
    try {
      const rows = await fetchSubType('workflow-logs', { repo_name: selectedRepo, run_id: selectedRunId }, refresh)
      const first = (rows[0] ?? {}) as { preview?: string }
      setLogsPreview(first.preview ?? '')
      setMessage('Đã tải logs workflow run.')
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể lấy logs'))
    } finally {
      setIsBusy(false)
    }
  }

  async function loadSecrets(refresh = false) {
    if (!selectedRepo) return
    setIsBusy(true)
    setMessage('')
    try {
      const rows = await fetchSubType('secrets', { repo_name: selectedRepo }, refresh)
      setSecrets((rows as Array<{ name: string }>).map((item) => ({ name: item.name })))
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể tải secrets'))
    } finally {
      setIsBusy(false)
    }
  }

  async function saveSecret() {
    if (!selectedRepo || !secretName || !secretValue) return
    setIsBusy(true)
    setMessage('')
    try {
      const res = await fetch(`/api/services/${serviceType}/${accountId}/sub/secrets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { repo_name: selectedRepo, secret_name: secretName, secret_value: secretValue } }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error?.message ?? 'Save secret failed')
      setSecretValue('')
      setMessage('Đã lưu secret.')
      await loadSecrets(true)
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể lưu secret'))
    } finally {
      setIsBusy(false)
    }
  }

  async function loadRepoFile(refresh = false) {
    if (!selectedRepo || !filePath) return
    setIsBusy(true)
    setMessage('')
    try {
      const rows = await fetchSubType('repo-file', {
        repo_name: selectedRepo,
        path: filePath,
        ref: fileRef || 'main',
      }, refresh)
      const first = (rows[0] ?? {}) as { content?: string }
      setFileContent(first.content ?? '')
      setMessage('Đã tải nội dung file repository.')
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể tải nội dung file'))
    } finally {
      setIsBusy(false)
    }
  }

  async function loadRepoZip(refresh = false) {
    if (!selectedRepo) return
    setIsBusy(true)
    setMessage('')
    try {
      const rows = await fetchSubType('repo-zip', {
        repo_name: selectedRepo,
        ref: fileRef || 'main',
      }, refresh)
      const first = (rows[0] ?? {}) as { download_url?: string }
      setZipUrl(first.download_url ?? '')
      setMessage('Đã chuẩn bị link ZIP repository.')
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể lấy link ZIP'))
    } finally {
      setIsBusy(false)
    }
  }

  async function copyFileContent() {
    if (!fileContent) return
    try {
      await navigator.clipboard.writeText(fileContent)
      setMessage('Đã copy nội dung file.')
    } catch {
      setMessage('Trình duyệt không cho phép copy tự động.')
    }
  }

  const selectedRun = useMemo(
    () => runs.find((item) => String(item.id) === selectedRunId),
    [runs, selectedRunId],
  )

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">GitHub Actions Control</h3>
          <p className="mt-1 text-sm text-slate-400">Luồng tối ưu: chọn repo/workflow/run rồi bấm nút thao tác. Chỉ gọi API GitHub khi làm mới hoặc thực thi action.</p>
        </div>
        <button type="button" onClick={initialLoad} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" disabled={isBusy}>Làm mới org/repo</button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-2">
        <select className="msi-field text-sm" value="" disabled>
          <option>{orgs.length ? `${orgs.length} organization(s) đã cache` : 'Chưa có organization cache'}</option>
        </select>
        <select className="msi-field text-sm" value={selectedRepo} onChange={(e) => setSelectedRepo(e.target.value)}>
          <option value="">Chọn repository</option>
          {repos.map((repo) => (
            <option key={String(repo.id ?? repo.name)} value={String(repo.name ?? '')}>
              {String(repo.full_name ?? repo.name ?? repo.id)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-3">
        <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" onClick={() => loadWorkflows(false)} disabled={isBusy || !selectedRepo}>Load workflows (cache)</button>
        <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" onClick={() => loadWorkflows(true)} disabled={isBusy || !selectedRepo}>Làm mới workflows</button>
        <select className="msi-field text-sm" value={selectedWorkflowId} onChange={(e) => setSelectedWorkflowId(e.target.value)}>
          <option value="">Chọn workflow yml</option>
          {workflows.map((workflow) => (
            <option key={String(workflow.id)} value={String(workflow.id ?? '')}>
              {String(workflow.name ?? workflow.id)}
            </option>
          ))}
        </select>
        <button type="button" className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400" onClick={runWorkflow} disabled={isBusy || !selectedWorkflowId || !selectedRepo}>Run workflow</button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-3">
        <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" onClick={() => loadRuns(false)} disabled={isBusy || !selectedRepo}>Load runs (cache)</button>
        <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" onClick={() => loadRuns(true)} disabled={isBusy || !selectedRepo}>Làm mới runs</button>
        <select className="msi-field text-sm" value={selectedRunId} onChange={(e) => setSelectedRunId(e.target.value)}>
          <option value="">Chọn run</option>
          {runs.map((run) => (
            <option key={run.id} value={String(run.id)}>
              #{run.id} · {run.status ?? 'unknown'}
            </option>
          ))}
        </select>
        <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" onClick={stopRun} disabled={isBusy || !selectedRunId || !selectedRepo}>Stop run</button>
        <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" onClick={() => viewLogs(false)} disabled={isBusy || !selectedRunId || !selectedRepo}>Xem log (cache)</button>
        <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" onClick={() => viewLogs(true)} disabled={isBusy || !selectedRunId || !selectedRepo}>Làm mới log</button>
      </div>

      {selectedRun ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400">
          Run #{selectedRun.id} · status: {selectedRun.status ?? 'unknown'} · conclusion: {selectedRun.conclusion ?? '-'}
        </div>
      ) : null}

      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-3">
        <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" onClick={() => loadSecrets(false)} disabled={isBusy || !selectedRepo}>Load secrets (cache)</button>
        <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" onClick={() => loadSecrets(true)} disabled={isBusy || !selectedRepo}>Làm mới secrets</button>
        <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400">{secrets.length} secret name(s)</div>
        <input value={secretName} onChange={(e) => setSecretName(e.target.value)} className="msi-field text-sm" placeholder="Secret name" />
        <input value={secretValue} onChange={(e) => setSecretValue(e.target.value)} className="msi-field text-sm" placeholder="Secret value" />
        <button type="button" className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400" onClick={saveSecret} disabled={isBusy || !selectedRepo || !secretName || !secretValue}>Add / Update secret</button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-3">
        <input value={filePath} onChange={(e) => setFilePath(e.target.value)} className="msi-field text-sm" placeholder="File path (e.g. /README.md)" />
        <input value={fileRef} onChange={(e) => setFileRef(e.target.value)} className="msi-field text-sm" placeholder="Branch/ref (e.g. main)" />
        <div className="flex gap-2">
          <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" onClick={() => loadRepoFile(false)} disabled={isBusy || !selectedRepo || !filePath}>View file (cache)</button>
          <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" onClick={() => loadRepoFile(true)} disabled={isBusy || !selectedRepo || !filePath}>Refresh file</button>
        </div>
        <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" onClick={() => loadRepoZip(false)} disabled={isBusy || !selectedRepo}>Load ZIP (cache)</button>
        <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" onClick={() => loadRepoZip(true)} disabled={isBusy || !selectedRepo}>Refresh ZIP</button>
        <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" onClick={copyFileContent} disabled={!fileContent}>Copy content</button>
        {zipUrl ? (
          <a href={zipUrl} target="_blank" rel="noreferrer" className="md:col-span-3 inline-flex rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
            Download ZIP: {zipUrl}
          </a>
        ) : null}
      </div>

      {fileContent ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <p className="mb-2 text-sm text-slate-300">Repository file content</p>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs text-slate-400">{fileContent}</pre>
        </div>
      ) : null}

      {logsPreview ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <p className="mb-2 text-sm text-slate-300">Workflow logs preview</p>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs text-slate-400">{logsPreview}</pre>
        </div>
      ) : null}

      {message ? <p className="text-sm text-slate-400">{message}</p> : null}
    </div>
  )
}
