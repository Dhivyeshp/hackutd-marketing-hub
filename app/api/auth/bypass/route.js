import { setSession } from '@/lib/session'

// TEMPORARY: lets you into the hub without Supabase/login while auth is being set up.
// Always on in `next dev`. In production it only works if ALLOW_AUTH_BYPASS=true is set.
// Remove this route (and the buttons on /login) once real login works.
function isBypassAllowed() {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_AUTH_BYPASS === 'true'
}

export async function POST(request) {
  if (!isBypassAllowed()) {
    return Response.json({ error: 'Login bypass is disabled.' }, { status: 403 })
  }

  const { role } = await request.json().catch(() => ({}))
  const asLead = role !== 'member'

  try {
    setSession({
      userId: 'dev-bypass',
      email: 'dev-bypass@local',
      name: asLead ? 'Dev Lead' : 'Dev Member',
      role: asLead ? 'lead' : 'member',
      team: asLead ? null : 'content',
      bypass: true,
      createdAt: Date.now(),
    })
  } catch (err) {
    return Response.json({ error: err.message || 'Could not create session.' }, { status: 500 })
  }

  return Response.json({ role: asLead ? 'lead' : 'member' })
}
