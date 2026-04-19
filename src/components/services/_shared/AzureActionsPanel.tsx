// Path: /src/components/services/_shared/AzureActionsPanel.tsx
// Module: AzureActionsPanel
// Depends on: react
// Description: Cache-first Azure DevOps control panel with repo/pipeline/file/zip actions.

'use client'

import { useEffect, useMemo, useState } from 'react'

type Project = { id: string; name: string }
type Repo = { id: string; name: string; defaultBranch?: string }
type Pipeline = { id: number; name: string }
type Run = { id: number; state?: string; result?: string }

interface AzureActionsPanelProps {
  serviceType: string
  accountId: string
}

/** Azure DevOps panel using select + action flow, with cache-first data loading. */
export function AzureActionsPanel({ serviceType, accountId }: AzureActionsPanelProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [repos, setRepos] = useState<Repo[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [runs, setRuns] = useState<Run[]>([])

  const [selectedProject, setSelectedProject] = useState('')
  const [selectedRepoId, setSelectedRepoId] = useState('')
  const [selectedPipelineId, setSelectedPipelineId] = useState('')
  const [selectedRunId, setSelectedRunId] = useState('')

  const [branch, setBranch] = useState('main')
  const [filePath, setFilePath] = useState('/README.md')
  const [fileContent, setFileContent] = useState('')
  const [zipUrl, setZipUrl] = useState('')
  const [message, setMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  async function fetchSubType(subType: string, query: Record<string, string> = {}, refresh = false) {
    const params = new URLSearchParams({ ...query, ...(refresh ? { refresh: '1' } : {}) })
    const url = `/api/services/${serviceType}/${accountId}/sub/${subType}${params.toString() ? `?${params.toString()}` : ''}`
    const res = await fetch(url)
    const body = await res.json().catch(() => null)
    if (!res.ok) throw new Error(body?.error?.message ?? 'Load failed')
    return (body?.data ?? []) as unknown[]
  }

  async function initialLoad() {
    setIsBusy(true)
    setMessage('')
    try {
      let projectRows = await fetchSubType('projects')
      if (projectRows.length === 0) {
        projectRows = await fetchSubType('projects', {}, true)
      }
      const parsed = projectRows as Project[]
      setProjects(parsed)
      if (!selectedProject && parsed[0]?.name) {
        setSelectedProject(parsed[0].name)
      }
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể tải projects'))
    } finally {
      setIsBusy(false)
    }
  }

  useEffect(() => {
    initialLoad()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceType, accountId])

  async function loadRepos(refresh = false) {
    if (!selectedProject) return
    setIsBusy(true)
    setMessage('')
    try {
      const rows = await fetchSubType('repos', { project: selectedProject }, refresh)
      const parsed = rows as Repo[]
      setRepos(parsed)
      if (parsed[0]?.id) setSelectedRepoId(parsed[0].id)
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể tải repos'))
    } finally {
      setIsBusy(false)
    }
  }

  async function loadPipelines(refresh = false) {
    if (!selectedProject) return
    setIsBusy(true)
    setMessage('')
    try {
      const rows = await fetchSubType('pipelines', { project: selectedProject }, refresh)
      const parsed = rows as Pipeline[]
      setPipelines(parsed)
      if (parsed[0]?.id) setSelectedPipelineId(String(parsed[0].id))
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể tải pipelines'))
    } finally {
      setIsBusy(false)
    }
  }

  async function loadRuns(refresh = false) {
    if (!selectedProject || !selectedPipelineId) return
    setIsBusy(true)
    setMessage('')
    try {
      const rows = await fetchSubType('pipeline-runs', { project: selectedProject, pipeline_id: selectedPipelineId }, refresh)
      const parsed = rows as Run[]
      setRuns(parsed)
      if (parsed[0]?.id) setSelectedRunId(String(parsed[0].id))
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể tải runs'))
    } finally {
      setIsBusy(false)
    }
  }

  async function runPipeline() {
    if (!selectedProject || !selectedPipelineId) return
    setIsBusy(true)
    setMessage('')
    try {
      const ref = branch.startsWith('refs/heads/') ? branch : `refs/heads/${branch}`
      const res = await fetch(`/api/services/${serviceType}/${accountId}/sub/pipeline-runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { project: selectedProject, pipeline_id: Number(selectedPipelineId), branch: ref } }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error?.message ?? 'Run pipeline failed')
      setMessage('Đã trigger pipeline.')
      await loadRuns(true)
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể run pipeline'))
    } finally {
      setIsBusy(false)
    }
  }

  async function stopRun() {
    if (!selectedProject || !selectedPipelineId || !selectedRunId) return
    setIsBusy(true)
    setMessage('')
    try {
      const qs = new URLSearchParams({ project: selectedProject, pipeline_id: selectedPipelineId })
      const res = await fetch(`/api/services/${serviceType}/${accountId}/sub/pipeline-runs/${selectedRunId}?${qs.toString()}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error?.message ?? 'Stop run failed')
      }
      setMessage('Đã gửi yêu cầu dừng pipeline run.')
      await loadRuns(true)
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể stop run'))
    } finally {
      setIsBusy(false)
    }
  }

  async function loadRepoFile(refresh = false) {
    if (!selectedProject || !selectedRepoId || !filePath) return
    setIsBusy(true)
    setMessage('')
    try {
      const rows = await fetchSubType('repo-file', { project: selectedProject, repo_id: selectedRepoId, path: filePath, branch }, refresh)
      const first = (rows[0] ?? {}) as { content?: string }
      setFileContent(first.content ?? '')
      setMessage('Đã tải nội dung file.')
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể tải file'))
    } finally {
      setIsBusy(false)
    }
  }

  async function loadRepoZip(refresh = false) {
    if (!selectedProject || !selectedRepoId) return
    setIsBusy(true)
    setMessage('')
    try {
      const rows = await fetchSubType('repo-zip', { project: selectedProject, repo_id: selectedRepoId, branch }, refresh)
      const first = (rows[0] ?? {}) as { download_url?: string }
      setZipUrl(first.download_url ?? '')
      setMessage('Đã chuẩn bị link ZIP.')
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

  const selectedRun = useMemo(() => runs.find((run) => String(run.id) === selectedRunId), [runs, selectedRunId])

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Azure DevOps Control</h3>
          <p className="mt-1 text-sm text-slate-400">Luồng tương tự GitHub: chọn project/repo/pipeline rồi bấm nút thao tác.</p>
        </div>
        <button type="button" onClick={initialLoad} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" disabled={isBusy}>Làm mới projects</button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-2">
        <select className="msi-field text-sm" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
          <option value="">Chọn project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.name}>{project.name}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button type="button" onClick={() => loadRepos(false)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" disabled={isBusy || !selectedProject}>Load repos (cache)</button>
          <button type="button" onClick={() => loadRepos(true)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" disabled={isBusy || !selectedProject}>Refresh repos</button>
        </div>
        <select className="msi-field text-sm" value={selectedRepoId} onChange={(e) => setSelectedRepoId(e.target.value)}>
          <option value="">Chọn repo</option>
          {repos.map((repo) => (
            <option key={repo.id} value={repo.id}>{repo.name}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-3">
        <button type="button" onClick={() => loadPipelines(false)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" disabled={isBusy || !selectedProject}>Load pipelines (cache)</button>
        <button type="button" onClick={() => loadPipelines(true)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" disabled={isBusy || !selectedProject}>Refresh pipelines</button>
        <select className="msi-field text-sm" value={selectedPipelineId} onChange={(e) => setSelectedPipelineId(e.target.value)}>
          <option value="">Chọn pipeline</option>
          {pipelines.map((pipeline) => (
            <option key={pipeline.id} value={String(pipeline.id)}>{pipeline.name}</option>
          ))}
        </select>
        <input className="msi-field text-sm" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="Branch (main)" />
        <button type="button" onClick={runPipeline} className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400" disabled={isBusy || !selectedPipelineId || !selectedProject}>Run pipeline</button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-3">
        <button type="button" onClick={() => loadRuns(false)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" disabled={isBusy || !selectedPipelineId || !selectedProject}>Load runs (cache)</button>
        <button type="button" onClick={() => loadRuns(true)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" disabled={isBusy || !selectedPipelineId || !selectedProject}>Refresh runs</button>
        <select className="msi-field text-sm" value={selectedRunId} onChange={(e) => setSelectedRunId(e.target.value)}>
          <option value="">Chọn run</option>
          {runs.map((run) => (
            <option key={run.id} value={String(run.id)}>#{run.id} · {run.state ?? 'unknown'} · {run.result ?? '-'}</option>
          ))}
        </select>
        <button type="button" onClick={stopRun} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" disabled={isBusy || !selectedRunId || !selectedPipelineId || !selectedProject}>Stop run</button>
      </div>

      {selectedRun ? <p className="text-xs text-slate-400">Run #{selectedRun.id} · state: {selectedRun.state ?? 'unknown'} · result: {selectedRun.result ?? '-'}</p> : null}

      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-3">
        <input className="msi-field text-sm" value={filePath} onChange={(e) => setFilePath(e.target.value)} placeholder="File path /README.md" />
        <button type="button" onClick={() => loadRepoFile(false)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" disabled={isBusy || !selectedRepoId || !selectedProject}>View file (cache)</button>
        <button type="button" onClick={() => loadRepoFile(true)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" disabled={isBusy || !selectedRepoId || !selectedProject}>Refresh file</button>
        <button type="button" onClick={() => loadRepoZip(false)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" disabled={isBusy || !selectedRepoId || !selectedProject}>Load ZIP (cache)</button>
        <button type="button" onClick={() => loadRepoZip(true)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" disabled={isBusy || !selectedRepoId || !selectedProject}>Refresh ZIP</button>
        <button type="button" onClick={copyFileContent} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" disabled={!fileContent}>Copy content</button>
        {zipUrl ? (
          <a href={zipUrl} target="_blank" rel="noreferrer" className="md:col-span-3 inline-flex rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Download ZIP: {zipUrl}</a>
        ) : null}
      </div>

      {fileContent ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <p className="mb-2 text-sm text-slate-300">File content</p>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs text-slate-400">{fileContent}</pre>
        </div>
      ) : null}

      {message ? <p className="text-sm text-slate-400">{message}</p> : null}
    </div>
  )
}
