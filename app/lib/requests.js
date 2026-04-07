import { cloneRequests } from '@/lib/marketing'

export const REQUEST_COLUMNS = ['submitted', 'in_review', 'approved', 'in_clickup']

export const DEFAULT_REQUEST_ASSIGNEES = {
  design: [
    { id: 'fallback-design-ann', name: 'Ann Jayan', team: 'design', role: 'member', clickupUserId: null },
    { id: 'fallback-design-shiloh', name: 'Shiloh Asir', team: 'design', role: 'member', clickupUserId: null },
    { id: 'fallback-design-saran', name: 'Saran Jacob', team: 'design', role: 'member', clickupUserId: null },
    { id: 'fallback-design-lisa', name: "Lisa Lupeitu'u", team: 'design', role: 'member', clickupUserId: null },
    { id: 'fallback-design-santiago', name: 'Santiago Islas', team: 'design', role: 'member', clickupUserId: null },
  ],
  uiux: [
    { id: 'fallback-uiux-dhivyesh', name: 'Dhivyesh Prithiviraj', team: 'uiux', role: 'member', clickupUserId: null },
    { id: 'fallback-uiux-jordan', name: 'Jordan Joelson', team: 'uiux', role: 'member', clickupUserId: null },
  ],
  content: [
    { id: 'fallback-content-karan', name: 'Karan Jatoth', team: 'content', role: 'member', clickupUserId: null },
    { id: 'fallback-content-sristi', name: 'Sristi Srinivasan', team: 'content', role: 'member', clickupUserId: null },
    { id: 'fallback-content-danish', name: 'Danish Ejaz', team: 'content', role: 'member', clickupUserId: null },
    { id: 'fallback-content-andie', name: 'Andrea Alvidres', team: 'content', role: 'member', clickupUserId: null },
  ],
  outreach: [
    { id: 'fallback-outreach-shraddha', name: 'Shraddha Subash', team: 'outreach', role: 'member', clickupUserId: null },
  ],
}

const REQUEST_SHEET_TITLE = 'Hack Marketing Request From (Responses)'

export function getDefaultAssignableUsers(team) {
  if (team) {
    return DEFAULT_REQUEST_ASSIGNEES[normalizeTeam(team)] ?? []
  }

  return Object.values(DEFAULT_REQUEST_ASSIGNEES).flat()
}

export function normalizeTeam(team = '') {
  const value = team.toString().trim().toLowerCase()
  if (value === 'ui/ux') return 'uiux'
  return value
}

export function normalizeRequestStatus(status = 'submitted') {
  const value = status.toString().trim().toLowerCase().replace(/\s+/g, '_')

  if (!value) return 'submitted'
  if (value === 'in_clickup' || value === 'clickup') return 'approved'
  if (value === 'review') return 'in_review'
  if (value === 'reconsider') return 'submitted'

  return value
}

export function getRequestBoardStatus(request = {}) {
  if (request.clickupTaskId || request.clickup_task_id) return 'in_clickup'
  const status = normalizeRequestStatus(request.status)
  // Deferred cards stay visible in the Submitted column (rendered at the bottom)
  if (status === 'deferred') return 'submitted'
  return status
}

export function buildRequestTaskTitle(request = {}) {
  const type = (request.type || 'Task').trim()
  const description = (request.description || request.details || '').replace(/\s+/g, ' ').trim()
  const fromOrg = (request.fromOrg || request.from_org || '').trim() || 'HackUTD'
  const preview = description ? description.slice(0, 60) : 'Follow-up needed'

  return `${type} — ${preview} · ${fromOrg}`
}

export function parseSheetDate(raw) {
  if (!raw) return null

  const datePart = raw.toString().split(' ')[0]
  const parts = datePart.split('/')
  if (parts.length !== 3) return null

  const [month, day, year] = parts
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

export function guessTeamFromRow(row = {}) {
  const haystack = Object.values(row).join(' ').toLowerCase()

  if (haystack.includes('design') || haystack.includes('logo') || haystack.includes('graphic')) return 'design'
  if (haystack.includes('ui') || haystack.includes('ux') || haystack.includes('figma')) return 'uiux'
  if (haystack.includes('outreach') || haystack.includes('email') || haystack.includes('sponsor')) return 'outreach'
  if (haystack.includes('content') || haystack.includes('post') || haystack.includes('reel') || haystack.includes('video')) return 'content'

  return 'design'
}

function findCol(row, ...names) {
  const keys = Object.keys(row)
  for (const name of names) {
    const key = keys.find(k => k.trim().toLowerCase() === name.toLowerCase())
    if (key !== undefined && row[key] !== '') return row[key]
  }
  return ''
}

export function mapSheetRowsToRequests(rows = []) {
  return rows.map((row, index) =>
    formatRequestRecord({
      id: row.id || `sheet-request-${index}`,
      from_name: row['Name'] ?? row[Object.keys(row)[1]] ?? 'Unknown requester',
      from_org: row['Organization'] ?? row['Org'] ?? row['From org'] ?? '',
      type: row['What do you need?'] ?? row['Type'] ?? 'Request',
      description:
        row["Details (be super specific. We will only do exactly what's written on here <3)"] ??
        row['Details'] ??
        row['Description'] ??
        '',
      due_requested: parseSheetDate(row['When do you need it by?'] ?? row['Due requested'] ?? ''),
      team: findCol(row, 'Team') || guessTeamFromRow(row),
      status: 'submitted',
      assigneeName: findCol(row, 'Assignee', 'Assigned To', 'Assigned', 'Assignee Name'),
      created_at: row['Timestamp'] ?? '',
    })
  )
}

export function formatRequestRecord(record = {}) {
  const status = normalizeRequestStatus(record.status)
  const team = normalizeTeam(record.team) || 'design'

  const assignedToUserIds = Array.isArray(record.assignedToUserIds)
    ? record.assignedToUserIds
    : (record.assigned_to ?? record.assignedToUserId)
      ? [record.assigned_to ?? record.assignedToUserId].filter(Boolean)
      : []

  return {
    id: record.id,
    requester: record.from_name ?? record.requester ?? 'Unknown requester',
    fromOrg: record.from_org ?? record.fromOrg ?? '',
    type: record.type ?? 'Request',
    description: record.description ?? record.details ?? '',
    due: record.due_requested ?? record.due ?? null,
    team,
    status,
    boardStatus: record.clickup_task_id || record.clickupTaskId ? 'in_clickup' : status,
    assignedToUserIds,
    assigneeName: record.assigneeName ?? '',
    clickupTaskId: record.clickup_task_id ?? record.clickupTaskId ?? null,
    timestamp: record.created_at ?? record.timestamp ?? '',
  }
}

export function getPreviewRequests() {
  return cloneRequests().map(formatRequestRecord)
}

export function getRequestSheetTitle() {
  return REQUEST_SHEET_TITLE
}
