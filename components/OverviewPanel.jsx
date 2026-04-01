'use client'

import { useEffect, useState } from 'react'
import { ArrowUpRight, CalendarClock, ExternalLink, Layers3, RefreshCw, TriangleAlert, Video } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fetchReels, fetchTasks } from '@/lib/api'
import {
  countAwaitingApproval,
  countOpenTasks,
  countTasksByTeamSplit,
  formatDateLabel,
  getDueThisWeekCount,
  getTeamLabel,
  getUpcomingTasks,
  isPendingReel,
  QUICK_LINKS,
  TEAM_COLORS,
  TEAM_ORDER,
  cloneRequests,
} from '@/lib/marketing'
import { cn } from '@/lib/utils'

export default function OverviewPanel({ previewMode = false }) {
  const [tasks, setTasks]       = useState([])
  const [reels, setReels]       = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(true)

  async function load() {
    setLoading(true)
    const [tasksRes, reelsRes] = await Promise.all([fetchTasks(), fetchReels()])
    setTasks(tasksRes.tasks)
    setReels(reelsRes.reels)

    try {
      const sheetsRes = await fetch('/api/sheets')
      const data = await sheetsRes.json()
      // Map sheet rows to simple request objects for counting
      setRequests((data.data ?? []).map((r, i) => ({
        id: `req-${i}`,
        team: guessTeam(r),
        status: 'Submitted',
      })))
    } catch {
      setRequests(cloneRequests())
    }

    setLoading(false)
  }

  useEffect(() => { load() }, [previewMode])

  const openTasks      = countOpenTasks(tasks)
  const pendingReels   = reels.filter(r => isPendingReel(r.status)).length
  const dueThisWeek    = getDueThisWeekCount(tasks)
  const awaitingApproval = countAwaitingApproval(requests)
  const teamSplit      = countTasksByTeamSplit(tasks, requests)
  const upcomingTasks  = getUpcomingTasks(tasks, 5)
  const pendingIdeas   = reels.filter(r => isPendingReel(r.status)).slice(0, 5)

  const KPI = [
    { label: 'Open tasks',        value: openTasks,        Icon: Layers3,        variant: 'default' },
    { label: 'Pending reels',     value: pendingReels,     Icon: Video,          variant: 'default' },
    { label: 'Due this week',     value: dueThisWeek,      Icon: CalendarClock,  variant: 'default' },
    { label: 'Awaiting approval', value: awaitingApproval, Icon: TriangleAlert,  variant: 'warning' },
  ]

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-5 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Overview</h2>
            <p className="mt-1 text-sm text-muted-foreground">Live snapshot of team workload, deadlines, and approvals.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Button asChild>
              <a href={QUICK_LINKS[1].url} target="_blank" rel="noopener noreferrer">
                Open ClickUp <ArrowUpRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        {/* 4 KPI cards */}
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {KPI.map(({ label, value, Icon, variant }) => (
            <div key={label} className={cn(
              'rounded-xl border px-4 py-4',
              variant === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-border bg-card'
            )}>
              <div className="flex items-center justify-between">
                <p className={cn('text-sm font-medium', variant === 'warning' ? 'text-amber-800' : 'text-foreground')}>{label}</p>
                <Icon className={cn('h-4 w-4', variant === 'warning' ? 'text-amber-500' : 'text-muted-foreground')} />
              </div>
              <p className={cn('mt-4 text-3xl font-semibold tracking-tight', variant === 'warning' ? 'text-amber-900' : 'text-foreground')}>
                {loading ? '—' : value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Team split: external vs internal */}
      <section className="grid gap-5 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">Open work by team</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">External requests · Internal tasks</p>
            </div>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <span className="rounded-lg border border-border bg-muted px-3 py-1.5 text-center">External requests</span>
            <span className="rounded-lg border border-border bg-muted px-3 py-1.5 text-center">Internal tasks</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {TEAM_ORDER.map(team => {
              const colors = TEAM_COLORS[team]
              const split  = teamSplit[team] ?? { internal: 0, external: 0 }
              return (
                <div key={team} className={cn('rounded-xl border px-4 py-4', colors.bg, colors.border)}>
                  <p className={cn('text-sm font-semibold', colors.text)}>{getTeamLabel(team)}</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                    {loading ? '—' : split.external + split.internal}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {loading ? '' : `${split.external} external · ${split.internal} internal`}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Upcoming deadlines */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Upcoming deadlines</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">Closest due dates from the task board.</p>
            </div>
            <Badge variant="outline">Next 5</Badge>
          </div>

          <div className="mt-4 space-y-2">
            {!loading && upcomingTasks.length === 0 && (
              <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                No upcoming deadlines yet.
              </div>
            )}
            {loading && [1,2,3].map(i => <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />)}
            {!loading && upcomingTasks.map(task => {
              const colors = TEAM_COLORS[task.team] ?? TEAM_COLORS.design
              return (
                <div key={task.id} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
                  <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', colors.dot)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {getTeamLabel(task.team)} · {formatDateLabel(task.due, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pending reel approvals + quick links */}
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Pending reel approvals</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">Ideas waiting to move from Notion into production.</p>
            </div>
            <Badge variant={pendingIdeas.length > 0 ? 'warning' : 'secondary'}>{pendingIdeas.length}</Badge>
          </div>
          <div className="mt-4 space-y-2">
            {!loading && pendingIdeas.length === 0 && (
              <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">No pending ideas right now.</div>
            )}
            {loading && [1,2].map(i => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />)}
            {!loading && pendingIdeas.map(reel => (
              <div key={reel.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{reel.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Filmer: {reel.filmer || 'TBD'} · Story: {reel.story || 'TBD'}</p>
                </div>
                <Badge variant="outline">{reel.type || 'Idea'}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Quick links</h3>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 grid gap-1">
            {QUICK_LINKS.map(link => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-foreground transition hover:bg-accent"
              >
                <span>{link.name}</span>
                <ExternalLink className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function guessTeam(row) {
  const all = Object.values(row).join(' ').toLowerCase()
  if (all.includes('design') || all.includes('logo') || all.includes('graphic')) return 'design'
  if (all.includes('ui') || all.includes('ux') || all.includes('figma')) return 'uiux'
  if (all.includes('outreach') || all.includes('email') || all.includes('sponsor')) return 'outreach'
  return 'content'
}
