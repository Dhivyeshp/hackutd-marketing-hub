'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowUpRight, CheckCircle2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_COLORS = {
  'Idea':                        'bg-muted text-muted-foreground',
  'Scripting':                   'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-200',
  'Script pending approval':     'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200',
  'Script approved → Editing':   'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200',
  'Edit pending approval':       'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-200',
  'Edit needs changes':          'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-200',
  'Editing (revising)':          'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200',
}

export default function ExternalReelPage() {
  const { id } = useParams()
  const [reel, setReel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch(`/api/reels/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setReel(data.reel)
        setSelectedStatus(data.reel.status)
      })
      .catch(() => setError('Failed to load reel'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleUpdate() {
    if (!selectedStatus || selectedStatus === reel.status) return
    setSaving(true)
    try {
      const res = await fetch(`/api/reels/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: selectedStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')
      setReel(prev => ({ ...prev, status: selectedStatus }))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    )
  }

  if (error || !reel) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">Reel not found</p>
          <p className="mt-1 text-sm text-muted-foreground">{error || 'This link may be invalid.'}</p>
        </div>
      </div>
    )
  }

  const statusColor = STATUS_COLORS[reel.status] ?? 'bg-muted text-muted-foreground'
  const changed = selectedStatus !== reel.status

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-lg space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="HackUTD" className="h-8 w-8 rounded-lg object-contain" />
          <div>
            <p className="text-xs text-muted-foreground">HackUTD Marketing</p>
            <p className="text-sm font-semibold text-foreground">Reel assignment</p>
          </div>
          {reel.notionUrl && (
            <a
              href={reel.notionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
            >
              Notion <ArrowUpRight className="h-3 w-3" />
            </a>
          )}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div>
            <h1 className="text-xl font-semibold text-foreground leading-snug">{reel.title}</h1>
            {reel.type && <p className="mt-1 text-xs text-muted-foreground">{reel.type}</p>}
          </div>

          {reel.concept && (
            <p className="text-sm text-muted-foreground leading-relaxed">{reel.concept}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm">
            {reel.filmer && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Filmer / Editor</p>
                <p className="mt-0.5 font-medium text-foreground">{reel.filmer}</p>
              </div>
            )}
            {reel.storyboarder && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Storyboarder</p>
                <p className="mt-0.5 font-medium text-foreground">{reel.storyboarder}</p>
              </div>
            )}
          </div>

          {/* Current status */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Current status</p>
            <span className={cn('inline-block rounded-lg px-3 py-1.5 text-xs font-semibold', statusColor)}>
              {reel.status || 'Not set'}
            </span>
          </div>

          {/* Update status */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Update your progress</p>
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition hover:border-ring"
              >
                <span>{selectedStatus || 'Select status…'}</span>
                <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
              </button>

              {open && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                  {reel.allowedStatuses.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setSelectedStatus(s); setOpen(false) }}
                      className={cn(
                        'flex w-full items-center px-3.5 py-2.5 text-left text-sm transition hover:bg-accent',
                        s === selectedStatus && 'font-medium text-foreground bg-accent/50'
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {saved && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              Status updated — the content team will see this.
            </div>
          )}

          <button
            type="button"
            disabled={!changed || saving}
            onClick={handleUpdate}
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
          >
            {saving ? 'Saving…' : changed ? `Mark as "${selectedStatus}"` : 'No changes'}
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          This link was shared with you by the HackUTD content team.
        </p>
      </div>
    </div>
  )
}
