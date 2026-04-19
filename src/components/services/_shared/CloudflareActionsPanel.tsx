// Path: /src/components/services/_shared/CloudflareActionsPanel.tsx
// Module: CloudflareActionsPanel
// Depends on: react
// Description: Cache-first Cloudflare operations panel for tunnels, DNS, and domains.

'use client'

import { useEffect, useMemo, useState } from 'react'

type ZoneItem = {
  id: string
  name: string
  name_servers?: string[]
}

type TunnelItem = {
  id: string
  name: string
  status?: string
}

type ConnectorItem = {
  id?: string
  client_id?: string
  colo_name?: string
  opened_at?: string
}

type DnsRecord = {
  id: string
  type: string
  name: string
  content: string
  ttl: number
}

interface CloudflareActionsPanelProps {
  serviceType: string
  accountId: string
}

/** Cloudflare control panel with mostly select + click interactions. */
export function CloudflareActionsPanel({ serviceType, accountId }: CloudflareActionsPanelProps) {
  const [zones, setZones] = useState<ZoneItem[]>([])
  const [tunnels, setTunnels] = useState<TunnelItem[]>([])
  const [connectors, setConnectors] = useState<ConnectorItem[]>([])
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([])

  const [selectedZoneId, setSelectedZoneId] = useState('')
  const [selectedTunnelId, setSelectedTunnelId] = useState('')
  const [selectedConnectorId, setSelectedConnectorId] = useState('')
  const [selectedDnsRecordId, setSelectedDnsRecordId] = useState('')

  const [domainName, setDomainName] = useState('')
  const [tunnelName, setTunnelName] = useState('')
  const [dnsType, setDnsType] = useState('CNAME')
  const [dnsName, setDnsName] = useState('')
  const [dnsContent, setDnsContent] = useState('')
  const [dnsTtl, setDnsTtl] = useState('1')
  const [dnsProxied, setDnsProxied] = useState(true)

  const [tunnelToken, setTunnelToken] = useState('')
  const [message, setMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  async function fetchSubType(subType: string, query: Record<string, string> = {}, refresh = false) {
    const params = new URLSearchParams({ ...query, ...(refresh ? { refresh: '1' } : {}) })
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
      const [cachedZones, cachedTunnels] = await Promise.all([fetchSubType('zones'), fetchSubType('tunnels')])

      let finalZones = cachedZones
      let finalTunnels = cachedTunnels
      if (cachedZones.length === 0 || cachedTunnels.length === 0) {
        const [freshZones, freshTunnels] = await Promise.all([
          fetchSubType('zones', {}, true),
          fetchSubType('tunnels', {}, true),
        ])
        finalZones = freshZones
        finalTunnels = freshTunnels
      }

      const zoneRows = finalZones as ZoneItem[]
      const tunnelRows = finalTunnels as TunnelItem[]
      setZones(zoneRows)
      setTunnels(tunnelRows)

      if (!selectedZoneId && zoneRows[0]?.id) setSelectedZoneId(zoneRows[0].id)
      if (!selectedTunnelId && tunnelRows[0]?.id) setSelectedTunnelId(tunnelRows[0].id)
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể tải zones/tunnels'))
    } finally {
      setIsBusy(false)
    }
  }

  useEffect(() => {
    initialLoad()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceType, accountId])

  async function loadDnsRecords(refresh = false) {
    if (!selectedZoneId) return
    setIsBusy(true)
    setMessage('')
    try {
      const rows = await fetchSubType('dns_records', { zone_id: selectedZoneId }, refresh)
      const parsed = rows as DnsRecord[]
      setDnsRecords(parsed)
      if (parsed[0]?.id) {
        setSelectedDnsRecordId(parsed[0].id)
      }
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể tải DNS records'))
    } finally {
      setIsBusy(false)
    }
  }

  async function createDomain() {
    if (!domainName) return
    setIsBusy(true)
    setMessage('')
    try {
      const res = await fetch(`/api/services/${serviceType}/${accountId}/sub/zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { name: domainName, type: 'full' } }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error?.message ?? 'Tạo domain thất bại')
      setMessage('Đã thêm domain vào Cloudflare.')
      setDomainName('')
      await initialLoad()
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể tạo domain'))
    } finally {
      setIsBusy(false)
    }
  }

  async function deleteDomain() {
    if (!selectedZoneId) return
    setIsBusy(true)
    setMessage('')
    try {
      const res = await fetch(`/api/services/${serviceType}/${accountId}/sub/zones/${selectedZoneId}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error?.message ?? 'Xóa domain thất bại')
      }
      setMessage('Đã xóa domain.')
      setSelectedZoneId('')
      await initialLoad()
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể xóa domain'))
    } finally {
      setIsBusy(false)
    }
  }

  async function createTunnel() {
    if (!tunnelName) return
    setIsBusy(true)
    setMessage('')
    try {
      const res = await fetch(`/api/services/${serviceType}/${accountId}/sub/tunnels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { name: tunnelName } }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error?.message ?? 'Tạo tunnel thất bại')
      setMessage('Đã tạo tunnel cloudflared.')
      setTunnelName('')
      await initialLoad()
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể tạo tunnel'))
    } finally {
      setIsBusy(false)
    }
  }

  async function deleteTunnel() {
    if (!selectedTunnelId) return
    setIsBusy(true)
    setMessage('')
    try {
      const res = await fetch(`/api/services/${serviceType}/${accountId}/sub/tunnels/${selectedTunnelId}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error?.message ?? 'Xóa tunnel thất bại')
      }
      setMessage('Đã xóa tunnel.')
      setSelectedTunnelId('')
      await initialLoad()
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể xóa tunnel'))
    } finally {
      setIsBusy(false)
    }
  }

  async function loadTunnelToken(refresh = false) {
    if (!selectedTunnelId) return
    setIsBusy(true)
    setMessage('')
    try {
      const rows = await fetchSubType('tunnel_token', { tunnel_id: selectedTunnelId }, refresh)
      const first = (rows[0] ?? {}) as { token?: string }
      setTunnelToken(first.token ?? '')
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể lấy tunnel token'))
    } finally {
      setIsBusy(false)
    }
  }

  async function loadConnectors(refresh = false) {
    if (!selectedTunnelId) return
    setIsBusy(true)
    setMessage('')
    try {
      const rows = await fetchSubType('tunnel_connectors', { tunnel_id: selectedTunnelId }, refresh)
      const parsed = rows as ConnectorItem[]
      setConnectors(parsed)
      if (parsed[0]?.client_id || parsed[0]?.id) {
        setSelectedConnectorId(String(parsed[0].client_id ?? parsed[0].id ?? ''))
      }
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể tải connectors'))
    } finally {
      setIsBusy(false)
    }
  }

  async function disconnectConnector() {
    if (!selectedTunnelId) return
    setIsBusy(true)
    setMessage('')
    try {
      const query = new URLSearchParams({ tunnel_id: selectedTunnelId })
      const connectorId = selectedConnectorId.trim()
      if (connectorId) query.set('client_id', connectorId)
      const targetId = connectorId || 'all'
      const res = await fetch(`/api/services/${serviceType}/${accountId}/sub/tunnel_connectors/${targetId}?${query.toString()}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error?.message ?? 'Disconnect connector thất bại')
      }
      setMessage(connectorId ? 'Đã disconnect connector.' : 'Đã disconnect tất cả connectors.')
      await loadConnectors(true)
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể disconnect connector'))
    } finally {
      setIsBusy(false)
    }
  }

  async function saveDnsRecord() {
    if (!selectedZoneId || !dnsType || !dnsName || !dnsContent) return
    setIsBusy(true)
    setMessage('')
    try {
      const payload: Record<string, unknown> = {
        zone_id: selectedZoneId,
        type: dnsType,
        name: dnsName,
        content: dnsContent,
        ttl: Number(dnsTtl || '1'),
        proxied: dnsProxied,
      }
      if (selectedDnsRecordId) {
        payload.record_id = selectedDnsRecordId
      }

      const res = await fetch(`/api/services/${serviceType}/${accountId}/sub/dns_records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error?.message ?? 'Lưu DNS record thất bại')
      setMessage(selectedDnsRecordId ? 'Đã cập nhật DNS record.' : 'Đã tạo DNS record.')
      await loadDnsRecords(true)
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể lưu DNS record'))
    } finally {
      setIsBusy(false)
    }
  }

  async function deleteDnsRecord() {
    if (!selectedZoneId || !selectedDnsRecordId) return
    setIsBusy(true)
    setMessage('')
    try {
      const query = new URLSearchParams({ zone_id: selectedZoneId })
      const res = await fetch(`/api/services/${serviceType}/${accountId}/sub/dns_records/${selectedDnsRecordId}?${query.toString()}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error?.message ?? 'Xóa DNS record thất bại')
      }
      setMessage('Đã xóa DNS record.')
      setSelectedDnsRecordId('')
      await loadDnsRecords(true)
    } catch (error) {
      setMessage(String((error as Error).message ?? 'Không thể xóa DNS record'))
    } finally {
      setIsBusy(false)
    }
  }

  const selectedZone = useMemo(() => zones.find((zone) => zone.id === selectedZoneId), [zones, selectedZoneId])

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Cloudflare Control</h3>
          <p className="mt-1 text-sm text-slate-400">Luồng cache-first: ưu tiên dữ liệu đã lưu, chỉ gọi Cloudflare API khi làm mới hoặc thao tác.</p>
        </div>
        <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" onClick={initialLoad} disabled={isBusy}>Làm mới zones/tunnels</button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-3">
        <input className="msi-field text-sm" value={domainName} onChange={(e) => setDomainName(e.target.value)} placeholder="Add domain (example.com)" />
        <button type="button" className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400" onClick={createDomain} disabled={isBusy || !domainName}>Add domain</button>
        <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" onClick={deleteDomain} disabled={isBusy || !selectedZoneId}>Delete domain</button>
        <select className="msi-field text-sm md:col-span-2" value={selectedZoneId} onChange={(e) => setSelectedZoneId(e.target.value)}>
          <option value="">Chọn zone/domain</option>
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>{zone.name}</option>
          ))}
        </select>
        <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400">{selectedZone?.name_servers?.join(', ') || 'Nameserver sẽ hiện ở đây'}</div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-3">
        <input className="msi-field text-sm" value={tunnelName} onChange={(e) => setTunnelName(e.target.value)} placeholder="Tunnel name" />
        <button type="button" className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400" onClick={createTunnel} disabled={isBusy || !tunnelName}>Create tunnel</button>
        <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" onClick={deleteTunnel} disabled={isBusy || !selectedTunnelId}>Delete tunnel</button>
        <select className="msi-field text-sm" value={selectedTunnelId} onChange={(e) => setSelectedTunnelId(e.target.value)}>
          <option value="">Chọn tunnel</option>
          {tunnels.map((tunnel) => (
            <option key={tunnel.id} value={tunnel.id}>{tunnel.name} ({tunnel.status ?? 'unknown'})</option>
          ))}
        </select>
        <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" onClick={() => loadTunnelToken(false)} disabled={isBusy || !selectedTunnelId}>View token (cache)</button>
        <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" onClick={() => loadTunnelToken(true)} disabled={isBusy || !selectedTunnelId}>Refresh token</button>
        {tunnelToken ? <pre className="md:col-span-3 rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-300 overflow-auto">{tunnelToken}</pre> : null}
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-3">
        <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" onClick={() => loadConnectors(false)} disabled={isBusy || !selectedTunnelId}>Load connectors (cache)</button>
        <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" onClick={() => loadConnectors(true)} disabled={isBusy || !selectedTunnelId}>Refresh connectors</button>
        <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" onClick={disconnectConnector} disabled={isBusy || !selectedTunnelId}>Disconnect connector</button>
        <select className="msi-field text-sm md:col-span-3" value={selectedConnectorId} onChange={(e) => setSelectedConnectorId(e.target.value)}>
          <option value="">(Tùy chọn) Chọn connector cụ thể, để trống = disconnect tất cả</option>
          {connectors.map((connector) => {
            const id = String(connector.client_id ?? connector.id ?? '')
            return (
              <option key={id} value={id}>
                {id} · {connector.colo_name ?? 'unknown colo'}
              </option>
            )
          })}
        </select>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-3">
        <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" onClick={() => loadDnsRecords(false)} disabled={isBusy || !selectedZoneId}>Load DNS (cache)</button>
        <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" onClick={() => loadDnsRecords(true)} disabled={isBusy || !selectedZoneId}>Refresh DNS</button>
        <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" onClick={deleteDnsRecord} disabled={isBusy || !selectedZoneId || !selectedDnsRecordId}>Delete DNS</button>
        <select className="msi-field text-sm md:col-span-3" value={selectedDnsRecordId} onChange={(e) => setSelectedDnsRecordId(e.target.value)}>
          <option value="">(Tùy chọn) Chọn record để sửa/xóa</option>
          {dnsRecords.map((record) => (
            <option key={record.id} value={record.id}>{record.type} {record.name} → {record.content}</option>
          ))}
        </select>
        <select className="msi-field text-sm" value={dnsType} onChange={(e) => setDnsType(e.target.value)}>
          {['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV'].map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <input className="msi-field text-sm" value={dnsName} onChange={(e) => setDnsName(e.target.value)} placeholder="Record name" />
        <input className="msi-field text-sm" value={dnsContent} onChange={(e) => setDnsContent(e.target.value)} placeholder="Record content" />
        <input className="msi-field text-sm" value={dnsTtl} onChange={(e) => setDnsTtl(e.target.value)} placeholder="TTL" />
        <label className="inline-flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={dnsProxied} onChange={(e) => setDnsProxied(e.target.checked)} /> proxied
        </label>
        <button type="button" className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400" onClick={saveDnsRecord} disabled={isBusy || !selectedZoneId || !dnsName || !dnsContent}>{selectedDnsRecordId ? 'Update DNS' : 'Create DNS'}</button>
      </div>

      {message ? <p className="text-sm text-slate-400">{message}</p> : null}
    </div>
  )
}
