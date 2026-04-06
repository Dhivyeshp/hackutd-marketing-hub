import { getSession } from '@/lib/session'
import { hasSupabaseAdminEnv, supabaseAdmin } from '@/lib/supabase-server'

async function fetchAllClickUpTasks() {
  const tasks = []
  let page = 0

  while (true) {
    const res = await fetch(
      `https://api.clickup.com/api/v2/list/${process.env.CLICKUP_LIST_ID}/task?include_closed=false&page=${page}`,
      { headers: { Authorization: process.env.CLICKUP_API_KEY } }
    )
    if (!res.ok) break

    const data = await res.json()
    const batch = data.tasks ?? []
    tasks.push(...batch)

    if (data.last_page || batch.length < 100) break
    page++
  }

  return tasks
}

export async function GET() {
  const session = getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let userMap = {}
  if (hasSupabaseAdminEnv && supabaseAdmin) {
    const { data: members } = await supabaseAdmin
      .from('users')
      .select('clickup_user_id, name, team')
      .not('clickup_user_id', 'is', null)

    for (const m of members ?? []) {
      userMap[m.clickup_user_id] = { name: m.name, team: m.team }
    }
  }

  const raw = await fetchAllClickUpTasks()

  const tasks = []

  for (const t of raw) {
    if (!t.assignees?.length) continue
    if (t.status?.status === 'complete' || t.status?.status === 'closed') continue

    const assignees = t.assignees.map(a => {
      const known = userMap[String(a.id)]
      const name = known?.name ?? a.username ?? a.initials ?? '?'
      const initials = name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0].toUpperCase())
        .join('')
      return { name, initials, team: known?.team ?? null }
    })

    // Get all distinct teams represented by assignees
    const teams = [...new Set(assignees.map(a => a.team).filter(Boolean))]
    if (teams.length === 0) continue

    // Emit one entry per team so the task appears in each relevant column
    for (const team of teams) {
      tasks.push({
        id: `${t.id}-${team}`,
        title: t.name,
        status: t.status?.status ?? 'open',
        due: t.due_date ? new Date(Number(t.due_date)).toISOString().split('T')[0] : null,
        team,
        assignees,
      })
    }
  }

  return Response.json({ tasks })
}
