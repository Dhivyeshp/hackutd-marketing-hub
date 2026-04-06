import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { hasSupabaseAdminEnv, supabaseAdmin } from '@/lib/supabase-server'

function getWeekOf() {
  const now = new Date()
  const day = now.getUTCDay()
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff))
  return monday.toISOString().split('T')[0]
}

// Lead-only: get all members and their check-in status for this week
export async function GET() {
  const session = getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'lead') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!hasSupabaseAdminEnv || !supabaseAdmin) {
    return NextResponse.json({ checkins: [], preview: true })
  }

  const weekOf = getWeekOf()

  const [membersRes, checkinsRes] = await Promise.all([
    supabaseAdmin.from('users').select('id, name').eq('role', 'member').order('name'),
    supabaseAdmin.from('checkins').select('user_id, status, note').eq('week_of', weekOf),
  ])

  const members = membersRes.data ?? []
  const checkinsByUser = Object.fromEntries(
    (checkinsRes.data ?? []).map(c => [c.user_id, c])
  )

  const checkins = members.map(member => {
    const checkin = checkinsByUser[member.id]
    return {
      user_id: member.id,
      name: member.name,
      status: checkin?.status ?? null,
      note: checkin?.note ?? null,
    }
  })

  return NextResponse.json({ checkins, weekOf })
}
