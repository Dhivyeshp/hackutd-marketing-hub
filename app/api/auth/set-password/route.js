import { hasSupabaseAdminEnv, supabaseAdmin } from '@/lib/supabase-server'
import { getSession } from '@/lib/session'
import bcrypt from 'bcryptjs'

export async function POST(request) {
  if (!hasSupabaseAdminEnv || !supabaseAdmin) {
    return Response.json({ error: 'Server configuration error.' }, { status: 500 })
  }

  const session = getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { password } = await request.json()
  if (!password || password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const hash = await bcrypt.hash(password, 10)

  await supabaseAdmin
    .from('users')
    .update({ password_hash: hash })
    .eq('id', session.userId)

  return Response.json({ ok: true })
}
