'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, ArrowRight, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cloneRequests, TEAM_COLORS } from '@/lib/marketing'
import { cn } from '@/lib/utils'

const COLUMNS = ['Submitted', 'In Review', 'Approved', 'In ClickUp']

const COLUMN_STYLES = {
  'Submitted':  { header: 'bg-gray-100 text-gray-700',       dot: 'bg-gray-400' },
  'In Review':  { header: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-400' },
  'Approved':   { header: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  'In ClickUp': { header: 'bg-purple-100 text-purple-700',   dot: 'bg-purple-500' },
}

// Hardcoded until team members sign up to the portal
const TEAM_MEMBERS = [
  'Dhivyesh Prithiviraj',
  'Andrea Alvidres',
  "Lisa Lupeitu'u",
  'Santiago Islas',
  'Jordan Joelson',
  'Danish Ejaz',
  'Saran Jacob',
  'Shiloh Asir',
  'Sristi Srinivasan',
  'Ann Jayan',
  'Shraddha Subash',
  'Karan Jatoth',
]

/** Converts "M/D/YYYY" or "M/DD/YYYY HH:MM:SS" → "YYYY-MM-DD" for ClickUp */
function parseSheetDate(raw) {
  if (!raw) return null
  // Strip time portion if present (e.g. "3/16/2026 0:00:00")
  const datePart = raw.split(' ')[0]
  const parts = datePart.split('/')
  if (parts.length !== 3) return null
  const [m, d, y] = parts
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function parseSheetRows(rows) {
  return rows.map((row, i) => ({
    id: `req-${i}`,
    timestamp: row['Timestamp'] ?? '',
    requester: row['Name'] ?? row[Object.keys(row)[1]] ?? 'Unknown',
    type:    row['What do you need?'] ?? '',
    details: row["Details (be super specific. We will only do exactly what's written on here <3)"] ?? row['Details'] ?? '',
    due:     parseSheetDate(row['When do you need it by?'] ?? ''),
    team:    guessTeam(row),
    status:  'Submitted',
    assignee: '',
  }))
}

function guessTeam(row) {
  const all = Object.values(row).join(' ').toLowerCase()
  if (all.includes('design') || all.includes('logo') || all.includes('graphic')) return 'design'
  if (all.includes('ui') || all.includes('ux') || all.includes('figma')) return 'uiux'
  if (all.includes('outreach') || all.includes('email') || all.includes('sponsor')) return 'outreach'
  if (all.includes('content') || all.includes('post') || all.includes('reel') || all.includes('video')) return 'content'
  return 'design'
}

function RequestCard({ request, onMove, onApprove, onAssign, moving }) {
  const teamColors = TEAM_COLORS[request.team] ?? TEAM_COLORS.design
  const isPending  = request.status === 'Submitted' || request.status === 'In Review'
  const isApproved = request.status === 'Approved'

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{request.requester}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{request.timestamp}</p>
        </div>
        <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800 flex-shrink-0">
          external
        </span>
      </div>

      {request.type    && <p className="text-sm font-medium text-foreground">{request.type}</p>}
      {request.details && <p className="text-xs text-muted-foreground line-clamp-2">{request.details}</p>}

      {/* Team + due */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', teamColors.bg, teamColors.text, teamColors.border)}>
          {request.team === 'uiux' ? 'UI/UX' : request.team.charAt(0).toUpperCase() + request.team.slice(1)}
        </span>
        {request.due && (
          <span className="text-xs text-muted-foreground">
            Due {new Date(request.due + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}
      </div>

      {/* Assignee picker — shown whenever not yet in ClickUp */}
      {request.status !== 'In ClickUp' && (
        <Select value={request.assignee || 'unassigned'} onValueChange={val => onAssign(request.id, val === 'unassigned' ? '' : val)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Assign to…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {TEAM_MEMBERS.map(name => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {request.assignee && request.status === 'In ClickUp' && (
        <p className="text-xs text-muted-foreground">Assigned to {request.assignee}</p>
      )}

      {/* Actions */}
      {isPending && (
        <div className="flex gap-1.5 pt-1">
          <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs" disabled={moving} onClick={() => onApprove(request)}>
            {moving ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Approve'}
          </Button>
          <Button size="sm" variant="outline" className="flex-1 text-xs" disabled={moving} onClick={() => onMove(request.id, 'In Review')}>
            Review
          </Button>
          <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" disabled={moving} onClick={() => onMove(request.id, 'Submitted')}>
            Defer
          </Button>
        </div>
      )}

      {isApproved && (
        <Button size="sm" className="w-full text-xs" disabled={moving} onClick={() => onApprove(request)}>
          {moving ? <RefreshCw className="h-3 w-3 animate-spin" /> : <><ArrowRight className="h-3 w-3" /> Send to ClickUp</>}
        </Button>
      )}
    </div>
  )
}

export default function RequestsView() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [moving, setMoving]     = useState({})
  const [toast, setToast]       = useState(null)

  const pushToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/sheets')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load requests')
      setRequests(parseSheetRows(data.data ?? []))
    } catch (err) {
      setRequests(cloneRequests())
      setError('Using preview data — ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function moveRequest(id, status) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  function assignRequest(id, assignee) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, assignee } : r))
  }

  async function approveRequest(request) {
    setMoving(prev => ({ ...prev, [request.id]: true }))
    try {
      const res = await fetch('/api/clickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:    `${request.type}: ${request.requester}`,
          team:     request.team,
          due:      request.due || null,   // already ISO "YYYY-MM-DD"
          assignee: request.assignee || '',
        }),
      })
      if (!res.ok) throw new Error('ClickUp task creation failed')
      moveRequest(request.id, 'In ClickUp')
      pushToast(`"${request.type}" sent to ClickUp${request.assignee ? ` → ${request.assignee}` : ''}`)
    } catch (err) {
      pushToast(err.message, 'error')
    } finally {
      setMoving(prev => ({ ...prev, [request.id]: false }))
    }
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className={cn(
          'fixed bottom-4 right-4 z-50 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg',
          toast.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
        )}>
          {toast.msg}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Requests</h2>
            <p className="mt-1 text-sm text-muted-foreground">External intake pipeline — approve to push directly to ClickUp.</p>
          </div>
          <Button variant="outline" size="icon" onClick={load} disabled={loading} className="rounded-xl">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>

        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-4">
          {COLUMNS.map(col => {
            const cards = requests.filter(r => r.status === col)
            const style = COLUMN_STYLES[col]
            return (
              <div key={col} className="space-y-3">
                <div className={cn('flex items-center gap-2 rounded-xl px-3 py-2', style.header)}>
                  <span className={cn('h-2 w-2 rounded-full', style.dot)} />
                  <span className="text-xs font-semibold">{col}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">{cards.length}</Badge>
                </div>

                {loading && [1, 2].map(i => <div key={i} className="h-36 animate-pulse rounded-2xl bg-muted" />)}

                {!loading && cards.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">Empty</div>
                )}

                {!loading && cards.map(req => (
                  <RequestCard
                    key={req.id}
                    request={req}
                    onMove={moveRequest}
                    onApprove={approveRequest}
                    onAssign={assignRequest}
                    moving={!!moving[req.id]}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
