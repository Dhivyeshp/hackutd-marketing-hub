import { NextResponse } from 'next/server'
import { hasSupabaseAdminEnv, supabaseAdmin } from '@/lib/supabase-server'

export async function GET() {
  if (!hasSupabaseAdminEnv || !supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase not configured.' }, { status: 500 })
  }

  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('id, name, team, role')
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const members = users.map(u => ({
    id: u.id,
    name: u.name,
    team: u.team,
    role: u.role,
  }))

  const summary = members.reduce((result, member) => {
    const key = member.team || 'unassigned'
    result[key] = (result[key] || 0) + 1
    return result
  }, {})

  return NextResponse.json({ members, summary })
}
