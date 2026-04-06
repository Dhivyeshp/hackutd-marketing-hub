import { NextResponse } from 'next/server'

const NOTION_HEADERS = {
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
  Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
}

// Statuses an external collaborator is allowed to self-report
const EXTERNAL_STATUSES = [
  'Scripting',
  'Script pending approval',
  'Script approved → Editing',
  'Edit pending approval',
  'Editing (revising)',
]

function getPropertyValue(property) {
  if (!property) return ''
  switch (property.type) {
    case 'title':      return property.title?.map(t => t.plain_text).join('') ?? ''
    case 'rich_text':  return property.rich_text?.map(t => t.plain_text).join('') ?? ''
    case 'status':     return property.status?.name ?? ''
    case 'select':     return property.select?.name ?? ''
    case 'people':     return property.people?.map(p => p.name || p.person?.email || '').filter(Boolean).join(', ') ?? ''
    case 'date':       return property.date?.start ?? ''
    default:           return ''
  }
}

// Public — no auth required (external collaborators have the URL from content team)
export async function GET(request, { params }) {
  const { id } = await params

  if (!process.env.NOTION_API_KEY) {
    return NextResponse.json({ error: 'Notion not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      headers: NOTION_HEADERS,
      cache: 'no-store',
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data.message || 'Not found' }, { status: res.status })

    const props = data.properties ?? {}
    const titleKey = Object.keys(props).find(k => props[k].type === 'title') ?? 'Video Title'
    const statusKey = Object.keys(props).find(k => props[k].type === 'status') ?? 'Progress'

    const reel = {
      id: data.id,
      notionUrl: data.url,
      title: getPropertyValue(props[titleKey]),
      status: getPropertyValue(props[statusKey]),
      statusKey,
      concept: getPropertyValue(props['Video Concept'] ?? props['Concept']),
      filmer: getPropertyValue(props['Filmer/Editor'] ?? props['Filmer']),
      storyboarder: getPropertyValue(props['Storyboarder/Ideator'] ?? props['Storyboarder']),
      type: getPropertyValue(props['Type']),
      allowedStatuses: EXTERNAL_STATUSES,
    }

    return NextResponse.json({ reel })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// External collaborator updates the status of their reel
export async function PATCH(request, { params }) {
  const { id } = await params
  const { status } = await request.json()

  if (!EXTERNAL_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  if (!process.env.NOTION_API_KEY) {
    return NextResponse.json({ error: 'Notion not configured' }, { status: 500 })
  }

  // Need to know the status property name — fetch the page first
  const pageRes = await fetch(`https://api.notion.com/v1/pages/${id}`, {
    headers: NOTION_HEADERS,
    cache: 'no-store',
  })
  if (!pageRes.ok) return NextResponse.json({ error: 'Reel not found' }, { status: 404 })
  const pageData = await pageRes.json()
  const statusKey = Object.keys(pageData.properties ?? {}).find(k => pageData.properties[k].type === 'status') ?? 'Progress'

  try {
    const res = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      method: 'PATCH',
      headers: NOTION_HEADERS,
      body: JSON.stringify({ properties: { [statusKey]: { status: { name: status } } } }),
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data.message || 'Failed to update' }, { status: res.status })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
