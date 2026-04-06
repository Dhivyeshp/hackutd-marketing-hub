import { hasSupabaseAdminEnv, supabaseAdmin } from '@/lib/supabase-server'
import { getSession } from '@/lib/session'

export async function GET(request) {
  if (!hasSupabaseAdminEnv || !supabaseAdmin) {
    return Response.json(
      { error: 'Supabase server env is missing. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 500 }
    )
  }

  const session = getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')

  if (!userId || userId !== session.userId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get clickup_user_id for this user
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('clickup_user_id')
    .eq('id', userId)
    .single()

  if (!user?.clickup_user_id) {
    return Response.json({ tasks: [] })
  }

  // Fetch from ClickUp filtered by assignee
  const res = await fetch(
    `https://api.clickup.com/api/v2/list/${process.env.CLICKUP_LIST_ID}/task?assignees[]=${user.clickup_user_id}&include_closed=true`,
    { headers: { Authorization: process.env.CLICKUP_API_KEY } }
  )

  if (!res.ok) return Response.json({ tasks: [] })

  const { tasks } = await res.json()

  const mapped = (tasks ?? []).map(t => ({
    id: t.id,
    title: t.name,
    status: t.status?.status ?? 'open',
    due: t.due_date ? new Date(Number(t.due_date)).toISOString().split('T')[0] : null,
    team: t.tags?.[0]?.name ?? null,
  }))

  return Response.json({ tasks: mapped })
}
