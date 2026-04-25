import { getSession } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-server'
import { invalidate } from '@/lib/cache'
import { buildRequestTaskTitle, formatRequestRecord } from '@/lib/requests'


function hasSupabaseAdminEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

function hasClickUpEnv() {
  return Boolean(process.env.CLICKUP_API_KEY && process.env.CLICKUP_LIST_ID)
}

function toClickUpDescription(request) {
  const description = (request.description ?? '').trim()
  const requester = request.requester ?? request.from_name ?? 'Unknown requester'
  const fromOrg = request.fromOrg ?? request.from_org ?? 'Unknown org'

  return `${description}\n\nRequested by: ${requester} (${fromOrg})`.trim()
}

async function createClickUpTask({ request, assignees }) {
  if (!hasClickUpEnv()) {
    return {
      id: `preview-request-${Date.now()}`,
      preview: true,
    }
  }

  const payload = {
    name: buildRequestTaskTitle(request),
    description: toClickUpDescription(request),
    tags: [request.team],
  }

  if (request.due) {
    payload.due_date = new Date(request.due).getTime()
    payload.due_date_time = false
  }

  const clickupIds = assignees.map(a => a.clickup_user_id).filter(Boolean)
  if (clickupIds.length > 0) {
    payload.assignees = clickupIds
  }

  const response = await fetch(`https://api.clickup.com/api/v2/list/${process.env.CLICKUP_LIST_ID}/task`, {
    method: 'POST',
    headers: {
      Authorization: process.env.CLICKUP_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.err || data?.error || 'Failed to create ClickUp task')
  }

  return {
    id: data.id,
    preview: false,
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(request, { params }) {
  const session = getSession()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role !== 'lead') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()

  // Accept array (new) or fall back to single ID (old)
  const userIds = Array.isArray(body.assigned_to_user_ids) && body.assigned_to_user_ids.length > 0
    ? body.assigned_to_user_ids
    : body.assigned_to_user_id
      ? [body.assigned_to_user_id]
      : []

  if (userIds.length === 0 && !body.assignee_name) {
    return Response.json({ error: 'Select an assignee first' }, { status: 400 })
  }

  const isSheetRequest = !UUID_RE.test(params.id)
  let requestRecord = null
  let assignees = []

  if (hasSupabaseAdminEnv() && !isSheetRequest) {
    const [{ data: requestData, error: requestError }, { data: assigneeRows, error: assigneeError }] = await Promise.all([
      supabaseAdmin
        .from('requests')
        .select('id, type, from_name, from_org, description, due_requested, team, status, assigned_to, clickup_task_id, created_at')
        .eq('id', params.id)
        .single(),
      supabaseAdmin
        .from('users')
        .select('id, name, clickup_user_id')
        .in('id', userIds),
    ])

    if (requestError || !requestData) {
      return Response.json({ error: requestError?.message || 'Request not found' }, { status: 404 })
    }

    if (assigneeError) {
      return Response.json({ error: assigneeError.message || 'Failed to fetch assignees' }, { status: 404 })
    }

    assignees = assigneeRows ?? []
    const assigneeName = assignees.map(a => a.name).join(', ')

    requestRecord = formatRequestRecord({
      ...requestData,
      assignedToUserIds: assignees.map(a => a.id),
      assigneeName,
    })
  } else {
    if (!body.request) {
      return Response.json({ error: 'Missing request payload' }, { status: 400 })
    }

    // For sheet-based requests, look up real assignees from Supabase if possible
    if (hasSupabaseAdminEnv() && userIds.length > 0) {
      const { data: assigneeRows } = await supabaseAdmin
        .from('users')
        .select('id, name, clickup_user_id')
        .in('id', userIds)
      assignees = assigneeRows ?? []
    }

    if (assignees.length === 0) {
      assignees = userIds.map((id, i) => ({
        id,
        name: body.assignee_name?.split(',')[i]?.trim() ?? '',
        clickup_user_id: null,
      }))
    }

    const assigneeName = assignees.map(a => a.name).filter(Boolean).join(', ') || body.assignee_name || ''

    requestRecord = formatRequestRecord({
      ...body.request,
      id: params.id,
      assignedToUserIds: assignees.map(a => a.id),
      assigneeName,
    })
  }

  const task = await createClickUpTask({ request: requestRecord, assignees })
  const assigneeName = assignees.map(a => a.name).filter(Boolean).join(', ') || body.assignee_name || ''

  if (!hasSupabaseAdminEnv() || isSheetRequest) {
    invalidate('requests:sheets')
    return Response.json({
      ok: true,
      preview: task.preview,
      request: formatRequestRecord({
        ...requestRecord,
        status: 'completed',
        assignedToUserIds: assignees.map(a => a.id),
        assigneeName,
        clickupTaskId: task.id,
      }),
      assigneeName,
    })
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('requests')
    .update({
      status: 'completed',
      assigned_to: assignees[0]?.id ?? null,
      clickup_task_id: task.id,
    })
    .eq('id', params.id)
    .select('id, type, from_name, from_org, description, due_requested, team, status, assigned_to, clickup_task_id, created_at')
    .single()

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  invalidate('requests:supabase')
  return Response.json({
    ok: true,
    preview: task.preview,
    request: formatRequestRecord({
      ...updated,
      assignedToUserIds: assignees.map(a => a.id),
      assigneeName,
    }),
    assigneeName,
  })
}
