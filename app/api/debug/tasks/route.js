import { getSession } from '@/lib/session'
import { hasSupabaseAdminEnv, supabaseAdmin } from '@/lib/supabase-server'

// Lead-only debug endpoint — remove this file before going public
export async function GET() {
  const session = getSession()
  if (!session || session.role !== 'lead') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: members } = hasSupabaseAdminEnv && supabaseAdmin
    ? await supabaseAdmin.from('users').select('clickup_user_id, name, team').not('clickup_user_id', 'is', null)
    : { data: [] }

  const userMap = Object.fromEntries((members ?? []).map(m => [m.clickup_user_id, { name: m.name, team: m.team }]))

  const res = await fetch(
    `https://api.clickup.com/api/v2/list/${process.env.CLICKUP_LIST_ID}/task?include_closed=false&page=0`,
    { headers: { Authorization: process.env.CLICKUP_API_KEY } }
  )
  const { tasks } = await res.json()

  const summary = (tasks ?? []).map(t => ({
    title: t.name,
    assignees: (t.assignees ?? []).map(a => ({
      clickup_id: String(a.id),
      username: a.username,
      matched: userMap[String(a.id)] ?? null,
    })),
  }))

  return Response.json({
    list_id: process.env.CLICKUP_LIST_ID,
    total_tasks: tasks?.length ?? 0,
    supabase_users_loaded: Object.keys(userMap).length,
    userMap,
    tasks: summary,
  })
}
