'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { fetchTasks } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateLabel, getTeamLabel, TEAM_COLORS } from '@/lib/marketing'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay()
}

export default function CalendarView() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [tasks, setTasks] = useState([])
  const [preview, setPreview] = useState(false)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const response = await fetchTasks()
    setTasks(response.tasks.filter((task) => task.due))
    setPreview(response.preview)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function prevMonth() {
    if (month === 0) {
      setMonth(11)
      setYear((value) => value - 1)
      return
    }

    setMonth((value) => value - 1)
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0)
      setYear((value) => value + 1)
      return
    }

    setMonth((value) => value + 1)
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const taskMap = {}

  for (const task of tasks) {
    if (!taskMap[task.due]) taskMap[task.due] = []
    taskMap[task.due].push(task)
  }

  function isoDate(day) {
    const mm = String(month + 1).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    return `${year}-${mm}-${dd}`
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthTasks = tasks
    .filter((task) => task.due?.startsWith(monthPrefix))
    .sort((left, right) => left.due.localeCompare(right.due))
  const teamsThisMonth = [...new Set(monthTasks.map((task) => task.team))]

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold text-foreground">Calendar</h2>
              {preview && <Badge variant="outline">Preview data</Badge>}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Monthly view of ClickUp deadlines with team colors carried through the board.
            </p>
          </div>

          <Button variant="outline" size="icon" onClick={load} disabled={loading} title="Refresh calendar" className="rounded-xl">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>

        <div className="grid gap-6 p-6 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-xl">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h3 className="text-base font-semibold text-foreground">
                {monthNames[month]} {year}
              </h3>
              <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-xl">
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid grid-cols-7 border-b border-border">
              {WEEKDAYS.map((dayName) => (
                <div key={dayName} className="py-2 text-center text-xs font-semibold text-muted-foreground">
                  {dayName}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {Array.from({ length: firstDay }).map((_, index) => (
                <div key={`empty-${index}`} className="min-h-[110px] border-b border-r border-border bg-muted/40" />
              ))}

              {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
                const iso = isoDate(day)
                const dayTasks = taskMap[iso] ?? []
                const isToday =
                  today.getFullYear() === year &&
                  today.getMonth() === month &&
                  today.getDate() === day

                return (
                  <div
                    key={day}
                    className={cn('min-h-[110px] border-b border-r border-border p-2', isToday && 'bg-accent/60')}
                  >
                    <span
                      className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium',
                        isToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {day}
                    </span>

                    {!loading && (
                      <div className="mt-1.5 space-y-1">
                        {dayTasks.slice(0, 3).map((task) => {
                          const colors = TEAM_COLORS[task.team] ?? TEAM_COLORS.design

                          return (
                            <div
                              key={task.id}
                              className={cn('rounded-lg px-1.5 py-1', colors.bg)}
                              title={task.title}
                            >
                              <div className="flex items-center gap-1">
                                <span className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', colors.dot)} />
                                <span className={cn('truncate text-[10px] font-medium leading-tight', colors.text)}>
                                  {task.title}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                        {dayTasks.length > 3 && (
                          <p className="px-1 text-[10px] text-muted-foreground">+{dayTasks.length - 3} more</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-muted/50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Month summary</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-2xl border border-border bg-card px-4 py-3">
                  <p className="text-sm text-muted-foreground">Scheduled tasks</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{monthTasks.length}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card px-4 py-3">
                  <p className="text-sm text-muted-foreground">Teams active</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{teamsThisMonth.length}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card px-4 py-3">
                  <p className="text-sm text-muted-foreground">Mode</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {preview ? 'Frontend preview' : 'Connected board'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Deadlines this month</p>
              <div className="mt-4 space-y-3">
                {monthTasks.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    Nothing scheduled for this month yet.
                  </div>
                )}

                {monthTasks.map((task) => {
                  const colors = TEAM_COLORS[task.team] ?? TEAM_COLORS.design

                  return (
                    <div key={task.id} className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
                      <span className={cn('h-2.5 w-2.5 rounded-full', colors.dot)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {getTeamLabel(task.team)} / {formatDateLabel(task.due, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {teamsThisMonth.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Team legend</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {teamsThisMonth.map((team) => {
                    const colors = TEAM_COLORS[team] ?? TEAM_COLORS.design

                    return (
                      <div key={team} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={cn('h-2.5 w-2.5 rounded-full', colors.dot)} />
                        {getTeamLabel(team)}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  )
}
