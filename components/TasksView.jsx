'use client'

import { useEffect, useState } from 'react'
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

function TaskCard({ task, preview, onCycleStatus, onAssigneesUpdated }) {
  const [editing, setEditing]   = useState(false)
  const [localAssignees, setLocalAssignees] = useState(task.assignees ?? [])
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState(null)

  const unselected = TEAM_MEMBERS.filter(m => !localAssignees.includes(m))

  function toggle(name) {
    setLocalAssignees(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    )
  }

  async function save() {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/clickup', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, assignees: localAssignees }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed to update')
      }
      onAssigneesUpdated(task.id, localAssignees)
      setEditing(false)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function cancel() {
    setLocalAssignees(task.assignees ?? [])
    setSaveError(null)
    setEditing(false)
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 transition hover:bg-accent/40">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
            {task.due && (
              <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                Due {formatDateLabel(task.due, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>

          {/* Assignees row */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {localAssignees.length > 0
              ? localAssignees.map(a => (
                  <span key={a} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                    {a}
                    {editing && (
                      <button onClick={() => toggle(a)} className="ml-0.5 rounded-full hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))
              : !editing && <span className="text-xs text-muted-foreground">No assignees</span>
            }
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground transition hover:border-foreground hover:text-foreground"
              >
                <UserPlus className="h-3 w-3" /> Edit
              </button>
            )}
          </div>

          {/* Assignee picker */}
          {editing && (
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {unselected.map(name => (
                  <button
                    key={name}
                    onClick={() => toggle(name)}
                    className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-foreground hover:text-foreground"
                  >
                    + {name}
                  </button>
                ))}
              </div>
              {saveError && <p className="text-xs text-destructive">{saveError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  <Check className="h-3 w-3" />
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={cancel} className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-accent">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TeamBadge team={task.team} />
          {preview ? (
            <button onClick={() => onCycleStatus(task.id)} className="rounded-full" title="Cycle status">
              <Badge variant={STATUS_COLORS[task.status] ?? 'secondary'}>{formatTaskStatus(task.status)}</Badge>
            </button>
          ) : (
            <Badge variant={STATUS_COLORS[task.status] ?? 'secondary'}>{formatTaskStatus(task.status)}</Badge>
          )}
          {task.clickupUrl && (
            <a href={task.clickupUrl} target="_blank" rel="noopener noreferrer"
              className="rounded-full p-2 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
              title="Open in ClickUp">
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
                No roster members found for {getTeamLabel(team)} in the connected Google Sheet.
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

  async function load() {
    setLoading(true)

    const tasksResponse = await fetchTasks()
    setTasks(tasksResponse.tasks)
    setPreview(tasksResponse.preview)

    try {
      const rosterResponse = await fetchRoster()
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

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold text-foreground">Tasks</h2>
              {preview && <Badge variant="outline">Preview data</Badge>}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Filter by team or status, add a new task, and suggest owners from the Google Sheets roster.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={load} disabled={loading} title="Refresh tasks" className="rounded-xl">
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
                <p>Sheet-driven assignee suggestions come from the connected Google Sheet tab.</p>
                <p>ClickUp tasks currently save the selected person as a suggested owner in the task payload, not as a native ClickUp assignee ID.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
