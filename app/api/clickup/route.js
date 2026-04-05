import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { cached, invalidate } from '@/lib/cache'

function getSession() {
  const raw = cookies().get('hub_session')?.value
  if (!raw) return null
  try {
    const session = JSON.parse(raw)
    if (Date.now() - session.createdAt > 30 * 24 * 60 * 60 * 1000) return null
    return session
  } catch { return null }
}

const CLICKUP_API_KEY = process.env.CLICKUP_API_KEY
const CLICKUP_LIST_ID = process.env.CLICKUP_LIST_ID

const TEAM_KEYWORDS = {
  design: ['design', 'logo', 'brand', 'graphic', 'asset', 'figma', 'illustration', 'mockup'],
  uiux: ['ui', 'ux', 'wireframe', 'prototype', 'user', 'interface', 'flow', 'accessibility'],
  outreach: ['outreach', 'sponsor', 'partner', 'email', 'recruit', 'contact', 'newsletter'],
  content: ['content', 'film', 'reel', 'video', 'post', 'caption', 'instagram', 'tiktok', 'edit', 'shoot'],
}

function inferTeam(title, tags) {
  const lower = title.toLowerCase()
  const tagNames = (tags ?? []).map((t) => t.name.toLowerCase())

  for (const [team, keywords] of Object.entries(TEAM_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw) || tagNames.includes(kw))) return team
  }

  return 'design'
}

function getMissingEnvResponse() {
  if (CLICKUP_API_KEY && CLICKUP_LIST_ID) return null

  return NextResponse.json(
    { error: 'Missing CLICKUP_API_KEY or CLICKUP_LIST_ID' },
    { status: 500 }
  )
}

async function safeJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

const CLICKUP_TASKS_KEY = 'clickup:tasks'
const CLICKUP_TTL_MS = 60_000 // 60 seconds

export async function GET(request) {
  const session = getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const missingEnvResponse = getMissingEnvResponse()
  if (missingEnvResponse) return missingEnvResponse

  const { searchParams } = new URL(request.url)
  if (searchParams.get('refresh') === '1') invalidate(CLICKUP_TASKS_KEY)

  try {
    const tasks = await cached(CLICKUP_TASKS_KEY, CLICKUP_TTL_MS, async () => {
      const res = await fetch(
        `https://api.clickup.com/api/v2/list/${CLICKUP_LIST_ID}/task?include_closed=false&page=0`,
        { headers: { Authorization: CLICKUP_API_KEY } }
      )
      const data = await safeJson(res)
      if (!res.ok) throw new Error(data?.err || data?.error || 'ClickUp API error')
      return (data?.tasks ?? []).map((task) => ({
        id: task.id,
        title: task.name,
        team: inferTeam(task.name, task.tags),
        due: task.due_date ? new Date(Number(task.due_date)).toISOString().split('T')[0] : null,
        assignees: (task.assignees ?? []).map(a => a.username || a.email || a.initials || '').filter(Boolean),
        status: task.status?.status ?? 'open',
        clickupUrl: task.url,
      }))
    })

    return NextResponse.json({ tasks })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  const session = getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'lead') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const missingEnvResponse = getMissingEnvResponse()
  if (missingEnvResponse) return missingEnvResponse

  try {
    const { taskId, assignees, due } = await request.json()

    if (!taskId) {
      return NextResponse.json({ error: 'Missing taskId' }, { status: 400 })
    }

    const body = {}

    if (assignees !== undefined) {
      body.description = assignees.length
        ? `Assigned to: ${assignees.join(', ')}`
        : ''
    }

    if (due !== undefined) {
      body.due_date = due ? new Date(due).getTime() : null
      body.due_date_time = false
    }

    const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
      method: 'PUT',
      headers: { Authorization: CLICKUP_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const task = await safeJson(res)

    if (!res.ok) {
      return NextResponse.json(
        { error: task?.err || task?.error || 'ClickUp PATCH error' },
        { status: res.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  const session = getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'lead') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const missingEnvResponse = getMissingEnvResponse()
  if (missingEnvResponse) return missingEnvResponse

  try {
    const { title, team, due, assignee } = await request.json()

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Missing task title' }, { status: 400 })
    }

    const body = {
      name: title,
      tags: [team],
    }

    if (assignee?.trim()) {
      body.description = `Suggested owner: ${assignee.trim()}`
    }

    if (due) {
      body.due_date = new Date(due).getTime()
      body.due_date_time = false
    }

    const res = await fetch(
      `https://api.clickup.com/api/v2/list/${CLICKUP_LIST_ID}/task`,
      {
        method: 'POST',
        headers: {
          Authorization: CLICKUP_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    const task = await safeJson(res)

    if (!res.ok) {
      return NextResponse.json(
        { error: task?.err || task?.error || 'ClickUp POST error' },
        { status: res.status }
      )
    }

    return NextResponse.json({
      id: task.id,
      title: task.name,
      team: inferTeam(task.name, task.tags),
      due,
      assignee: assignee?.trim() || '',
      status: task.status?.status ?? 'open',
      clickupUrl: task.url,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
