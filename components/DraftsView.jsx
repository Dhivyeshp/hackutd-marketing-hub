'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowUpRight, ExternalLink, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { approveReelInNotion, fetchReels } from '@/lib/api'
import { QUICK_LINKS } from '@/lib/marketing'
import { cn } from '@/lib/utils'

const STATUS_VARIANT = {
  'Ready for Review': 'warning',
  'In Progress':      'success',
  'Idea':             'secondary',
  'Done':             'outline',
}

const TYPE_COLORS = {
  Emotional: 'border-rose-200 bg-rose-100 text-rose-800',
  Funny:     'border-yellow-200 bg-yellow-100 text-yellow-800',
  Hype:      'border-red-200 bg-red-100 text-red-800',
  Info:      'border-sky-200 bg-sky-100 text-sky-800',
}

export default function DraftsView() {
  const [reels, setReels]     = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState({})
  const [toast, setToast]     = useState(null)

  const pushToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { reels } = await fetchReels()
      setReels(reels)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function sendToClickUp(reel) {
    setSending(prev => ({ ...prev, [reel.id]: true }))
    try {
      await approveReelInNotion(reel.id, reel.title)
      setReels(prev => prev.map(r => r.id === reel.id ? { ...r, status: 'In Progress' } : r))
      pushToast(`"${reel.title}" sent to ClickUp and marked In Progress in Notion`)
    } catch (err) {
      pushToast(err.message, 'error')
    } finally {
      setSending(prev => ({ ...prev, [reel.id]: false }))
    }
  }

  const readyReels    = reels.filter(r => r.status === 'Ready for Review')
  const draftingReels = reels.filter(r => r.status !== 'Ready for Review' && r.status !== 'In Progress' && r.status !== 'Done')

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed bottom-4 right-4 z-50 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg',
          toast.type === 'error'
            ? 'border-red-200 bg-red-50 text-red-800'
            : 'border-emerald-200 bg-emerald-50 text-emerald-800'
        )}>
          {toast.msg}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Drafts</h2>
            <p className="mt-1 text-sm text-muted-foreground">Notion content pipeline — push ready items directly to ClickUp.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <a href={QUICK_LINKS[0].url} target="_blank" rel="noopener noreferrer">
                Open Notion
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="outline" size="icon" onClick={load} disabled={loading} className="rounded-xl">
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {/* Ready for Review */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Ready for Review</h3>
              <Badge variant="warning">{readyReels.length}</Badge>
            </div>

            {loading && (
              <div className="space-y-2">
                {[1, 2].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}
              </div>
            )}

            {!loading && readyReels.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                No items ready for review. Update status to "Ready for Review" in Notion.
              </div>
            )}

            <div className="space-y-2">
              {readyReels.map(reel => (
                <ReelCard
                  key={reel.id}
                  reel={reel}
                  onSend={() => sendToClickUp(reel)}
                  sending={!!sending[reel.id]}
                />
              ))}
            </div>
          </div>

          {/* Still Drafting */}
          {!loading && draftingReels.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Still Drafting</h3>
                <Badge variant="secondary">{draftingReels.length}</Badge>
              </div>
              <div className="space-y-2">
                {draftingReels.map(reel => (
                  <ReelCard key={reel.id} reel={reel} readOnly />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function ReelCard({ reel, onSend, sending, readOnly }) {
  return (
    <div className={cn(
      'flex items-center gap-4 rounded-2xl border bg-card px-4 py-3 transition',
      readOnly ? 'border-border opacity-70' : 'border-amber-200 hover:border-amber-300'
    )}>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-foreground">{reel.title}</p>
          {reel.type && (
            <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', TYPE_COLORS[reel.type] ?? 'border-border bg-muted text-foreground')}>
              {reel.type}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {reel.filmer && <span>🎬 {reel.filmer}</span>}
          {reel.story  && <span>✏️ {reel.story}</span>}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge variant={STATUS_VARIANT[reel.status] ?? 'secondary'}>{reel.status || 'Idea'}</Badge>

        {!readOnly && onSend && (
          <Button size="sm" onClick={onSend} disabled={sending} className="text-xs">
            {sending ? <RefreshCw className="h-3 w-3 animate-spin" /> : '→ ClickUp'}
          </Button>
        )}

        {reel.notionUrl && (
          <a href={reel.notionUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition">
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  )
}
