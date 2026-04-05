import { cookies } from 'next/headers'

function getSession() {
  const raw = cookies().get('hub_session')?.value
  if (!raw) return null
  try {
    const session = JSON.parse(raw)
    if (Date.now() - session.createdAt > 30 * 24 * 60 * 60 * 1000) return null
    return session
  } catch { return null }
}

export async function GET() {
  const session = getSession()
  if (!session || session.role !== 'lead') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.CLICKUP_API_KEY) {
    return Response.json({ error: 'CLICKUP_API_KEY not configured' }, { status: 500 })
  }

  // Get all workspaces (teams)
  const teamsRes = await fetch('https://api.clickup.com/api/v2/team', {
    headers: { Authorization: process.env.CLICKUP_API_KEY },
  })
  const teamsData = await teamsRes.json().catch(() => null)

  if (!teamsRes.ok) {
    return Response.json({ error: teamsData?.err || 'Failed to fetch ClickUp teams' }, { status: 500 })
  }

  const members = (teamsData.teams ?? []).flatMap(team =>
    (team.members ?? []).map(m => ({
      id: m.user.id,
      username: m.user.username,
      email: m.user.email,
      name: m.user.username || m.user.email,
    }))
  )

  return Response.json({ members })
}
