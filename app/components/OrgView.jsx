'use client'

import { useEffect, useState } from 'react'
import { TEAM_COLORS, TEAM_LABELS } from '@/lib/marketing'
import { cn } from '@/lib/utils'

const TEAM_ORDER = ['design', 'uiux', 'content', 'outreach']

function formatDue(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function InitialsAvatar({ initials, name }) {
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-violet-100 text-violet-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-cyan-100 text-cyan-700',
    'bg-orange-100 text-orange-700',
    'bg-pink-100 text-pink-700',
  ]
  const idx = (name ?? '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length
  return (
    <span
      title={name}
      className={cn('inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold', colors[idx])}
    >
      {initials || '?'}
    </span>
  )
}

export default function OrgView() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/tasks/all')
      .then(r => r.json())
      .then(data => { if (data.tasks) setTasks(data.tasks) })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Org View</h1>
        <p className="mt-1 text-sm text-muted-foreground">A read-only snapshot of what each team is working on.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {TEAM_ORDER.map(team => {
            const teamTasks = tasks.filter(t => t.team === team)
            const teamColors = TEAM_COLORS[team]
            return (
              <div key={team} className="space-y-2">
                <p className={cn('rounded-md px-2 py-1 text-center text-[11px] font-semibold', teamColors.bg, teamColors.text)}>
                  {TEAM_LABELS[team]}
                </p>
                <div className="space-y-1.5">
                  {teamTasks.length === 0 && (
                    <p className="py-2 text-center text-xs text-muted-foreground">—</p>
                  )}
                  {teamTasks.map(task => (
                    <div key={task.id} className="rounded-lg border border-border bg-card px-2.5 py-2.5 text-xs text-foreground space-y-2">
                      <p className="line-clamp-2 font-medium leading-snug">{task.title}</p>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex -space-x-1.5">
                          {task.assignees.map((a, i) => (
                            <InitialsAvatar key={i} initials={a.initials} name={a.name} />
                          ))}
                        </div>
                        {task.due && <span className="text-muted-foreground tabular-nums">{formatDue(task.due)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
