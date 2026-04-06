import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { hasSupabaseAdminEnv, supabaseAdmin } from '@/lib/supabase-server'
import { cached, invalidate } from '@/lib/cache'


const ROSTER_KEY = 'roster:members'
const ROSTER_TTL_MS = 5 * 60_000 // 5 minutes

export async function GET(request) {
  const session = getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!hasSupabaseAdminEnv || !supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase not configured.' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  if (searchParams.get('refresh') === '1') invalidate(ROSTER_KEY)

  try {
    const result = await cached(ROSTER_KEY, ROSTER_TTL_MS, async () => {
      const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('id, name, team, role')
        .order('name')

      if (error) throw new Error(error.message)

      const members = users.map(u => ({ id: u.id, name: u.name, team: u.team, role: u.role }))
      const summary = members.reduce((acc, m) => {
        const key = m.team || 'unassigned'
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {})

      return { members, summary }
    })

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
