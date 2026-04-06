import { hasSupabaseAdminEnv, supabaseAdmin } from '@/lib/supabase-server'
import { setSession } from '@/lib/session'
import bcrypt from 'bcryptjs'

export async function POST(request) {
  if (!hasSupabaseAdminEnv || !supabaseAdmin) {
    return Response.json({ error: 'Server configuration error.' }, { status: 500 })
  }

  const { email, password } = await request.json()

  if (!email || !password) {
    return Response.json({ error: 'Email and password required' }, { status: 400 })
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, name, email, role, team, password_hash')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (error || !user) {
    return Response.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  if (!user.password_hash) {
    return Response.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    return Response.json({ error: 'Invalid email or password' }, { status: 401 })
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

  return Response.json({ role: user.role })
}
