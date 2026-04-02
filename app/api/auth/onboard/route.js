import { hasSupabaseAdminEnv, supabaseAdmin } from '@/lib/supabase-server'

const isDev = process.env.NODE_ENV !== 'production'

export async function POST(request) {
  if (!hasSupabaseAdminEnv || !supabaseAdmin) {
    return Response.json(
      { error: 'Supabase server env is missing. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 500 }
    )
  }

  const { name, email, team, clickup_email, invite_code } = await request.json()

  // Validate invite code
  if (invite_code !== process.env.INVITE_CODE) {
    return Response.json({ error: 'Invalid invite code' }, { status: 401 })
  }

  if (!name || !email || !team) {
    return Response.json({ error: 'Name, email, and team are required' }, { status: 400 })
  }

  // Check if already exists
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

  // Insert user
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: 'member',
      team,
      clickup_user_id,
    })
    .select('id, name, email, role, team')
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  // Generate + send login code
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  await supabaseAdmin
    .from('users')
    .update({ login_code: code, code_expires_at: expiresAt })
    .eq('id', user.id)

  // Log to terminal for dev testing
  console.log(`[ONBOARD CODE] ${email} → ${code}`)

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
        subject: 'Welcome to HackUTD Marketing Hub — verify your email',
        html: `
          <p>Welcome, ${name}! Your login code is:</p>
          <h1 style="font-size:48px;letter-spacing:8px;font-family:monospace">${code}</h1>
          <p>This code expires in 10 minutes.</p>
        `,
      }),
    })
  }

  return Response.json({
    sent: true,
    clickupWarning,
    devCode: !process.env.RESEND_API_KEY && isDev ? code : undefined,
  })
}
