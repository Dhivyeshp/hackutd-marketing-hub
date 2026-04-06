import { hasSupabaseAdminEnv, supabaseAdmin } from '@/lib/supabase-server'

export async function POST(request) {
  if (!hasSupabaseAdminEnv || !supabaseAdmin) {
    return Response.json({ error: 'Server configuration error.' }, { status: 500 })
  }

  const { email } = await request.json()
  if (!email) return Response.json({ error: 'Email required.' }, { status: 400 })

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, name')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (!user) {
    // Don't reveal whether the email exists
    return Response.json({ ok: true })
  }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  await supabaseAdmin
    .from('users')
    .update({ login_code: code, login_code_expires_at: expires })
    .eq('id', user.id)

  if (process.env.RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? 'hub@hackutd.com',
        to: email,
        subject: 'Your HackUTD login code',
        html: `<p>Hi ${user.name},</p><p>Your login code is: <strong style="font-size:24px;letter-spacing:4px">${code}</strong></p><p>Expires in 10 minutes.</p>`,
      }),
    })
  } else {
    // Dev fallback — log to console
    console.log(`[send-code] ${email} → ${code}`)
  }

  return Response.json({ ok: true })
}
