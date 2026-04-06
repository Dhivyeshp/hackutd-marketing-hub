import { getSession } from '@/lib/session'

export async function GET() {
  const session = getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await fetch(
    `https://api.clickup.com/api/v2/list/${process.env.CLICKUP_LIST_ID}/task?include_closed=false`,
    { headers: { Authorization: process.env.CLICKUP_API_KEY } }
  )

  if (!res.ok) return Response.json({ tasks: [] })

  const { tasks } = await res.json()

  const mapped = (tasks ?? [])
    .filter(t => t.assignees?.length > 0)
    .map(t => ({
      id: t.id,
      title: t.name,
      status: t.status?.status ?? 'open',
      due: t.due_date ? new Date(Number(t.due_date)).toISOString().split('T')[0] : null,
      assignees: t.assignees.map(a => a.username || a.initials || '').filter(Boolean),
    }))

  return Response.json({ tasks: mapped })
}
