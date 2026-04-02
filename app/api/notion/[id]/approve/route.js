import { cookies } from 'next/headers'

function getSession() {
  const raw = cookies().get('hub_session')?.value
  if (!raw) return null
  try {
    const session = JSON.parse(raw)
    if (Date.now() - session.createdAt > 30 * 24 * 60 * 60 * 1000) return null
    return session
  } catch {
    return null
  }
}

async function resolveStatusPropName(pageId) {
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    headers: { Authorization: `Bearer ${process.env.NOTION_API_KEY}`, 'Notion-Version': '2022-06-28' },
  })
  if (!res.ok) return null
  const data = await res.json().catch(() => null)
  const entry = Object.entries(data?.properties ?? {}).find(([, v]) => v.type === 'status')
  return entry ? entry[0] : null
}

async function patchNotionStatus(pageId, statusName) {
  const statusProp = await resolveStatusPropName(pageId)
  if (!statusProp) throw new Error('Could not find a status-type property on this Notion page')

  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { [statusProp]: { status: { name: statusName } } },
    }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.message || data?.error || 'Notion PATCH failed')
  }
}

async function createClickUpFilmTask(title) {
  if (!process.env.CLICKUP_API_KEY || !process.env.CLICKUP_LIST_ID) return null

  const res = await fetch(
    `https://api.clickup.com/api/v2/list/${process.env.CLICKUP_LIST_ID}/task`,
    {
      method: 'POST',
      headers: {
        Authorization: process.env.CLICKUP_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: `Film: ${title}`, tags: ['content'] }),
    }
  )
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.err || data?.error || 'ClickUp task creation failed')
  return data?.id ?? null
}

export async function PATCH(request, { params }) {
  const session = getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'lead') return Response.json({ error: 'Forbidden' }, { status: 403 })

  if (!process.env.NOTION_API_KEY) {
    return Response.json({ error: 'NOTION_API_KEY not configured' }, { status: 500 })
  }

  const { title } = await request.json()
  if (!title?.trim()) return Response.json({ error: 'Missing title' }, { status: 400 })

  try {
    await patchNotionStatus(params.id, 'Approved')
    const clickupTaskId = await createClickUpFilmTask(title.trim()).catch(() => null)
    return Response.json({ ok: true, clickupTaskId })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
