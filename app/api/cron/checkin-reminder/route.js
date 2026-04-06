import { NextResponse } from 'next/server'
import { hasSupabaseAdminEnv, supabaseAdmin } from '@/lib/supabase-server'
import { safeCompare } from '@/lib/session'

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization') ?? ''
  const provided = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (!safeCompare(provided, cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!hasSupabaseAdminEnv || !supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'hub@hackutd.com'
  const appUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : (process.env.NEXT_PUBLIC_APP_URL ?? 'https://hub.hackutd.com')

  if (!resendKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const { data: members, error } = await supabaseAdmin
    .from('users')
    .select('id, name, email')
    .eq('role', 'member')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results = await Promise.allSettled(
    (members ?? []).map(async (user) => {
      const checkinUrl = `${appUrl}/checkin?uid=${user.id}`
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: user.email,
          subject: "Thursday check-in — HackUTD Marketing",
          html: `<p>Hey ${user.name.split(' ')[0]},</p>
<p>It's Thursday! Drop a quick check-in so the team knows where you're at:</p>
<p><a href="${checkinUrl}" style="display:inline-block;background:#e63946;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Submit check-in →</a></p>
<p style="color:#888;font-size:12px;">Takes 10 seconds. Just pick a status and add an optional note.</p>`,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.message ?? `Failed to send to ${user.email}`)
      }
      return user.email
    })
  )

  const sent = results.filter(r => r.status === 'fulfilled').map(r => r.value)
  const failed = results
    .filter(r => r.status === 'rejected')
    .map(r => r.reason?.message ?? 'unknown error')

  return NextResponse.json({ ok: true, sent: sent.length, failed })
}
