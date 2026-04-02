import { hasSupabaseAdminEnv, supabaseAdmin } from '@/lib/supabase-server'

const isDev = process.env.NODE_ENV !== 'production'

export async function POST(request) {
  if (!hasSupabaseAdminEnv || !supabaseAdmin) {
    return Response.json(
      { error: 'Supabase server env is missing. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 500 }
    )
  }

  const { email } = await request.json()

  if (!email) {
    return Response.json({ error: 'Email required' }, { status: 400 })
  }

  // Check if user exists
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, email, role')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (error || !user) {
    return Response.json({ exists: false })
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  await supabaseAdmin
    .from('users')
    .update({ login_code: code, code_expires_at: expiresAt })
    .eq('id', user.id)

  // Log to terminal for dev testing
  console.log(`[LOGIN CODE] ${email} → ${code}`)

  // Send via Resend
  if (process.env.RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'hub@hackutd.com',
        to: email,
        subject: 'Your HackUTD Marketing Hub login code',
        html: `
          <p>Your login code is:</p>
          <h1 style="font-size:48px;letter-spacing:8px;font-family:monospace">${code}</h1>
          <p>This code expires in 10 minutes.</p>
        `,
      }),
    })
  }

  return Response.json({
    exists: true,
    sent: true,
    devCode: !process.env.RESEND_API_KEY && isDev ? code : undefined,
  })
}
