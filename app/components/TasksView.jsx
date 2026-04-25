'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, CheckSquare, ExternalLink, Plus, RefreshCw, TriangleAlert, UserPlus, Users, X } from 'lucide-react'
import { createClickUpTask, fetchRoster, fetchTasks } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  countOpenTasks,
  formatDateLabel,
  formatTaskStatus,
  getTeamLabel,
  isTaskClosed,
  TEAM_COLORS,
  TEAM_ORDER,
} from '@/lib/marketing'
import { cn } from '@/lib/utils'

const STATUS_COLORS = {
  'in progress': 'success',
  open: 'secondary',
  'to do': 'secondary',
  complete: 'outline',
  closed: 'outline',
  done: 'outline',
}

const STATUS_FLOW = ['open', 'in progress', 'complete']

const TEAM_MEMBERS = [
  'Dhivyesh Prithiviraj', 'Andrea Alvidres', "Lisa Lupeitu'u", 'Santiago Islas',
  'Jordan Joelson', 'Danish Ejaz', 'Saran Jacob', 'Shiloh Asir',
  'Sristi Srinivasan', 'Ann Jayan', 'Shraddha Subash', 'Karan Jatoth',
]

// Deterministic color per name
const AVATAR_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-teal-500', 'bg-orange-500', 'bg-sky-500',
  'bg-pink-500', 'bg-indigo-500', 'bg-lime-600', 'bg-cyan-600',
]
function avatarColor(name) {
  const i = TEAM_MEMBERS.indexOf(name)
  return AVATAR_COLORS[i >= 0 ? i % AVATAR_COLORS.length : 0]
}
function initials(name) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

function AssigneeStack({ assignees, taskId, onSaved }) {
  const [open, setOpen]           = useState(false)
  const [local, setLocal]         = useState(assignees)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState(null)
  const MAX_VISIBLE = 3

  // keep local in sync if parent refreshes
  const prevAssignees = useRef(assignees)
  if (prevAssignees.current !== assignees) {
    prevAssignees.current = assignees
    setLocal(assignees)
  }

  function toggle(name) {
    setLocal(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name])
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/clickup', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, assignees: local }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed to update')
      }
      onSaved(taskId, local)
      setOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function cancel() {
    setLocal(assignees)
    setError(null)
    setOpen(false)
  }

  const visible  = local.slice(0, MAX_VISIBLE)
  const overflow = local.length - MAX_VISIBLE

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 rounded-lg p-1 transition hover:bg-accent" title="Edit assignees">
          {/* Avatar stack */}
          <div className="flex -space-x-2">
            {visible.map(name => (
              <span
                key={name}
                title={name}
                className={cn(
                  'inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-card',
                  avatarColor(name)
                )}
              >
                {initials(name)}
              </span>
            ))}
            {overflow > 0 && (
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-card">
                +{overflow}
              </span>
            )}
            {local.length === 0 && (
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-border bg-muted text-muted-foreground">
                <UserPlus className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-64 p-3 space-y-3">
        <p className="text-xs font-semibold text-foreground">Assignees</p>

        {/* Member list */}
        <div className="space-y-1 max-h-52 overflow-y-auto">
          {TEAM_MEMBERS.map(name => {
            const selected = local.includes(name)
            return (
              <button
                key={name}
                onClick={() => toggle(name)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs transition',
                  selected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted text-foreground'
                )}
              >
                <span className={cn('inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white', avatarColor(name))}>
                  {initials(name)}
                </span>
                <span className="flex-1 truncate">{name}</span>
                {selected && <Check className="h-3.5 w-3.5 flex-shrink-0 text-primary" />}
              </button>
            )
          })}
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button size="sm" className="flex-1 h-7 text-xs" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={cancel}>
            Cancel
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function TaskDetailDialog({ task, open, onOpenChange, preview, onCycleStatus, onAssigneesUpdated, onTeamChange }) {
  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {preview ? (
              <button onClick={() => onCycleStatus(task.id)} title="Cycle status">
                <Badge variant={STATUS_COLORS[task.status] ?? 'secondary'}>{formatTaskStatus(task.status)}</Badge>
              </button>
            ) : (
              <Badge variant={STATUS_COLORS[task.status] ?? 'secondary'}>{formatTaskStatus(task.status)}</Badge>
            )}
            {task.due && (
              <span className="text-xs text-muted-foreground">
                Due {formatDateLabel(task.due, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Team</p>
            <Select value={task.team} onValueChange={team => onTeamChange(task.id, team)}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEAM_ORDER.map(value => (
                  <SelectItem key={value} value={value} className="text-xs">
                    {getTeamLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assignees</p>
            <AssigneeStack
              assignees={task.assignees ?? []}
              taskId={task.id}
              onSaved={onAssigneesUpdated}
            />
          </div>

          {task.clickupUrl && (
            <a
              href={task.clickupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in ClickUp
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function TaskCard({ task, preview, onCycleStatus, onAssigneesUpdated, onSelect }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onSelect()}
      className="cursor-pointer rounded-2xl border border-border bg-card px-4 py-3 transition hover:border-foreground/20 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
          {task.due && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Due {formatDateLabel(task.due, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Stop propagation so interactive controls don't open the dialog */}
        <div className="flex flex-shrink-0 items-center gap-2" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
          <TeamBadge team={task.team} />

          {preview ? (
            <button onClick={() => onCycleStatus(task.id)} title="Cycle status">
              <Badge variant={STATUS_COLORS[task.status] ?? 'secondary'}>{formatTaskStatus(task.status)}</Badge>
            </button>
          ) : (
            <Badge variant={STATUS_COLORS[task.status] ?? 'secondary'}>{formatTaskStatus(task.status)}</Badge>
          )}

          <AssigneeStack
            assignees={task.assignees ?? []}
            taskId={task.id}
            onSaved={onAssigneesUpdated}
          />

          {task.clickupUrl && (
            <a
              href={task.clickupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition hover:text-foreground"
              title="Open in ClickUp"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function TeamBadge({ team }) {
  const colors = TEAM_COLORS[team] ?? TEAM_COLORS.design

  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', colors.bg, colors.text, colors.border)}>
      {getTeamLabel(team)}
    </span>
  )
}

function AddTaskDialog({ onCreated, onPreview, roster }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [team, setTeam] = useState('design')
  const [assignee, setAssignee] = useState('unassigned')
  const [due, setDue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const teamMembers = roster.filter((member) => member.team === team)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    setError(null)

    try {
      const selectedAssignee = assignee === 'unassigned' ? '' : assignee
      const task = await createClickUpTask({
        title: title.trim(),
        team,
        due: due || null,
        assignee: selectedAssignee,
      })
      onPreview(task.preview)
      onCreated(task)
      setOpen(false)
      setTitle('')
      setTeam('design')
      setAssignee('unassigned')
      setDue('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setAssignee('unassigned')
  }, [team])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a new task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              placeholder="e.g. Finalize logo variants"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Team</Label>
            <Select value={team} onValueChange={setTeam}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEAM_ORDER.map((value) => (
                  <SelectItem key={value} value={value}>
                    {getTeamLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Suggested owner</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="Choose someone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.name}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {teamMembers.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No members found for {getTeamLabel(team)}.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-due">
              Due date <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="task-due"
              type="date"
              value={due}
              onChange={(event) => setDue(event.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <TriangleAlert className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function TasksView() {
  const [tasks, setTasks] = useState([])
  const [roster, setRoster] = useState([])
  const [rosterError, setRosterError] = useState('')
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState(false)
  const [teamFilter, setTeamFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedTask, setSelectedTask] = useState(null)

  async function load(refresh = false) {
    setLoading(true)

    const tasksResponse = await fetchTasks(refresh)
    setTasks(tasksResponse.tasks)
    setPreview(tasksResponse.preview)

    try {
      const rosterResponse = await fetchRoster(refresh)
      setRoster(rosterResponse.members ?? [])
      setRosterError('')
    } catch (error) {
      setRoster([])
      setRosterError(error.message)
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  // Tasks from ClickUp are all internal — external requests live in the Requests view
  const internalTasks = tasks.filter(t => t.source !== 'external')
  const filtered = internalTasks.filter((task) => {
    const teamMatch = teamFilter === 'all' || task.team === teamFilter
    const statusMatch = statusFilter === 'all' || task.status === statusFilter
    return teamMatch && statusMatch
  })

  const allStatuses = [...new Set(internalTasks.map((task) => task.status))].sort()
  const openTaskCount = countOpenTasks(tasks)
  const rosterSummary = roster.reduce((result, member) => {
    const key = member.team || 'unassigned'
    result[key] = (result[key] || 0) + 1
    return result
  }, {})

  function handleCreated(task) {
    setTasks((prev) => [task, ...prev])
  }

  function handleTeamChange(taskId, team) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, team } : t))
    fetch('/api/clickup', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, team }),
    }).catch(() => {})
  }

  function cycleStatus(taskId) {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task
        const currentIndex = STATUS_FLOW.indexOf(task.status)
        const nextStatus = STATUS_FLOW[(currentIndex + 1) % STATUS_FLOW.length]
        return { ...task, status: nextStatus }
      })
    )
  }

  const liveSelectedTask = selectedTask
    ? tasks.find(t => t.id === selectedTask.id) ?? selectedTask
    : null

  return (
    <div className="space-y-5">
      <TaskDetailDialog
        task={liveSelectedTask}
        open={Boolean(selectedTask)}
        onOpenChange={open => !open && setSelectedTask(null)}
        preview={preview}
        onCycleStatus={cycleStatus}
        onAssigneesUpdated={(id, assignees) =>
          setTasks(prev => prev.map(t => t.id === id ? { ...t, assignees } : t))
        }
        onTeamChange={handleTeamChange}
      />
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold text-foreground">Tasks</h2>
              {preview && <Badge variant="outline">Preview data</Badge>}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Filter by team or status, add a new task, and assign owners from the team roster.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => load(true)} disabled={loading} title="Refresh tasks" className="rounded-xl">
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
            <AddTaskDialog onCreated={handleCreated} onPreview={(value) => setPreview(Boolean(value))} roster={roster} />
          </div>
        </div>

        <div className="grid gap-4 border-b border-border px-6 py-5 lg:grid-cols-[1fr,auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Filter tasks</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {['all', ...TEAM_ORDER].map((team) => (
                <button
                  key={team}
                  onClick={() => setTeamFilter(team)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                    teamFilter === team
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {team === 'all' ? 'All teams' : getTeamLabel(team)}
                </button>
              ))}
            </div>
          </div>

          {allStatuses.length > 0 && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {allStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {formatTaskStatus(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="grid gap-4 p-6 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-3">
            {loading && (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-20 animate-pulse rounded-2xl bg-muted" />
                ))}
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
                <CheckSquare className="mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">No tasks found</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {teamFilter !== 'all' || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Add your first task above.'}
                </p>
              </div>
            )}

            {!loading && filtered.length > 0 && filtered.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                preview={preview}
                onCycleStatus={cycleStatus}
                onAssigneesUpdated={(id, assignees) =>
                  setTasks(prev => prev.map(t => t.id === id ? { ...t, assignees } : t))
                }
                onSelect={() => setSelectedTask(task)}
              />
            ))}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-muted/50 p-5">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Roster</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {TEAM_ORDER.map((team) => (
                  <div key={team} className="rounded-2xl border border-border bg-card px-4 py-3">
                    <p className="text-sm text-muted-foreground">{getTeamLabel(team)}</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{rosterSummary[team] ?? 0}</p>
                  </div>
                ))}
              </div>
              {rosterError && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Roster unavailable: {rosterError}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Board summary</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-2xl border border-border bg-card px-4 py-3">
                  <p className="text-sm text-muted-foreground">Total tasks</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{tasks.length}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card px-4 py-3">
                  <p className="text-sm text-muted-foreground">Open tasks</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{openTaskCount}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card px-4 py-3">
                  <p className="text-sm text-muted-foreground">Filtered view</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{filtered.length}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Current mode</p>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <p>Assignee suggestions come from the team roster in Supabase.</p>
                <p>ClickUp tasks currently save the selected person as a suggested owner in the task payload, not as a native ClickUp assignee ID.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
