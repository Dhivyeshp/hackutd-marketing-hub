export const TEAM_COLORS = {
  design:   { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', dot: 'bg-orange-400' },
  uiux:     { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-200',   dot: 'bg-blue-400' },
  outreach: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-400' },
  content:  { bg: 'bg-amber-100',  text: 'text-amber-800',  border: 'border-amber-200',  dot: 'bg-amber-400' },
}

export const TEAM_LABELS = {
  design: 'Design', uiux: 'UI/UX', outreach: 'Outreach', content: 'Content',
}

export const TEAM_ORDER = ['design', 'uiux', 'outreach', 'content']

// Marketing Root with collapsible subfolders
export const DRIVE_ROOT = {
  name: 'Marketing Root',
  url: 'https://drive.google.com/drive/folders/1bI-2T5k91Hu7s-RtdiFXjuqeCxMzi3DD',
  children: [
    { name: 'Design assets',       url: 'https://drive.google.com/drive/folders/1bI-2T5k91Hu7s-RtdiFXjuqeCxMzi3DD', team: 'design' },
    { name: 'Content / reels',     url: 'https://drive.google.com/drive/folders/1bI-2T5k91Hu7s-RtdiFXjuqeCxMzi3DD', team: 'content' },
    { name: 'Outreach docs',       url: 'https://drive.google.com/drive/folders/1bI-2T5k91Hu7s-RtdiFXjuqeCxMzi3DD', team: 'outreach' },
    { name: 'Brand guidelines',    url: 'https://drive.google.com/drive/folders/1bI-2T5k91Hu7s-RtdiFXjuqeCxMzi3DD', team: 'design' },
    { name: 'Final deliverables',  url: 'https://drive.google.com/drive/folders/1bI-2T5k91Hu7s-RtdiFXjuqeCxMzi3DD', team: null },
  ],
}

export const QUICK_LINKS = [
  { name: 'Notion Brewing Station', url: 'https://www.notion.so/HackUTD-Content-Brewing-Station-30782010b15980ab81bbf599c0c6af04' },
  { name: 'ClickUp Marketing List', url: 'https://app.clickup.com/9017827536/v/l/6-901710727679-1' },
  { name: 'Team Roster Sheet',      url: 'https://docs.google.com/spreadsheets/d/1WYP6mtncXyEonhJZtBYxj9vqdI7vdR4PEvXcYbxn42Q/edit' },
]

export const MOCK_SESSION = {
  user: {
    email: 'preview@hackutd.com',
    user_metadata: { full_name: 'HackUTD Preview', avatar_url: null },
  },
}

export const MOCK_TASKS = [
  { id: 'preview-task-1', title: 'Finalize sponsor reel cover frames', team: 'design',   due: '2026-04-02', status: 'in progress', source: 'internal', clickupUrl: QUICK_LINKS[1].url },
  { id: 'preview-task-2', title: 'Ship mobile nav pass for landing page', team: 'uiux',  due: '2026-04-04', status: 'open',        source: 'internal', clickupUrl: QUICK_LINKS[1].url },
  { id: 'preview-task-3', title: 'Confirm alumni outreach email copy', team: 'outreach', due: '2026-04-05', status: 'open',        source: 'internal', clickupUrl: QUICK_LINKS[1].url },
  { id: 'preview-task-4', title: 'Film Running Late b-roll pickup', team: 'content',     due: '2026-04-06', status: 'open',        source: 'internal', clickupUrl: QUICK_LINKS[1].url },
  { id: 'preview-task-5', title: 'Refresh brand lockup exports', team: 'design',         due: '2026-04-08', status: 'complete',    source: 'internal', clickupUrl: QUICK_LINKS[1].url },
  { id: 'preview-task-6', title: 'Draft volunteer onboarding storyboards', team: 'content', due: '2026-04-10', status: 'in progress', source: 'internal', clickupUrl: QUICK_LINKS[1].url },
]

export const MOCK_REELS = [
  { id: 'preview-reel-1', title: 'Running Late',              filmer: 'Karan', story: 'Andie',  type: 'Emotional', status: 'Idea',        notionUrl: QUICK_LINKS[0].url },
  { id: 'preview-reel-2', title: 'Why HackUTD Volunteers Stay', filmer: 'Mira', story: 'Sanjay', type: 'Info',      status: 'Idea',        notionUrl: QUICK_LINKS[0].url },
  { id: 'preview-reel-3', title: 'Build Night Chaos',          filmer: 'Luis', story: 'Jaden',  type: 'Funny',     status: 'In Progress', notionUrl: QUICK_LINKS[0].url },
  { id: 'preview-reel-4', title: 'Sponsor Thank You Loop',     filmer: 'Priya', story: 'Ava',   type: 'Hype',      status: 'Done',        notionUrl: QUICK_LINKS[0].url },
]

export const MOCK_REQUESTS = [
  { id: 'req-1', requester: 'Liana Forster', team: 'content', type: 'Post',       details: 'Promote the React Workshop', due: '2026-04-05', status: 'Submitted',  timestamp: '3/12/2026' },
  { id: 'req-2', requester: 'James Cho',     team: 'design',  type: 'Graphic',    details: 'Sponsor thank you card',      due: '2026-04-10', status: 'In Review',  timestamp: '3/14/2026' },
  { id: 'req-3', requester: 'Sara Kim',      team: 'outreach', type: 'Email',     details: 'Volunteer recruitment blast', due: '2026-04-12', status: 'Approved',   timestamp: '3/15/2026' },
  { id: 'req-4', requester: 'Dev Patel',     team: 'uiux',    type: 'UI Review',  details: 'Accessibility audit on landing page', due: '2026-04-15', status: 'In ClickUp', timestamp: '3/16/2026' },
]

function parseIsoDate(dateString) {
  if (!dateString) return null
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function cloneTasks(tasks = MOCK_TASKS)     { return tasks.map(t => ({ ...t })) }
export function cloneReels(reels = MOCK_REELS)     { return reels.map(r => ({ ...r })) }
export function cloneRequests(reqs = MOCK_REQUESTS){ return reqs.map(r => ({ ...r })) }

export function getTeamLabel(team) { return TEAM_LABELS[team] ?? team }

export function formatTaskStatus(status = 'open') {
  return status.split(/[\s_-]+/).filter(Boolean).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
}

export function isTaskClosed(status = '') {
  const n = status.toLowerCase()
  return n === 'complete' || n === 'closed' || n === 'done'
}

export function isPendingReel(status = '') {
  const n = (status || '').toLowerCase().trim()
  return n === 'idea' || n === 'pending' || n === 'ready for review'
}

export function countOpenTasks(tasks = []) {
  return tasks.filter(t => !isTaskClosed(t.status)).length
}

export function countTasksByTeam(tasks = []) {
  return TEAM_ORDER.reduce((acc, team) => {
    acc[team] = tasks.filter(t => t.team === team && !isTaskClosed(t.status)).length
    return acc
  }, {})
}

/** Returns { design: { internal: N, external: N }, ... } */
export function countTasksByTeamSplit(tasks = [], requests = []) {
  return TEAM_ORDER.reduce((acc, team) => {
    const externalCount = requests.filter(r => {
      const requestTeam = (r.team || '').toLowerCase()
      const status = (r.boardStatus || r.status || '').toString().toLowerCase().replace(/\s+/g, '_')
      return requestTeam === team && status !== 'in_clickup'
    }).length

    acc[team] = {
      internal: tasks.filter(t => t.team === team && !isTaskClosed(t.status)).length,
      external: externalCount,
    }
    return acc
  }, {})
}

export function countAwaitingApproval(requests = []) {
  return requests.filter(r => {
    const status = (r.boardStatus || r.status || '').toString().toLowerCase().replace(/\s+/g, '_')
    return status === 'submitted' || status === 'in_review'
  }).length
}

export function getDueThisWeekCount(tasks = [], now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start); end.setDate(end.getDate() + 7)
  return tasks.filter(t => {
    if (!t.due || isTaskClosed(t.status)) return false
    const d = parseIsoDate(t.due)
    return d >= start && d <= end
  }).length
}

export function getUpcomingTasks(tasks = [], limit = 4) {
  return [...tasks].filter(t => t.due && !isTaskClosed(t.status)).sort((a, b) => a.due.localeCompare(b.due)).slice(0, limit)
}

export function formatDateLabel(dateString, options = { month: 'short', day: 'numeric' }) {
  const parsed = parseIsoDate(dateString)
  if (!parsed) return ''
  return new Intl.DateTimeFormat('en-US', options).format(parsed)
}
