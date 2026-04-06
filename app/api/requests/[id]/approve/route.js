import { getSession } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-server'
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

async function createClickUpTask({ request, assignee }) {
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

  if (assignee?.clickup_user_id) {
    payload.assignees = [assignee.clickup_user_id]
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
  if (!body.assigned_to_user_id) {
    return Response.json({ error: 'Select an assignee first' }, { status: 400 })
  }

  const isSheetRequest = !UUID_RE.test(params.id)
  let requestRecord = null
  let assignee = null

  if (hasSupabaseAdminEnv() && !isSheetRequest) {
    const [{ data: requestData, error: requestError }, { data: assigneeData, error: assigneeError }] = await Promise.all([
      supabaseAdmin
        .from('requests')
        .select('id, type, from_name, from_org, description, due_requested, team, status, assigned_to, clickup_task_id, created_at')
        .eq('id', params.id)
        .single(),
      supabaseAdmin
        .from('users')
        .select('id, name, clickup_user_id')
        .eq('id', body.assigned_to_user_id)
        .single(),
    ])

    if (requestError || !requestData) {
      return Response.json({ error: requestError?.message || 'Request not found' }, { status: 404 })
    }

    if (assigneeError || !assigneeData) {
      return Response.json({ error: assigneeError?.message || 'Assignee not found' }, { status: 404 })
    }

    requestRecord = formatRequestRecord({
      ...requestData,
      assigned_to: assigneeData.id,
      assigneeName: assigneeData.name,
    })
    assignee = assigneeData
  } else {
    if (!body.request) {
      return Response.json({ error: 'Missing request payload' }, { status: 400 })
    }

    // For sheet-based requests, still look up the real assignee from Supabase if possible
    if (hasSupabaseAdminEnv() && isSheetRequest) {
      const { data: assigneeData } = await supabaseAdmin
        .from('users')
        .select('id, name, clickup_user_id')
        .eq('id', body.assigned_to_user_id)
        .single()
      assignee = assigneeData ?? { id: body.assigned_to_user_id, name: body.assignee_name ?? '', clickup_user_id: null }
    } else {
      assignee = { id: body.assigned_to_user_id, name: body.assignee_name ?? '', clickup_user_id: null }
    }

    requestRecord = formatRequestRecord({
      ...body.request,
      id: params.id,
      assignedToUserId: body.assigned_to_user_id,
      assigneeName: assignee.name,
    })
  }

  const task = await createClickUpTask({ request: requestRecord, assignee })

  if (!hasSupabaseAdminEnv() || isSheetRequest) {
    return Response.json({
      ok: true,
      preview: task.preview,
      request: formatRequestRecord({
        ...requestRecord,
        status: 'approved',
        assignedToUserId: body.assigned_to_user_id,
        assigneeName: assignee.name,
        clickupTaskId: task.id,
      }),
      assigneeName: assignee.name,
    })
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('requests')
    .update({
      status: 'approved',
      assigned_to: assignee.id,
      clickup_task_id: task.id,
    })
    .eq('id', params.id)
    .select('id, type, from_name, from_org, description, due_requested, team, status, assigned_to, clickup_task_id, created_at')
    .single()

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  return Response.json({
    ok: true,
    preview: task.preview,
    request: formatRequestRecord({
      ...updated,
      assigneeName: assignee.name,
    }),
    assigneeName: assignee.name,
  })
}
