import { getSession } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getDefaultAssignableUsers, normalizeTeam } from '@/lib/requests'


function hasSupabaseAdminEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export async function GET(request) {
  const session = getSession()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role !== 'lead') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const team = normalizeTeam(searchParams.get('team') ?? '')
  const role = searchParams.get('role') ?? ''

  if (!hasSupabaseAdminEnv()) {
    const users = getDefaultAssignableUsers(team)
    return Response.json({ users })
  }

  let query = supabaseAdmin
    .from('users')
    .select('id, name, team, role, clickup_user_id')
    .order('name', { ascending: true })

  if (team) query = query.eq('team', team)
  if (role) query = query.eq('role', role)

  const { data, error } = await query

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const users = (data ?? []).map(user => ({
    id: user.id,
    name: user.name,
    team: user.team,
    role: user.role,
    clickupUserId: user.clickup_user_id,
  }))

  return Response.json({ users })
}
