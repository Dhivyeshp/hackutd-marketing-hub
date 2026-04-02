import { hasSupabaseAdminEnv, supabaseAdmin } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

export async function POST(request) {
  if (!hasSupabaseAdminEnv || !supabaseAdmin) {
    return Response.json(
      { error: 'Supabase server env is missing. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 500 }
    )
  }

  const { email, code } = await request.json()

  if (!email || !code) {
    return Response.json({ error: 'Email and code required' }, { status: 400 })
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, name, email, role, team, login_code, code_expires_at')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (error || !user) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  if (!user.login_code || user.login_code !== code) {
    return Response.json({ error: 'Invalid code' }, { status: 401 })
  }

  if (!user.code_expires_at || new Date(user.code_expires_at) < new Date()) {
    return Response.json({ error: 'Code expired' }, { status: 401 })
  }

  // Clear code from DB
  await supabaseAdmin
    .from('users')
    .update({ login_code: null, code_expires_at: null })
    .eq('id', user.id)

  // Create session cookie (30 days)
  const session = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    team: user.team,
    createdAt: Date.now(),
  }

  const cookieStore = cookies()
  cookieStore.set('hub_session', JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })

  return Response.json({ role: user.role, team: user.team })
}
