import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-server'
import { formatRequestRecord, normalizeRequestStatus } from '@/lib/requests'

function getSession() {
  const raw = cookies().get('hub_session')?.value
  if (!raw) return null

  try {
    const session = JSON.parse(raw)
    if (Date.now() - session.createdAt > 30 * 24 * 60 * 60 * 1000) return null
    return session
  } catch {
    return null
  }
}

function hasSupabaseAdminEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

const VALID_STATUSES = new Set(['submitted', 'in_review', 'approved', 'deferred', 'rejected'])

export async function PATCH(request, { params }) {
  const session = getSession()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role !== 'lead') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const status = normalizeRequestStatus(body.status)
  const nextStatus = status === 'reconsider' ? 'submitted' : status

  if (!VALID_STATUSES.has(nextStatus)) {
    return Response.json({ error: 'Invalid request status' }, { status: 400 })
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const isSheetRequest = !UUID_RE.test(params.id)

  if (!hasSupabaseAdminEnv() || isSheetRequest) {
    return Response.json({
      ok: true,
      preview: isSheetRequest,
      request: formatRequestRecord({
        ...(body.request ?? {}),
        id: params.id,
        status: nextStatus,
      }),
    })
  }

  const { data, error } = await supabaseAdmin
    .from('requests')
    .update({ status: nextStatus })
    .eq('id', params.id)
    .select('id, type, from_name, from_org, description, due_requested, team, status, assigned_to, clickup_task_id, created_at')
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true, request: formatRequestRecord(data) })
}
