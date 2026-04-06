import { hasSupabaseAdminEnv, supabaseAdmin } from '@/lib/supabase-server'
import { setSession, safeCompare } from '@/lib/session'
import bcrypt from 'bcryptjs'

export async function POST(request) {
  if (!hasSupabaseAdminEnv || !supabaseAdmin) {
    return Response.json({ error: 'Server configuration error.' }, { status: 500 })
  }

  const { name, email, team, clickup_user_id: rawClickupId, invite_code, password } = await request.json()

  if (!process.env.INVITE_CODE || !safeCompare(invite_code ?? '', process.env.INVITE_CODE)) {
    return Response.json({ error: 'Invalid invite code' }, { status: 401 })
  }

  if (!name || !email || !team) {
    return Response.json({ error: 'Name, email, and team are required' }, { status: 400 })
  }

  if (!password) {
    return Response.json({ error: 'Password is required' }, { status: 400 })
  }

  // Sanitize: ClickUp user IDs are numeric strings
  const clickup_user_id = rawClickupId?.trim().replace(/\D/g, '') || null

  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (existing) {
    return Response.json({ error: 'Account already exists. Go to login.' }, { status: 409 })
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

  setSession(session)

  return Response.json({ role: user.role, clickupWarning: !clickup_user_id })
}
