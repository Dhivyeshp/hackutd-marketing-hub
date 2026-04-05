'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, ArrowUpRight, CheckCircle, RefreshCw, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

function getInitials(name = '') {
  return name.split(' ').map(n => n[0] ?? '').join('').toUpperCase().slice(0, 2)
}

function AssigneePicker({ users, value, onChange }) {
  function toggle(id) {
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id])
  }
  if (!users.length) return null
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">Assign to</p>
      <div className="flex flex-wrap gap-1.5">
        {users.map(u => {
          const selected = value.includes(u.id)
          return (
            <button
              key={u.id}
              type="button"
              title={u.name}
              onClick={e => { e.stopPropagation(); toggle(u.id) }}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold transition-all ring-2',
                selected
                  ? 'bg-primary text-primary-foreground ring-primary'
                  : 'bg-muted text-muted-foreground ring-transparent hover:ring-border'
              )}
            >
              {getInitials(u.name)}
            </button>
          )
        })}
      </div>
      {value.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          {users.filter(u => value.includes(u.id)).map(u => u.name).join(', ')}
        </p>
      )}
    </div>
  )
}

const STATUSES = [
  'Idea',
  'Scripting',
  'Script pending approval',
  'Script approved → Editing',
  'Edit pending approval',
  'Edit needs changes',
  'Editing (revising)',
]

// Statuses where a lead can approve and push to ClickUp
const APPROVAL_STATUSES = {
  'Script pending approval':  'Script approved → Editing',
  'Edit pending approval':    'Edit approved → Ready to post',
}

const STATUS_META = {
  'Idea':                        { header: 'bg-muted text-muted-foreground',                                                      dot: 'bg-muted-foreground' },
  'Scripting':                   { header: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-200',                        dot: 'bg-sky-400' },
  'Script pending approval':     { header: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200',                dot: 'bg-amber-400' },
  'Script approved → Editing':   { header: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200',        dot: 'bg-emerald-500' },
  'Edit pending approval':       { header: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-200',            dot: 'bg-orange-400' },
  'Edit needs changes':          { header: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-200',                        dot: 'bg-red-400' },
  'Editing (revising)':          { header: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200',            dot: 'bg-violet-400' },
}

const SKIP_IN_MODAL = new Set(['last_edited_time', 'last_edited_by'])

function DetailModal({ row, columns, users, statusPropName, onClose, onStatusChange, onApprove, onSyncClickUp, busy }) {
  const title = row.properties['Video Title'] || row.properties['Title'] || row.properties['Name'] || 'Untitled'
  const status = row.properties[statusPropName] || ''
  const nextStatus = APPROVAL_STATUSES[status]
  const [assigneeIds, setAssigneeIds] = useState([])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{status}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {row.notionUrl && (
              <a href={row.notionUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  Open in Notion <ArrowUpRight className="h-3 w-3" />
                </Button>
              </a>
            )}
            <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="divide-y divide-border px-6">
          {columns.filter(c => !SKIP_IN_MODAL.has(c.type)).map(col => {
            const val = row.properties[col.name]
            if (!val) return null
            return (
              <div key={col.name} className="flex gap-4 py-3">
                <p className="w-44 flex-shrink-0 text-xs font-medium text-muted-foreground">{col.name}</p>
                <p className="flex-1 text-sm text-foreground break-words">{val}</p>
              </div>
            )
          })}
        </div>

        <div className="border-t border-border px-6 py-4 space-y-3">
            <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[160px]">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Change status</p>
              <Select value={status} onValueChange={s => onStatusChange(row.id, s)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <AssigneePicker users={users} value={assigneeIds} onChange={setAssigneeIds} />

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 text-xs"
              disabled={busy === 'sync'}
              onClick={() => onSyncClickUp(row, assigneeIds)}
            >
              {busy === 'sync'
                ? <><RefreshCw className="h-3 w-3 animate-spin" /> Syncing…</>
                : <><ArrowRight className="h-3 w-3" /> Sync to ClickUp</>
              }
            </Button>

            {nextStatus && (
              <Button
                className="flex-1 text-xs"
                disabled={busy === 'approve'}
                onClick={() => onApprove(row, assigneeIds, nextStatus)}
              >
                {busy === 'approve'
                  ? <><RefreshCw className="h-3 w-3 animate-spin" /> Approving…</>
                  : <><CheckCircle className="h-4 w-4" /> Approve → {nextStatus}</>
                }
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ReelCard({ row, statusPropName, users, onStatusChange, onApprove, onOpen, busy }) {
  const title   = row.properties['Video Title'] || row.properties['Title'] || row.properties['Name'] || 'Untitled'
  const concept = row.properties['Video Concept'] || ''
  const type    = row.properties['Type'] || ''
  const filmer  = row.properties['Filmer/Editor'] || row.properties['Filmer'] || ''
  const story   = row.properties['Storyboarder/Ideator'] || row.properties['Storyboarder'] || ''
  const status  = row.properties[statusPropName] || ''
  const nextStatus = APPROVAL_STATUSES[status]
  const [assigneeIds, setAssigneeIds] = useState([])

  return (
    <div
      className="space-y-3 rounded-2xl border border-border bg-card p-4 cursor-pointer transition hover:border-ring hover:shadow-sm"
      onClick={() => onOpen(row)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground truncate">{title}</p>
            {type && <Badge variant="outline" className="flex-shrink-0 text-xs">{type}</Badge>}
          </div>
          {concept && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{concept}</p>}
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {filmer && <span>Filmer: {filmer}</span>}
            {story  && <span>Story: {story}</span>}
          </div>
        </div>
        {row.notionUrl && (
          <a
            href={row.notionUrl} target="_blank" rel="noopener noreferrer"
            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
            onClick={e => e.stopPropagation()}
          >
            <ArrowUpRight className="h-4 w-4" />
          </a>
        )}
      </div>

      <div className="space-y-2" onClick={e => e.stopPropagation()}>
        {nextStatus && (
          <AssigneePicker users={users} value={assigneeIds} onChange={setAssigneeIds} />
        )}

        <div className="flex gap-1.5">
          <Select value={status} onValueChange={s => onStatusChange(row.id, s)}>
            <SelectTrigger className="h-8 flex-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          {nextStatus && (
            <Button size="sm" className="flex-shrink-0 text-xs" disabled={!!busy} onClick={() => onApprove(row, assigneeIds, nextStatus)}>
              {busy === 'approve'
                ? <RefreshCw className="h-3 w-3 animate-spin" />
                : <><CheckCircle className="h-3 w-3" /> Approve</>
              }
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DraftsView() {
  const [columns, setColumns]               = useState([])
  const [rows, setRows]                     = useState([])
  const [statusPropName, setStatusPropName] = useState('')
  const [users, setUsers]                   = useState([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState('')
  const [busy, setBusy]                     = useState({})
  const [toast, setToast]                   = useState(null)
  const [modalRow, setModalRow]             = useState(null)
  const toastRef                            = useRef(null)

  function pushToast(msg, type = 'success') {
    setToast({ msg, type })
    clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async (refresh = false) => {
    setLoading(true)
    setError('')
    try {
      const notionUrl = refresh ? '/api/notion?refresh=1' : '/api/notion'
      const [notionRes, usersRes] = await Promise.all([
        fetch(notionUrl, { cache: 'no-store' }),
        fetch('/api/users', { cache: 'no-store' }),
      ])
      const notionData = await notionRes.json()
      if (!notionRes.ok) throw new Error(notionData.error || 'Failed to load Notion data')
      setColumns(notionData.columns ?? [])
      setRows(notionData.rows ?? [])
      setStatusPropName(notionData.statusPropName ?? '')
      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.users ?? [])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => () => clearTimeout(toastRef.current), [])

  function updateRowStatus(id, status) {
    setRows(prev => prev.map(r =>
      r.id === id ? { ...r, properties: { ...r.properties, [statusPropName]: status } } : r
    ))
    setModalRow(prev => prev?.id === id
      ? { ...prev, properties: { ...prev.properties, [statusPropName]: status } }
      : prev
    )
  }

  async function handleStatusChange(id, status) {
    setBusy(prev => ({ ...prev, [id]: 'status' }))
    try {
      const res = await fetch(`/api/notion/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, statusPropName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update status')
      updateRowStatus(id, status)
      pushToast(`Moved to "${status}"`)
    } catch (err) {
      pushToast(err.message, 'error')
    } finally {
      setBusy(prev => ({ ...prev, [id]: null }))
    }
  }

  async function handleSyncClickUp(row, assigneeIds) {
    const title = row.properties['Video Title'] || row.properties['Title'] || row.properties['Name'] || 'Untitled'
    setBusy(prev => ({ ...prev, [row.id]: 'sync' }))
    try {
      const res = await fetch(`/api/notion/${row.id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, assigneeIds: assigneeIds ?? [], skipNotionUpdate: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to sync')
      pushToast(`"${title}" synced to ClickUp`)
    } catch (err) {
      pushToast(err.message, 'error')
    } finally {
      setBusy(prev => ({ ...prev, [row.id]: null }))
    }
  }

  async function handleApprove(row, assigneeIds, nextStatus) {
    const title = row.properties['Video Title'] || row.properties['Title'] || row.properties['Name'] || 'Untitled'
    setBusy(prev => ({ ...prev, [row.id]: 'approve' }))
    try {
      const res = await fetch(`/api/notion/${row.id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, assigneeIds: assigneeIds?.length ? assigneeIds : [], nextStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to approve')
      updateRowStatus(row.id, nextStatus)
      if (modalRow?.id === row.id) setModalRow(null)
      pushToast(`"${title}" approved → ${nextStatus}`)
    } catch (err) {
      pushToast(err.message, 'error')
    } finally {
      setBusy(prev => ({ ...prev, [row.id]: null }))
    }
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className={cn(
          'fixed bottom-4 right-4 z-50 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg',
          toast.type === 'error'
            ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200'
            : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
        )}>
          {toast.msg}
        </div>
      )}

      {modalRow && (
        <DetailModal
          row={modalRow}
          columns={columns}
          users={users}
          statusPropName={statusPropName}
          busy={busy[modalRow.id]}
          onClose={() => setModalRow(null)}
          onStatusChange={handleStatusChange}
          onApprove={handleApprove}
          onSyncClickUp={handleSyncClickUp}
        />
      )}

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Reel Ideas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Click any card for full details · Approve moves to next stage + creates ClickUp task
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={() => load(true)} disabled={loading} className="rounded-xl">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="overflow-x-auto scrollbar-thin">
          <div className="flex gap-4 p-6" style={{ minWidth: `${STATUSES.length * 280}px` }}>
            {STATUSES.map(status => {
              const meta = STATUS_META[status]
              const cards = rows.filter(r => r.properties[statusPropName] === status)

              return (
                <div key={status} className="flex w-64 flex-shrink-0 flex-col gap-3">
                  <div className={cn('flex items-center gap-2 rounded-xl px-3 py-2', meta.header)}>
                    <span className={cn('h-2 w-2 rounded-full flex-shrink-0', meta.dot)} />
                    <span className="text-xs font-semibold truncate">{status}</span>
                    <Badge variant="secondary" className="ml-auto flex-shrink-0 text-xs">
                      {loading ? '—' : cards.length}
                    </Badge>
                  </div>

                  {loading && [1, 2].map(i => (
                    <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
                  ))}

                  {!loading && cards.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                      Empty
                    </div>
                  )}

                  {!loading && cards.map(row => (
                    <ReelCard
                      key={row.id}
                      row={row}
                      statusPropName={statusPropName}
                      users={users}
                      busy={busy[row.id]}
                      onStatusChange={handleStatusChange}
                      onApprove={handleApprove}
                      onOpen={setModalRow}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
