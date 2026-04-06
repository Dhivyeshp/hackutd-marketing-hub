import { getSession } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-server'

const CLICKUP_TASK_ID_RE = /^[a-z0-9]+$/i

export async function PATCH(request, { params }) {
  const session = getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params

  if (!CLICKUP_TASK_ID_RE.test(id)) {
    return Response.json({ error: 'Invalid task ID' }, { status: 400 })
  }

  // Verify ownership: fetch task and confirm session user is an assignee
  const taskRes = await fetch(`https://api.clickup.com/api/v2/task/${id}`, {
    headers: { Authorization: process.env.CLICKUP_API_KEY },
  })

  if (!taskRes.ok) {
    return Response.json({ error: 'Task not found' }, { status: 404 })
  }

  const { task } = await taskRes.json()

  // Leads can mark any task done; members must be an assignee
  if (session.role !== 'lead') {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('clickup_user_id')
      .eq('id', session.userId)
      .single()

    const assigneeIds = (task?.assignees ?? []).map(a => String(a.id))
    if (!user?.clickup_user_id || !assigneeIds.includes(String(user.clickup_user_id))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const res = await fetch(`https://api.clickup.com/api/v2/task/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: process.env.CLICKUP_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'complete' }),
  })

  if (!res.ok) {
    const err = await res.text()
    return Response.json({ error: err }, { status: res.status })
  }

  return Response.json({ ok: true })
}
