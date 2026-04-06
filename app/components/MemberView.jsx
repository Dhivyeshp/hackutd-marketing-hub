'use client'

import { useEffect, useState } from 'react'
import {
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FolderOpen,
  LayoutDashboard,
  Layers3,
  LogOut,
  Square,
  Video,
} from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { DRIVE_ROOT, QUICK_LINKS, TEAM_COLORS, TEAM_LABELS } from '@/lib/marketing'
import { cn } from '@/lib/utils'
import ContentReelsView from '@/components/ContentReelsView'
import CalendarView from '@/components/CalendarView'
import OrgView from '@/components/OrgView'

const QUICK_ACCESS = {
  design: [
    { label: 'Figma', url: process.env.NEXT_PUBLIC_DESIGN_FIGMA_URL || 'https://figma.com' },
    { label: 'Brand guidelines', url: process.env.NEXT_PUBLIC_DRIVE_BRAND_URL || process.env.NEXT_PUBLIC_DRIVE_ROOT_URL || 'https://drive.google.com' },
    { label: 'Design assets', url: process.env.NEXT_PUBLIC_DRIVE_DESIGN_URL || process.env.NEXT_PUBLIC_DRIVE_ROOT_URL || 'https://drive.google.com' },
    { label: 'Final deliverables', url: process.env.NEXT_PUBLIC_DRIVE_FINALS_URL || process.env.NEXT_PUBLIC_DRIVE_ROOT_URL || 'https://drive.google.com' },
  ],
  uiux: [
    { label: 'Figma', url: process.env.NEXT_PUBLIC_UIUX_FIGMA_URL || 'https://figma.com' },
    { label: 'UI/UX files', url: process.env.NEXT_PUBLIC_DRIVE_UIUX_URL || process.env.NEXT_PUBLIC_DRIVE_ROOT_URL || 'https://drive.google.com' },
    { label: 'Brand guidelines', url: process.env.NEXT_PUBLIC_DRIVE_BRAND_URL || process.env.NEXT_PUBLIC_DRIVE_ROOT_URL || 'https://drive.google.com' },
  ],
  content: [
    { label: 'Notion', url: 'https://www.notion.so/HackUTD-Content-Brewing-Station-30782010b15980ab81bbf599c0c6af04' },
    { label: 'Content / reels', url: process.env.NEXT_PUBLIC_DRIVE_CONTENT_URL || process.env.NEXT_PUBLIC_DRIVE_ROOT_URL || 'https://drive.google.com' },
    { label: 'Brand guidelines', url: process.env.NEXT_PUBLIC_DRIVE_BRAND_URL || process.env.NEXT_PUBLIC_DRIVE_ROOT_URL || 'https://drive.google.com' },
  ],
  outreach: [
    { label: 'Outreach docs', url: process.env.NEXT_PUBLIC_DRIVE_OUTREACH_URL || process.env.NEXT_PUBLIC_DRIVE_ROOT_URL || 'https://drive.google.com' },
    { label: 'Roster sheet', url: 'https://docs.google.com/spreadsheets/d/1WYP6mtncXyEonhJZtBYxj9vqdI7vdR4PEvXcYbxn42Q/edit' },
    { label: 'Brand guidelines', url: process.env.NEXT_PUBLIC_DRIVE_BRAND_URL || process.env.NEXT_PUBLIC_DRIVE_ROOT_URL || 'https://drive.google.com' },
    { label: 'Marketing Drive', url: 'https://drive.google.com/drive/folders/1bI-2T5k91Hu7s-RtdiFXjuqeCxMzi3DD' },
  ],
}

const BASE_NAV = [
  { id: 'home',     label: 'Home',     Icon: LayoutDashboard },
  { id: 'my-tasks', label: 'My Tasks', Icon: CheckSquare },
  { id: 'calendar', label: 'Calendar', Icon: Calendar },
  { id: 'org-view', label: 'Org View', Icon: Layers3 },
]

const CONTENT_NAV = { id: 'reels', label: 'Reels', Icon: Video }

const SIDEBAR_LINKS = QUICK_LINKS


function formatDue(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function TaskRow({ task, onToggle }) {
  const done = task.status === 'complete' || task.status === 'closed'
  const colors = TEAM_COLORS[task.team] ?? TEAM_COLORS.design

  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-accent/50">
      <button
        onClick={() => onToggle(task)}
        className="flex-shrink-0 text-muted-foreground transition hover:text-foreground"
      >
        {done ? <CheckSquare className="h-4 w-4 text-green-500" /> : <Square className="h-4 w-4" />}
      </button>
      <span className={cn('flex-1 truncate text-sm text-foreground', done && 'line-through text-muted-foreground')}>
        {task.title}
      </span>
      <span className={cn('flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', colors.bg, colors.text)}>
        {TEAM_LABELS[task.team] ?? task.team}
      </span>
      {task.due && <span className="flex-shrink-0 text-xs text-muted-foreground">{formatDue(task.due)}</span>}
    </div>
  )
}

function HomePanel({ firstName, user, links, colors, tasks, loading, onToggle, onOpenOrg }) {
  const openTasks = tasks.filter(task => task.status !== 'complete' && task.status !== 'closed')
  const doneTasks = tasks.filter(task => task.status === 'complete' || task.status === 'closed')
  const sortedTasks = [...openTasks, ...doneTasks]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Hey {firstName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your homepage keeps tasks, resources, and the org snapshot in one place.
          </p>
        </div>
        <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', colors.bg, colors.text)}>
          {TEAM_LABELS[user.team] ?? user.team}
        </span>
      </div>

      {links.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Quick access</p>
            <Button variant="outline" size="sm" onClick={onOpenOrg}>
              Org view
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {links.map(link => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl border border-border bg-card px-3.5 py-3 text-sm font-medium text-foreground transition hover:bg-accent"
              >
                <span>{link.label}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            My tasks {openTasks.length > 0 && <span className="ml-1 text-foreground">({openTasks.length})</span>}
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-foreground" />
            </div>
          )}
          {!loading && sortedTasks.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No tasks assigned yet.</p>
          )}
          {!loading && sortedTasks.map(task => (
            <TaskRow key={task.id} task={task} onToggle={onToggle} />
          ))}
        </div>
      </div>
    </div>
  )
}

function MyTasksPanel({ tasks, loading, onToggle }) {
  const openTasks = tasks.filter(task => task.status !== 'complete' && task.status !== 'closed')
  const doneTasks = tasks.filter(task => task.status === 'complete' || task.status === 'closed')
  const sortedTasks = [...openTasks, ...doneTasks]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My Tasks</h1>
        <p className="mt-1 text-sm text-muted-foreground">Everything assigned to you, without leaving the portal.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-foreground" />
          </div>
        )}
        {!loading && sortedTasks.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">No tasks assigned yet.</p>
        )}
        {!loading && sortedTasks.map(task => (
          <TaskRow key={task.id} task={task} onToggle={onToggle} />
        ))}
      </div>
    </div>
  )
}


export default function MemberView({ user, onSignOut }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('home')
  const [collapsed, setCollapsed] = useState(false)
  const [driveOpen, setDriveOpen] = useState(false)

  useEffect(() => {
    if (!user?.userId) return

    fetch(`/api/tasks?user_id=${user.userId}`)
      .then(response => response.json())
      .then(data => {
        if (data?.tasks) setTasks(data.tasks)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user])

  function openView(viewId) {
    setActiveView(viewId)
  }

  async function handleToggle(task) {
    const done = task.status === 'complete' || task.status === 'closed'
    if (done) return

    setTasks(previous => previous.map(item => (item.id === task.id ? { ...item, status: 'complete' } : item)))
    await fetch(`/api/tasks/${task.id}/done`, { method: 'PATCH' })
  }

  const colors = TEAM_COLORS[user.team] ?? TEAM_COLORS.design
  const links = QUICK_ACCESS[user.team] ?? []
  const firstName = user.name?.split(' ')[0] ?? 'there'
  const MEMBER_NAV = user.team === 'content' ? [...BASE_NAV, CONTENT_NAV] : BASE_NAV
  const activeLabel = MEMBER_NAV.find(item => item.id === activeView)?.label ?? 'Home'

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside
        className={cn(
          'relative flex flex-shrink-0 flex-col border-r border-border bg-sidebar transition-all duration-200',
          collapsed ? 'w-14' : 'w-56'
        )}
      >
        <div className={cn('flex h-14 items-center border-b border-border', collapsed ? 'justify-center px-0' : 'gap-2.5 px-4')}>
          <button
            onClick={() => openView('home')}
            className="flex items-center gap-2.5"
            title="Go to member home"
          >
            <img src="/logo.png" alt="HackUTD" className="h-7 w-7 flex-shrink-0 rounded-lg object-contain" />
            {!collapsed && <span className="truncate text-sm font-semibold text-sidebar-foreground">Marketing Hub</span>}
          </button>
        </div>

        <button
          onClick={() => setCollapsed(value => !value)}
          className="absolute -right-3 top-10 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>

        <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
          {!collapsed && (
            <p className="mb-1 mt-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">Views</p>
          )}

          {MEMBER_NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => openView(id)}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center rounded-lg transition',
                collapsed ? 'mx-auto h-9 w-9 justify-center' : 'w-full gap-2.5 px-2.5 py-2',
                activeView === id ? 'bg-accent text-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{label}</span>}
            </button>
          ))}

          <div className={cn('mt-3', collapsed && 'mt-2')}>
            {!collapsed && (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">Drive</p>
            )}
            <button
              onClick={() => setDriveOpen(value => !value)}
              title={collapsed ? 'Drive folders' : undefined}
              className={cn(
                'flex items-center rounded-lg text-sidebar-foreground transition hover:bg-sidebar-accent',
                collapsed ? 'mx-auto h-9 w-9 justify-center' : 'w-full gap-2.5 px-2.5 py-2'
              )}
            >
              <FolderOpen className="h-4 w-4 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left text-sm font-medium">Marketing Root</span>
                  {driveOpen ? (
                    <ChevronLeft className="h-3.5 w-3.5 rotate-90 text-sidebar-muted" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 rotate-90 text-sidebar-muted" />
                  )}
                </>
              )}
            </button>

            {driveOpen && !collapsed && (
              <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border pl-2.5">
                {DRIVE_ROOT.children.map(folder => {
                  const folderColors = folder.team ? TEAM_COLORS[folder.team] : { bg: 'bg-gray-100', text: 'text-gray-600' }

                  return (
                    <a
                      key={folder.name}
                      href={folder.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-sidebar-accent"
                    >
                      <span className={cn('flex h-4 w-4 flex-shrink-0 items-center justify-center rounded text-[9px]', folderColors.bg, folderColors.text)}>
                        <FolderOpen className="h-2.5 w-2.5" />
                      </span>
                      <span className="truncate text-xs text-sidebar-foreground">{folder.name}</span>
                      <ExternalLink className="ml-auto h-3 w-3 flex-shrink-0 text-sidebar-muted opacity-0 group-hover:opacity-100" />
                    </a>
                  )
                })}
              </div>
            )}
          </div>

          {!collapsed && (
            <div className="mt-3">
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">Links</p>
              {SIDEBAR_LINKS.map(link => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground transition hover:bg-sidebar-accent"
                >
                  <span className="truncate text-xs">{link.name}</span>
                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-sidebar-muted group-hover:text-sidebar-foreground" />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className={cn('border-t border-border p-2', collapsed && 'flex justify-center')}>
          {collapsed ? (
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
              title={user?.name ?? user?.email}
            >
              {(user?.email ?? 'U')[0].toUpperCase()}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                {(user?.email ?? 'U')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">{user?.name ?? user?.email}</p>
              </div>
              <div className="flex items-center gap-1">
                <ThemeToggle />
                {onSignOut && (
                  <Button variant="ghost" size="icon" onClick={onSignOut} title="Sign out" className="h-7 w-7 rounded-lg">
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 flex-shrink-0 items-center gap-2 border-b border-border bg-card px-6 text-sm">
          <span className="text-muted-foreground">HackUTD</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">{activeLabel}</span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {activeView === 'home' && (
            <HomePanel
              firstName={firstName}
              user={user}
              links={links}
              colors={colors}
              tasks={tasks}
              loading={loading}
              onToggle={handleToggle}
              onOpenOrg={() => openView('org-view')}
            />
          )}
          {activeView === 'my-tasks' && (
            <MyTasksPanel tasks={tasks} loading={loading} onToggle={handleToggle} />
          )}
          {activeView === 'org-view' && <OrgView />}
          {activeView === 'calendar' && <CalendarView />}
          {activeView === 'reels' && <ContentReelsView />}
        </main>
      </div>
    </div>
  )
}
