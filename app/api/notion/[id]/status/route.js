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

export async function PATCH(request, { params }) {
  const session = getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'lead') return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!process.env.NOTION_API_KEY) return Response.json({ error: 'NOTION_API_KEY not configured' }, { status: 500 })

  const { status, statusPropName } = await request.json()
  if (!status || !statusPropName) return Response.json({ error: 'Missing status or statusPropName' }, { status: 400 })

  const res = await fetch(`https://api.notion.com/v1/pages/${params.id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { [statusPropName]: { status: { name: status } } },
    }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    return Response.json({ error: data?.message || 'Notion PATCH failed' }, { status: res.status })
  }

  return Response.json({ ok: true })
}
