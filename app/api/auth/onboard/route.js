import { hasSupabaseAdminEnv, supabaseAdmin } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'

export async function POST(request) {
  if (!hasSupabaseAdminEnv || !supabaseAdmin) {
    return Response.json({ error: 'Server configuration error.' }, { status: 500 })
  }

  const { name, email, team, clickup_email, invite_code, password } = await request.json()

  if (invite_code !== process.env.INVITE_CODE) {
    return Response.json({ error: 'Invalid invite code' }, { status: 401 })
  }

  if (!name || !email || !team) {
    return Response.json({ error: 'Name, email, and team are required' }, { status: 400 })
  }

  if (!password) {
    return Response.json({ error: 'Password is required' }, { status: 400 })
  }

  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (existing) {
    return Response.json({ error: 'Account already exists. Go to login.' }, { status: 409 })
  }

  // Resolve ClickUp user ID
  let clickup_user_id = null
  let clickupWarning = false

  if (clickup_email && process.env.CLICKUP_API_KEY && process.env.CLICKUP_TEAM_ID) {
    try {
      const res = await fetch(
        `https://api.clickup.com/api/v2/group?team_id=${process.env.CLICKUP_TEAM_ID}`,
        { headers: { Authorization: process.env.CLICKUP_API_KEY } }
      )
      const { teams } = await res.json()
      const allMembers = (teams ?? []).flatMap(t => t.members ?? [])
      const match = allMembers.find(m => m.user?.email === clickup_email)
      clickup_user_id = match?.user?.id ?? null
    } catch {
      // non-fatal
    }
    if (!clickup_user_id) clickupWarning = true
  }

  const password_hash = await bcrypt.hash(password, 10)

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: 'member',
      team,
      clickup_user_id,
      password_hash,
    })
    .select('id, name, email, role, team')
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const session = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    team: user.team,
    createdAt: Date.now(),
  }

  cookies().set('hub_session', JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  return Response.json({ role: user.role, clickupWarning })
}
