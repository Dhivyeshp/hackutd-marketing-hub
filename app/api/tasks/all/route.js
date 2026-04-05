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
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await fetch(
    `https://api.clickup.com/api/v2/list/${process.env.CLICKUP_LIST_ID}/task?include_closed=false`,
    { headers: { Authorization: process.env.CLICKUP_API_KEY } }
  )

  if (!res.ok) return Response.json({ tasks: [] })

  const { tasks } = await res.json()

  const mapped = (tasks ?? []).map(t => ({
    id: t.id,
    title: t.name,
    status: t.status?.status ?? 'open',
    due: t.due_date ? new Date(Number(t.due_date)).toISOString().split('T')[0] : null,
    team: t.tags?.[0]?.name ?? null,
    assignees: (t.assignees ?? []).map(a => a.username || a.initials || '').filter(Boolean),
  }))

  return Response.json({ tasks: mapped })
}
