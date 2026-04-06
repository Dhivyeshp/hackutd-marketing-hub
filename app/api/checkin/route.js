import { getSession } from '@/lib/session'
import { hasSupabaseAdminEnv, supabaseAdmin } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

function getWeekOf() {
  const now = new Date()
  const day = now.getUTCDay() // 0=Sun, 1=Mon...
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1) // Monday of this week
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff))
  return monday.toISOString().split('T')[0]
}

export async function GET() {
  const session = getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!hasSupabaseAdminEnv || !supabaseAdmin) {
    return NextResponse.json({ checkin: null, preview: true })
  }

  const weekOf = getWeekOf()

  const { data } = await supabaseAdmin
    .from('checkins')
    .select('id, status, note, submitted_at')
    .eq('user_id', session.userId)
    .eq('week_of', weekOf)
    .maybeSingle()

  return NextResponse.json({ checkin: data ?? null, weekOf })
}

const VALID_STATUSES = new Set(['on_track', 'needs_help', 'blocked'])

export async function POST(request) {
  const session = getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { status, note } = body

  if (!VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const weekOf = getWeekOf()

  if (!hasSupabaseAdminEnv || !supabaseAdmin) {
    return NextResponse.json({ ok: true, preview: true, checkin: { status, note, week_of: weekOf } })
  }

  // Upsert — one check-in per user per week
  const { data, error } = await supabaseAdmin
    .from('checkins')
    .upsert(
      {
        user_id: session.userId,
        week_of: weekOf,
        status,
        note: note?.trim() || null,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,week_of' }
    )
    .select('id, status, note, submitted_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, checkin: data })
}
