'use client'

import { useState } from 'react'
import {
  Calendar, CheckSquare, ChevronDown, ChevronRight,
  ExternalLink, FileText, FolderOpen, LayoutDashboard,
  LogOut, Video,
} from 'lucide-react'
import CalendarView from './CalendarView'
import DraftsView from './DraftsView'
import OverviewPanel from './OverviewPanel'
import ReelsView from './ReelsView'
import RequestsView from './RequestsView'
import TasksView from './TasksView'
import ThemeToggle from './ThemeToggle'
import { Button } from '@/components/ui/button'
import { DRIVE_ROOT, QUICK_LINKS, TEAM_COLORS } from '@/lib/marketing'
import { cn } from '@/lib/utils'

const NAV = [
  { id: 'overview',  label: 'Overview',  Icon: LayoutDashboard, description: 'Snapshot of the org' },
  { id: 'requests',  label: 'Requests',  Icon: FileText,         description: 'External intake pipeline' },
  { id: 'tasks',     label: 'Tasks',     Icon: CheckSquare,      description: 'Internal task board' },
  { id: 'drafts',    label: 'Drafts',    Icon: Video,            description: 'Notion content pipeline' },
  { id: 'calendar',  label: 'Calendar',  Icon: Calendar,         description: 'Due dates by month' },
]

// Sidebar links — Notion excluded here; it appears only inside DraftsView
const SIDEBAR_LINKS = QUICK_LINKS.filter(l => !l.name.includes('Notion'))

function DriveSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-sidebar-accent"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
          <FolderOpen className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-sm font-medium text-sidebar-foreground">Marketing Root</p>
          <p className="mt-0.5 text-xs text-sidebar-muted">All shared folders</p>
        </div>
        {open
          ? <ChevronDown className="h-4 w-4 text-sidebar-muted" />
          : <ChevronRight className="h-4 w-4 text-sidebar-muted" />}
      </button>

      {open && (
        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-border pl-3">
          {DRIVE_ROOT.children.map(folder => {
            const colors = folder.team ? TEAM_COLORS[folder.team] : { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' }
            return (
              <a
                key={folder.name}
                href={folder.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition hover:bg-sidebar-accent"
              >
                <span className={cn('inline-flex h-5 w-5 items-center justify-center rounded text-[10px]', colors.bg, colors.text)}>
                  <FolderOpen className="h-3 w-3" />
                </span>
                <span className="truncate text-sm text-sidebar-foreground">{folder.name}</span>
                <ExternalLink className="ml-auto h-3 w-3 flex-shrink-0 opacity-0 text-sidebar-muted transition group-hover:opacity-100" />
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Dashboard({ session, onSignOut, previewMode = false }) {
  const [activeView, setActiveView] = useState('overview')
  const activeLabel = NAV.find(n => n.id === activeView)?.label ?? 'Overview'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">

        {/* Sidebar */}
        <aside className="border-b border-border bg-sidebar lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:flex-shrink-0 lg:border-b-0 lg:border-r">
          {/* Logo */}
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">H</div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-sidebar-foreground">HackUTD Marketing Hub</p>
                  <p className="truncate text-xs text-sidebar-muted">Design · UI/UX · Outreach · Content</p>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </div>

          <div className="grid gap-5 p-4 lg:h-[calc(100vh-73px)] lg:grid-rows-[auto,1fr,auto] lg:overflow-y-auto">
            {/* Nav */}
            <div>
              <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-[0.18em] text-sidebar-muted">Views</p>
              <div className="grid gap-1">
                {NAV.map(({ id, label, Icon, description }) => (
                  <button
                    key={id}
                    onClick={() => setActiveView(id)}
                    className={cn(
                      'rounded-xl border px-3 py-2.5 text-left transition',
                      activeView === id
                        ? 'border-border bg-accent text-accent-foreground'
                        : 'border-transparent text-sidebar-foreground hover:bg-sidebar-accent'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{label}</p>
                        <p className="mt-0.5 text-xs text-sidebar-muted">{description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Drive + Links */}
            <div className="space-y-5 overflow-y-auto">
              <div>
                <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-[0.18em] text-sidebar-muted">Drive</p>
                <DriveSidebar />
              </div>
              <div>
                <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-[0.18em] text-sidebar-muted">Links</p>
                <div className="grid gap-1">
                  {SIDEBAR_LINKS.map(link => (
                    <a
                      key={link.name}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground transition hover:bg-sidebar-accent"
                    >
                      <span className="truncate">{link.name}</span>
                      <ExternalLink className="h-4 w-4 text-sidebar-muted transition group-hover:text-sidebar-foreground" />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* User footer */}
            <div className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center gap-3">
                {session?.user?.user_metadata?.avatar_url ? (
                  <img src={session.user.user_metadata.avatar_url} alt="avatar" className="h-10 w-10 rounded-xl" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-sm font-semibold text-secondary-foreground">
                    {session?.user?.email?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {session?.user?.user_metadata?.full_name ?? session?.user?.email}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{session?.user?.email}</p>
                </div>
                {onSignOut && !previewMode && (
                  <Button variant="ghost" size="icon" onClick={onSignOut} title="Sign out" className="h-8 w-8 rounded-lg">
                    <LogOut className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-14 items-center border-b border-border bg-card px-6 gap-2 text-sm text-muted-foreground">
            <span className="text-muted-foreground">HackUTD</span>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-foreground">{activeLabel}</span>
          </header>

          <div className="flex-1 overflow-y-auto p-6">
            {activeView === 'overview'  && <OverviewPanel previewMode={previewMode} />}
            {activeView === 'requests'  && <RequestsView />}
            {activeView === 'tasks'     && <TasksView />}
            {activeView === 'drafts'    && <DraftsView />}
            {activeView === 'calendar'  && <CalendarView />}
          </div>
        </main>
      </div>
    </div>
  )
}
