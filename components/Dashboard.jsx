'use client'

import { useState } from 'react'
import {
  Calendar, CheckSquare, ChevronLeft, ChevronRight,
  ExternalLink, FileText, FolderOpen, LayoutDashboard,
  LogOut, Video,
} from 'lucide-react'
import CalendarView from './CalendarView'
import DraftsView from './DraftsView'
import OverviewPanel from './OverviewPanel'
import RequestsView from './RequestsView'
import TasksView from './TasksView'
import ThemeToggle from './ThemeToggle'
import { Button } from '@/components/ui/button'
import { DRIVE_ROOT, QUICK_LINKS, TEAM_COLORS } from '@/lib/marketing'
import { cn } from '@/lib/utils'

const NAV = [
  { id: 'overview', label: 'Overview',  Icon: LayoutDashboard },
  { id: 'requests', label: 'Requests',  Icon: FileText },
  { id: 'tasks',    label: 'Tasks',     Icon: CheckSquare },
  { id: 'drafts',   label: 'Drafts',    Icon: Video },
  { id: 'calendar', label: 'Calendar',  Icon: Calendar },
]

const SIDEBAR_LINKS = QUICK_LINKS.filter(l => !l.name.includes('Notion'))

function Avatar({ name, size = 'sm', color = 'bg-gray-500' }) {
  const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  const sz = size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-8 w-8 text-xs'
  return (
    <span className={cn('inline-flex items-center justify-center rounded-full font-semibold text-white flex-shrink-0', sz, color)}>
      {initials}
    </span>
  )
}

export default function Dashboard({ session, onSignOut, previewMode = false }) {
  const [activeView, setActiveView]   = useState('overview')
  const [collapsed, setCollapsed]     = useState(false)
  const [driveOpen, setDriveOpen]     = useState(false)
  const activeLabel = NAV.find(n => n.id === activeView)?.label ?? 'Overview'

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className={cn(
        'relative flex flex-col border-r border-border bg-sidebar transition-all duration-200 flex-shrink-0',
        collapsed ? 'w-14' : 'w-56'
      )}>

        {/* Logo */}
        <div className={cn('flex h-14 items-center border-b border-border', collapsed ? 'justify-center px-0' : 'gap-2.5 px-4')}>
          <img src="/logo.png" alt="HackUTD" className="h-7 w-7 flex-shrink-0 rounded-lg object-contain" />
          {!collapsed && <span className="truncate text-sm font-semibold text-sidebar-foreground">Marketing Hub</span>}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute -right-3 top-10 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>

        <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">

          {/* Nav items */}
          {!collapsed && (
            <p className="mb-1 mt-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">Views</p>
          )}
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center rounded-lg transition',
                collapsed ? 'h-9 w-9 justify-center mx-auto' : 'gap-2.5 px-2.5 py-2 w-full',
                activeView === id
                  ? 'bg-accent text-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{label}</span>}
            </button>
          ))}

          {/* Drive */}
          <div className={cn('mt-3', collapsed && 'mt-2')}>
            {!collapsed && (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">Drive</p>
            )}
            <button
              onClick={() => setDriveOpen(o => !o)}
              title={collapsed ? 'Drive folders' : undefined}
              className={cn(
                'flex items-center rounded-lg transition text-sidebar-foreground hover:bg-sidebar-accent',
                collapsed ? 'h-9 w-9 justify-center mx-auto' : 'gap-2.5 px-2.5 py-2 w-full'
              )}
            >
              <FolderOpen className="h-4 w-4 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left text-sm font-medium">Marketing Root</span>
                  {driveOpen
                    ? <ChevronLeft className="h-3.5 w-3.5 text-sidebar-muted rotate-90" />
                    : <ChevronRight className="h-3.5 w-3.5 text-sidebar-muted rotate-90" />}
                </>
              )}
            </button>

            {driveOpen && !collapsed && (
              <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border pl-2.5">
                {DRIVE_ROOT.children.map(folder => {
                  const colors = folder.team ? TEAM_COLORS[folder.team] : { bg: 'bg-gray-100', text: 'text-gray-600' }
                  return (
                    <a
                      key={folder.name}
                      href={folder.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-sidebar-accent"
                    >
                      <span className={cn('flex h-4 w-4 flex-shrink-0 items-center justify-center rounded text-[9px]', colors.bg, colors.text)}>
                        <FolderOpen className="h-2.5 w-2.5" />
                      </span>
                      <span className="truncate text-xs text-sidebar-foreground">{folder.name}</span>
                      <ExternalLink className="ml-auto h-3 w-3 flex-shrink-0 opacity-0 text-sidebar-muted group-hover:opacity-100" />
                    </a>
                  )
                })}
              </div>
            )}
          </div>

          {/* Links */}
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

        {/* User footer */}
        <div className={cn('border-t border-border p-2', collapsed && 'flex justify-center')}>
          {collapsed ? (
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
              title={session?.name ?? session?.email}
            >
              {(session?.email ?? 'U')[0].toUpperCase()}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                {(session?.email ?? 'U')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">
                  {session?.name ?? session?.email}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <ThemeToggle />
                {onSignOut && !previewMode && (
                  <Button variant="ghost" size="icon" onClick={onSignOut} title="Sign out" className="h-7 w-7 rounded-lg">
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 flex-shrink-0 items-center border-b border-border bg-card px-6 gap-2 text-sm">
          <span className="text-muted-foreground">HackUTD</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">{activeLabel}</span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {activeView === 'overview' && <OverviewPanel previewMode={previewMode} />}
          {activeView === 'requests' && <RequestsView />}
          {activeView === 'tasks'    && <TasksView />}
          {activeView === 'drafts'   && <DraftsView />}
          {activeView === 'calendar' && <CalendarView />}
        </main>
      </div>
    </div>
  )
}
