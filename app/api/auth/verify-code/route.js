import { hasSupabaseAdminEnv, supabaseAdmin } from '@/lib/supabase-server'
import { setSession } from '@/lib/session'

export async function POST(request) {
  if (!hasSupabaseAdminEnv || !supabaseAdmin) {
    return Response.json({ error: 'Server configuration error.' }, { status: 500 })
  }

  const { email, code } = await request.json()
  if (!email || !code) return Response.json({ error: 'Email and code required.' }, { status: 400 })

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, name, email, role, team, login_code, login_code_expires_at, password_hash')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (!user || user.login_code !== code.trim()) {
    return Response.json({ error: 'Invalid code.' }, { status: 401 })
  }

  if (!user.login_code_expires_at || new Date(user.login_code_expires_at) < new Date()) {
    return Response.json({ error: 'Code expired. Request a new one.' }, { status: 401 })
  }

  // Clear the code
  await supabaseAdmin
    .from('users')
    .update({ login_code: null, login_code_expires_at: null })
    .eq('id', user.id)

  setSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    team: user.team,
    createdAt: Date.now(),
  })

  // If no password set yet, redirect to /set-password
  const needsPassword = !user.password_hash
  return Response.json({ role: user.role, needsPassword })
}
