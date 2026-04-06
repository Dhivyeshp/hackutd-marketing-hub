import { getSession } from '@/lib/session'

const ALLOWED_STATUSES = new Set(['Approved', 'Needs Revision', 'Rejected', 'Ready for Review', 'Drafting'])

async function resolveStatusPropName(pageId) {
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    headers: { Authorization: `Bearer ${process.env.NOTION_API_KEY}`, 'Notion-Version': '2022-06-28' },
  })
  if (!res.ok) return null
  const data = await res.json().catch(() => null)
  const entry = Object.entries(data?.properties ?? {}).find(([, v]) => v.type === 'status')
  return entry ? entry[0] : null
}

export async function PATCH(request, { params }) {
  const session = getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'lead') return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!process.env.NOTION_API_KEY) return Response.json({ error: 'NOTION_API_KEY not configured' }, { status: 500 })

  const { status } = await request.json()
  if (!status) return Response.json({ error: 'Missing status' }, { status: 400 })
  if (!ALLOWED_STATUSES.has(status)) return Response.json({ error: 'Invalid status value' }, { status: 400 })

  const statusPropName = await resolveStatusPropName(params.id)
  if (!statusPropName) return Response.json({ error: 'Could not find status property on Notion page' }, { status: 500 })

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
