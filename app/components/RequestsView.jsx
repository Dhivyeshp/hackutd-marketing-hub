'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, ArrowRight, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TEAM_COLORS } from '@/lib/marketing'
import { REQUEST_COLUMNS, getRequestBoardStatus } from '@/lib/requests'
import { cn } from '@/lib/utils'

const COLUMN_META = {
  submitted: { label: 'Submitted', header: 'bg-muted text-foreground', dot: 'bg-muted-foreground' },
  in_review: { label: 'In Review', header: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200', dot: 'bg-blue-400' },
  approved: { label: 'Approved', header: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200', dot: 'bg-emerald-500' },
  in_clickup: { label: 'In ClickUp', header: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200', dot: 'bg-violet-500' },
}

function formatDue(dateString) {
  if (!dateString) return ''

  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}


function RequestCard({
  request,
  assigneeOptions,
  moving,
  onAssign,
  onApprove,
  onStatusChange,
}) {
  const teamColors = TEAM_COLORS[request.team] ?? TEAM_COLORS.design
  const boardStatus = getRequestBoardStatus(request)
  const isDeferred = request.status === 'deferred'
  const canApprove = Boolean(request.assignedToUserId)
  const primaryActionLabel = boardStatus === 'approved' ? 'Send to ClickUp' : 'Approve'

  return (
    <div
      className={cn(
        'space-y-3 rounded-2xl border border-border bg-card p-4 transition',
        isDeferred && boardStatus === 'submitted' && 'opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{request.requester}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {request.fromOrg || 'External request'}
            {request.timestamp ? ` • ${request.timestamp}` : ''}
          </p>
        </div>
        <span className="inline-flex flex-shrink-0 items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
          external
        </span>
      </div>

      {request.type && <p className="text-sm font-medium text-foreground">{request.type}</p>}
      {request.description && (
        <p className="line-clamp-3 text-xs text-muted-foreground">{request.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
            teamColors.bg,
            teamColors.text,
            teamColors.border
          )}
        >
          {request.team === 'uiux' ? 'UI/UX' : request.team.charAt(0).toUpperCase() + request.team.slice(1)}
        </span>
        {request.due && (
          <span className="text-xs text-muted-foreground">Due {formatDue(request.due)}</span>
        )}
        {isDeferred && boardStatus === 'submitted' && (
          <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
            Deferred
          </Badge>
        )}
      </div>

      {boardStatus !== 'in_clickup' && (
        <Select
          value={request.assignedToUserId || 'unassigned'}
          onValueChange={value => onAssign(request.id, value === 'unassigned' ? '' : value)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Assign to..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {assigneeOptions.map(user => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {request.assigneeName && boardStatus === 'in_clickup' && (
        <p className="text-xs text-muted-foreground">Assigned to {request.assigneeName}</p>
      )}

      <div className="flex flex-wrap gap-1.5 pt-1">
        {boardStatus !== 'in_clickup' && (
          <Button
            size="sm"
            className={cn(
              'flex-1 text-xs',
              !canApprove && 'cursor-not-allowed opacity-40'
            )}
            disabled={!canApprove || moving}
            title={!canApprove ? 'Select an assignee first' : ''}
            onClick={() => onApprove(request)}
          >
            {moving ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : boardStatus === 'approved' ? (
              <>
                <ArrowRight className="h-3 w-3" /> {primaryActionLabel}
              </>
            ) : (
              primaryActionLabel
            )}
          </Button>
        )}

        {boardStatus === 'submitted' && !isDeferred && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
            disabled={moving}
            onClick={() => onStatusChange(request, 'in_review')}
          >
            Review
          </Button>
        )}

        {boardStatus === 'in_review' && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
            disabled={moving}
            onClick={() => onStatusChange(request, 'submitted')}
          >
            Back to submitted
          </Button>
        )}

        {boardStatus !== 'in_clickup' && (
          <Button
            size="sm"
            variant={isDeferred ? 'outline' : 'ghost'}
            className="text-xs text-muted-foreground"
            disabled={moving}
            onClick={() => onStatusChange(request, isDeferred ? 'submitted' : 'deferred')}
          >
            {isDeferred ? 'Reconsider' : 'Defer'}
          </Button>
        )}
      </div>
    </div>
  )
}

export default function RequestsView() {
  const [requests, setRequests] = useState([])
  const [assignableUsers, setAssignableUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [moving, setMoving] = useState({})
  const [toast, setToast] = useState(null)
  const toastTimeoutRef = useRef(null)

  const usersById = useMemo(
    () => Object.fromEntries(assignableUsers.map(user => [user.id, user])),
    [assignableUsers]
  )

  const pushToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    window.clearTimeout(toastTimeoutRef.current)
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 3500)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [requestsRes, usersRes] = await Promise.all([
        fetch('/api/requests', { cache: 'no-store' }),
        fetch('/api/users', { cache: 'no-store' }),
      ])

      const requestsData = await requestsRes.json()
      const usersData = usersRes.ok ? await usersRes.json() : { users: [] }

      if (!requestsRes.ok) {
        throw new Error(requestsData.error ?? 'Failed to load requests')
      }

      setRequests(requestsData.requests ?? [])
      setAssignableUsers(usersData.users ?? [])
      setError(requestsData.warning ?? '')
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    return () => window.clearTimeout(toastTimeoutRef.current)
  }, [])

  function updateRequest(id, updates) {
    setRequests(prev =>
      prev.map(request => (request.id === id ? { ...request, ...updates } : request))
    )
  }

  function handleAssign(id, assignedToUserId) {
    const assignee = usersById[assignedToUserId]

    updateRequest(id, {
      assignedToUserId,
      assigneeName: assignee?.name ?? '',
    })
  }

  async function handleStatusChange(request, status) {
    setMoving(prev => ({ ...prev, [request.id]: true }))

    try {
      const response = await fetch(`/api/requests/${request.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, request }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to update request status')
      }

      updateRequest(request.id, data.request)
      pushToast(status === 'deferred' ? 'Request deferred' : status === 'submitted' ? 'Request restored' : 'Request moved to review')
    } catch (statusError) {
      pushToast(statusError.message, 'error')
    } finally {
      setMoving(prev => ({ ...prev, [request.id]: false }))
    }
  }

  async function handleApprove(request) {
    if (!request.assignedToUserId) return

    setMoving(prev => ({ ...prev, [request.id]: true }))

    try {
      const response = await fetch(`/api/requests/${request.id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assigned_to_user_id: request.assignedToUserId,
          assignee_name: request.assigneeName,
          request,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to approve request')
      }

      updateRequest(request.id, data.request)
      pushToast(`Task created in ClickUp - assigned to ${data.assigneeName || request.assigneeName}`)
    } catch (approveError) {
      pushToast(approveError.message, 'error')
    } finally {
      setMoving(prev => ({ ...prev, [request.id]: false }))
    }
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div
          className={cn(
            'fixed bottom-4 right-4 z-50 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg',
            toast.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
          )}
        >
          {toast.message}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Requests</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              External intake pipeline with assignee-gated approvals and persistent deferred requests.
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={load} disabled={loading} className="rounded-xl">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>

        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-4">
          {REQUEST_COLUMNS.map(column => {
            const meta = COLUMN_META[column]
            const cards = requests
              .filter(request => getRequestBoardStatus(request) === column)
              .sort((left, right) => {
                if (column !== 'submitted') return 0
                const leftDeferred = left.status === 'deferred'
                const rightDeferred = right.status === 'deferred'
                if (leftDeferred === rightDeferred) return 0
                return leftDeferred ? 1 : -1
              })

            return (
              <div key={column} className="space-y-3">
                <div className={cn('flex items-center gap-2 rounded-xl px-3 py-2', meta.header)}>
                  <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
                  <span className="text-xs font-semibold">{meta.label}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {cards.length}
                  </Badge>
                </div>

                {loading && [1, 2].map(item => (
                  <div key={item} className="h-36 animate-pulse rounded-2xl bg-muted" />
                ))}

                {!loading && cards.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
                    Empty
                  </div>
                )}

                {!loading && cards.map(request => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    assigneeOptions={assignableUsers}
                    moving={Boolean(moving[request.id])}
                    onAssign={handleAssign}
                    onApprove={handleApprove}
                    onStatusChange={handleStatusChange}
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
