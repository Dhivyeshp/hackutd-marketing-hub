'use client'

import { useEffect, useState } from 'react'
import { Check, ExternalLink, RefreshCw, Undo2, Video, X } from 'lucide-react'
import { approveReelInNotion, fetchReels } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { isPendingReel } from '@/lib/marketing'
import { cn } from '@/lib/utils'

const STATUS_VARIANT = {
  Idea: 'secondary',
  'In Progress': 'success',
  Done: 'outline',
  Approved: 'success',
  'Needs Rewrite': 'destructive',
}

const TYPE_COLORS = {
  Emotional: 'border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-950 dark:bg-rose-950/50 dark:text-rose-200',
  Funny: 'border-yellow-200 bg-yellow-100 text-yellow-800 dark:border-yellow-950 dark:bg-yellow-950/50 dark:text-yellow-200',
  Hype: 'border-red-200 bg-red-100 text-red-800 dark:border-red-950 dark:bg-red-950/50 dark:text-red-200',
  Info: 'border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-950 dark:bg-sky-950/50 dark:text-sky-200',
}

export default function ReelsView() {
  const [reels, setReels] = useState([])
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState(false)
  const [approving, setApproving] = useState({})
  const [toasts, setToasts] = useState([])

  function pushToast(message, type = 'success') {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 4000)
  }

  async function load() {
    setLoading(true)
    const response = await fetchReels()
    setReels(response.reels)
    setPreview(response.preview)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleApprove(reel) {
    setApproving((prev) => ({ ...prev, [reel.id]: true }))

    try {
      const response = await approveReelInNotion(reel.id, reel.title)
      setReels((prev) =>
        prev.map((item) => item.id === reel.id ? { ...item, status: 'In Progress' } : item)
      )
      setPreview(response.preview)
      pushToast(
        response.preview
          ? `"${reel.title}" approved in preview mode`
          : `"${reel.title}" approved and sent to ClickUp`
      )
    } finally {
      setApproving((prev) => ({ ...prev, [reel.id]: false }))
    }
  }

  function handleReject(reel) {
    setReels((prev) =>
      prev.map((item) => item.id === reel.id ? { ...item, status: 'Needs Rewrite' } : item)
    )
    pushToast(`"${reel.title}" moved back for edits`, 'error')
  }

  function handleReset(reel) {
    setReels((prev) =>
      prev.map((item) => item.id === reel.id ? { ...item, status: 'Idea' } : item)
    )
    pushToast(`"${reel.title}" moved back to the idea queue`)
  }

  const pending = reels.filter((reel) => isPendingReel(reel.status))
  const active = reels.filter((reel) => !isPendingReel(reel.status))

  return (
    <div className="space-y-5">
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto rounded-xl border px-4 py-3 text-sm font-medium shadow-lg',
              toast.type === 'error'
                ? 'border-destructive/20 bg-destructive/10 text-destructive'
                : 'border-success/30 bg-success text-success-foreground'
            )}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold text-foreground">Reel Ideas</h2>
              {preview && <Badge variant="outline">Preview data</Badge>}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Review pending concepts from Notion and model the approve or send-back flow before live wiring.
            </p>
          </div>

          <Button variant="outline" size="icon" onClick={load} disabled={loading} title="Refresh reels" className="rounded-xl">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>

        <div className="grid gap-4 border-b border-border px-6 py-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-muted/50 px-4 py-4">
            <p className="text-sm text-muted-foreground">Pending approvals</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{pending.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-muted/50 px-4 py-4">
            <p className="text-sm text-muted-foreground">Active pipeline</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{active.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-muted/50 px-4 py-4">
            <p className="text-sm text-muted-foreground">Mode</p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {preview ? 'Frontend preview' : 'Connected workflow'}
            </p>
          </div>
        </div>

        <div className="grid gap-6 p-6 xl:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-5">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Pending approval
                </h3>
                <Badge variant={pending.length > 0 ? 'warning' : 'secondary'}>{pending.length}</Badge>
              </div>

              {loading && (
                <div className="space-y-2">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-24 animate-pulse rounded-2xl bg-muted" />
                  ))}
                </div>
              )}

              {!loading && pending.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
                  <Video className="mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">No reel ideas waiting on approval</p>
                  <p className="mt-1 text-xs text-muted-foreground">Fresh ideas from Notion will land here.</p>
                </div>
              )}

              <div className="space-y-3">
                {pending.map((reel) => (
                  <ReelCard
                    key={reel.id}
                    reel={reel}
                    approving={approving[reel.id]}
                    onApprove={() => handleApprove(reel)}
                    onReject={() => handleReject(reel)}
                  />
                ))}
              </div>
            </section>

            {!loading && active.length > 0 && (
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  In progress and archived ideas
                </h3>
                <div className="space-y-3">
                  {active.map((reel) => (
                    <ReelCard
                      key={reel.id}
                      reel={reel}
                      onReset={reel.status === 'Needs Rewrite' ? () => handleReset(reel) : undefined}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-muted/50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Workflow note</p>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <p>Approving a reel is designed to update Notion and create a ClickUp task in parallel.</p>
                <p>For this UI pass, send-back is modeled locally so you can review the interaction before adding a backend route.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Status language</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.keys(STATUS_VARIANT).map((status) => (
                  <Badge key={status} variant={STATUS_VARIANT[status]}>
                    {status}
                  </Badge>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}

function ReelCard({ reel, approving, onApprove, onReject, onReset }) {
  const isPending = isPendingReel(reel.status)

  return (
    <div
      className={cn(
        'rounded-2xl border bg-card p-4 transition',
        isPending ? 'border-amber-200 dark:border-amber-900/60' : 'border-border hover:bg-accent/40'
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">{reel.title}</p>
            <Badge variant={STATUS_VARIANT[reel.status] ?? 'secondary'}>
              {reel.status || 'Idea'}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {reel.type && (
              <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', TYPE_COLORS[reel.type] ?? 'border-border bg-muted text-muted-foreground')}>
                {reel.type}
              </span>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Filmer: {reel.filmer || 'TBD'} / Story: {reel.story || 'TBD'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {isPending && onApprove && (
            <Button size="sm" onClick={onApprove} disabled={approving}>
              {approving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {approving ? 'Approving...' : 'Approve'}
            </Button>
          )}

          {isPending && onReject && (
            <Button size="sm" variant="outline" onClick={onReject}>
              <X className="h-3.5 w-3.5" />
              Send back
            </Button>
          )}

          {onReset && (
            <Button size="sm" variant="outline" onClick={onReset}>
              <Undo2 className="h-3.5 w-3.5" />
              Move to idea
            </Button>
          )}

          {reel.notionUrl && (
            <a
              href={reel.notionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full p-2 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
              title="Open in Notion"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
