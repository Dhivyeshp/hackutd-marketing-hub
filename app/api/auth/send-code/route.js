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
    return Response.json({ error: 'No account found for this email.' }, { status: 404 })
  }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  await supabaseAdmin
    .from('users')
    .update({ login_code: code, login_code_expires_at: expires })
    .eq('id', user.id)

  if (!process.env.RESEND_API_KEY) {
    console.log(`[send-code] ${email} → ${code}`)
    return Response.json({ ok: true })
  }

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
      to: email,
      subject: 'HackUTD Marketing Hub — login code',
      html: `<p>Hi ${user.name},</p><p>Your HackUTD Marketing Hub login code is:</p><p><strong style="font-size:28px;letter-spacing:6px;font-family:monospace">${code}</strong></p><p style="color:#888;font-size:12px">Expires in 10 minutes. If you didn't request this, ignore this email.</p>`,
    }),
  })

  if (!emailRes.ok) {
    const emailErr = await emailRes.json().catch(() => null)
    return Response.json(
      { error: emailErr?.message ?? 'Failed to send login code. Try again.' },
      { status: 500 }
    )
  }

  return Response.json({ ok: true })
}
