import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

const NOTION_HEADERS = {
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
  Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
}

// PATCH /api/notion/[id]/assign
// Body: { filmer?: string, storyboarder?: string }
// Saves external collaborator names to the Notion reel page
export async function PATCH(request, { params }) {
  const session = getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'lead' && session.team !== 'content') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { filmer, storyboarder } = await request.json()

  if (!process.env.NOTION_API_KEY) {
    return NextResponse.json({ error: 'Notion not configured' }, { status: 500 })
  }

  // Fetch the page to find exact property keys
  const pageRes = await fetch(`https://api.notion.com/v1/pages/${id}`, {
    headers: NOTION_HEADERS,
    cache: 'no-store',
  })
  if (!pageRes.ok) return NextResponse.json({ error: 'Reel not found' }, { status: 404 })
  const pageData = await pageRes.json()
  const props = pageData.properties ?? {}

  const filmerKey = Object.keys(props).find(k => /filmer/i.test(k))
  const storyKey  = Object.keys(props).find(k => /storyboard/i.test(k))

  const updates = {}
  if (filmer !== undefined && filmerKey) {
    updates[filmerKey] = { rich_text: [{ text: { content: filmer.trim() } }] }
  }
  if (storyboarder !== undefined && storyKey) {
    updates[storyKey] = { rich_text: [{ text: { content: storyboarder.trim() } }] }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true, message: 'No matching properties to update' })
  }

  try {
    const res = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      method: 'PATCH',
      headers: NOTION_HEADERS,
      body: JSON.stringify({ properties: updates }),
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data.message || 'Failed to update' }, { status: res.status })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
