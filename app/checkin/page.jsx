'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { CheckCircle2, CircleAlert, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const OPTIONS = [
  {
    status: 'on_track',
    label: 'On track',
    description: "Making good progress, no blockers.",
    color: 'border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400',
    dot: 'bg-green-500',
  },
  {
    status: 'needs_help',
    label: 'Needs help',
    description: "Could use some support or guidance.",
    color: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400',
    dot: 'bg-yellow-500',
  },
  {
    status: 'blocked',
    label: 'Blocked',
    description: "Stuck and can't move forward without help.",
    color: 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400',
    dot: 'bg-red-500',
  },
]

function CheckinForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const uid = searchParams.get('uid')

  const [authState, setAuthState] = useState('loading') // loading | ok | redirect
  const [existing, setExisting]   = useState(null)
  const [selected, setSelected]   = useState('')
  const [note, setNote]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]           = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(({ user }) => {
        if (!user) { router.replace('/login'); return }
        setAuthState('ok')
        return fetch('/api/checkin')
      })
      .then(r => r?.json())
      .then(data => {
        if (data?.checkin) {
          setExisting(data.checkin)
          setDone(true)
        }
      })
      .catch(() => setAuthState('ok'))
  }, [router])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selected) return
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: selected, note }),
    })
    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setError(data.error || 'Submission failed.')
      return
    }

    setExisting(data.checkin)
    setDone(true)
  }

  if (authState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const alreadyOption = OPTIONS.find(o => o.status === existing?.status)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Thursday check-in</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">How's it going?</h1>
        </div>

        {done ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
            <p className="text-lg font-semibold text-foreground">Check-in submitted</p>
            {alreadyOption && (
              <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium', alreadyOption.color)}>
                <span className={cn('h-2 w-2 rounded-full', alreadyOption.dot)} />
                {alreadyOption.label}
              </span>
            )}
            {existing?.note && (
              <p className="text-sm text-muted-foreground">"{existing.note}"</p>
            )}
            <Button variant="outline" className="mt-2" onClick={() => router.push('/my-tasks')}>
              Back to my tasks
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              {OPTIONS.map(opt => (
                <button
                  key={opt.status}
                  type="button"
                  onClick={() => setSelected(opt.status)}
                  className={cn(
                    'w-full rounded-xl border-2 px-4 py-3.5 text-left transition',
                    selected === opt.status
                      ? opt.color
                      : 'border-border bg-card text-foreground hover:bg-accent'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2.5 w-2.5 flex-shrink-0 rounded-full', opt.dot)} />
                    <span className="font-semibold text-sm">{opt.label}</span>
                  </div>
                  <p className="mt-0.5 ml-4 text-xs text-muted-foreground">{opt.description}</p>
                </button>
              ))}
            </div>

            <textarea
              placeholder="Optional note — what are you working on? What do you need?"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />

            {error && (
              <div className="flex items-center gap-2 text-xs text-destructive">
                <CircleAlert className="h-3.5 w-3.5" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={!selected || submitting}
              className="w-full"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit check-in'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function CheckinPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <CheckinForm />
    </Suspense>
  )
}
