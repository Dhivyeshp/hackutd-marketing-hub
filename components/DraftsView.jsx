'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ExternalLink, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { approveReel, fetchReels, rejectReel, reviseReel } from '@/lib/api'
import { QUICK_LINKS } from '@/lib/marketing'
import { cn } from '@/lib/utils'

const TYPE_COLORS = {
  Emotional: 'border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300',
  Funny:     'border-yellow-200 bg-yellow-100 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-300',
  Hype:      'border-red-200 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300',
  Info:      'border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300',
}

function ReelCard({ reel, onApprove, onRevise, onReject, busy }) {
  return (
    <div className="space-y-3 rounded-2xl border border-amber-200 bg-card p-4 transition dark:border-amber-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{reel.title}</p>
            {reel.type && (
              <span className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
                TYPE_COLORS[reel.type] ?? 'border-border bg-muted text-muted-foreground'
              )}>
                {reel.type}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {reel.filmer && <span>Filmer: {reel.filmer}</span>}
            {reel.story  && <span>Story: {reel.story}</span>}
          </div>
        </div>

        {reel.notionUrl && (
          <a
            href={reel.notionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-muted-foreground transition hover:text-foreground"
            title="Open in Notion"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        <Button
          size="sm"
          className="flex-1 text-xs"
          disabled={busy}
          onClick={() => onApprove(reel)}
        >
          {busy === 'approve' ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Approve → ClickUp'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs"
          disabled={busy}
          onClick={() => onRevise(reel)}
        >
          {busy === 'revise' ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Request changes'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-xs text-muted-foreground hover:text-destructive"
          disabled={busy}
          onClick={() => onReject(reel)}
        >
          {busy === 'reject' ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Reject'}
        </Button>
      </div>
    </div>
  )
}

export default function DraftsView() {
  const [reels, setReels]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [busy, setBusy]       = useState({})  // { [id]: 'approve' | 'revise' | 'reject' }
  const [toast, setToast]     = useState(null)
  const toastRef              = useRef(null)

  function pushToast(msg, type = 'success') {
    setToast({ msg, type })
    clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { reels: fetched } = await fetchReels()
      setReels(fetched)
    } catch (err) {
      setError(err.message || 'Failed to load Notion data')
      setReels([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => () => clearTimeout(toastRef.current), [])

  function removeReel(id) {
    setReels(prev => prev.filter(r => r.id !== id))
  }

  async function handleApprove(reel) {
    setBusy(prev => ({ ...prev, [reel.id]: 'approve' }))
    try {
      await approveReel(reel.id, reel.title)
      removeReel(reel.id)
      pushToast(`"${reel.title}" approved — Film task created in ClickUp`)
    } catch (err) {
      pushToast(err.message, 'error')
    } finally {
      setBusy(prev => ({ ...prev, [reel.id]: null }))
    }
  }

  async function handleRevise(reel) {
    setBusy(prev => ({ ...prev, [reel.id]: 'revise' }))
    try {
      await reviseReel(reel.id)
      removeReel(reel.id)
      pushToast(`"${reel.title}" sent back for revision`)
    } catch (err) {
      pushToast(err.message, 'error')
    } finally {
      setBusy(prev => ({ ...prev, [reel.id]: null }))
    }
  }

  async function handleReject(reel) {
    setBusy(prev => ({ ...prev, [reel.id]: 'reject' }))
    try {
      await rejectReel(reel.id)
      removeReel(reel.id)
      pushToast(`"${reel.title}" rejected`)
    } catch (err) {
      pushToast(err.message, 'error')
    } finally {
      setBusy(prev => ({ ...prev, [reel.id]: null }))
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

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Drafts</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Content pipeline — items marked "Ready for Review" in the Notion brewing station.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <a href={QUICK_LINKS[0].url} target="_blank" rel="noopener noreferrer">
                Open Notion <ArrowUpRight className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="outline" size="icon" onClick={load} disabled={loading} className="rounded-xl">
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
              {error}
            </div>
          )}

          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Ready for Review
            </h3>
            <Badge variant="warning">{loading ? '—' : reels.length}</Badge>
          </div>

          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)}
            </div>
          )}

          {!loading && reels.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
              No items ready for review. Update status to "Ready for Review" in Notion.
            </div>
          )}

          {!loading && (
            <div className="space-y-3">
              {reels.map(reel => (
                <ReelCard
                  key={reel.id}
                  reel={reel}
                  busy={busy[reel.id]}
                  onApprove={handleApprove}
                  onRevise={handleRevise}
                  onReject={handleReject}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
