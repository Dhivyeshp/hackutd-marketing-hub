import { NextResponse } from 'next/server'

const NOTION_API_KEY = process.env.NOTION_API_KEY
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID

function getMissingEnvResponse() {
  if (NOTION_API_KEY && NOTION_DATABASE_ID) return null
  return NextResponse.json(
    { error: 'Missing NOTION_API_KEY or NOTION_DATABASE_ID' },
    { status: 500 }
  )
}

async function safeJson(response) {
  try { return await response.json() } catch { return null }
}

const NOTION_HEADERS = {
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
}

function authHeaders() {
  return { ...NOTION_HEADERS, Authorization: `Bearer ${NOTION_API_KEY}` }
}

function getPropertyText(property) {
  if (!property) return ''
  if (property.type === 'people') {
    return (property.people ?? [])
      .map(p => p.name || p.person?.email || '')
      .filter(Boolean)
      .join(', ')
  }
  if (property.type === 'rich_text') {
    return (property.rich_text ?? []).map(i => i.plain_text ?? '').join('')
  }
  return property.rich_text?.[0]?.plain_text ?? ''
}

// Find the actual database ID — searches the integration's accessible databases
// and picks the one whose title best matches the brewing station
async function findBrewingDatabase() {
  const res = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      filter: { property: 'object', value: 'database' },
      page_size: 20,
    }),
    cache: 'no-store',
  })
  const data = await safeJson(res)
  const databases = data?.results ?? []

  if (databases.length === 0) return null

  // Prefer a database whose title mentions brewing/content/reel
  const keywords = ['brew', 'content', 'reel', 'video', 'idea']
  const match = databases.find(db => {
    const title = (db.title?.[0]?.plain_text ?? '').toLowerCase()
    return keywords.some(k => title.includes(k))
  })

  return match ?? databases[0]
}

export async function GET() {
  const missingEnvResponse = getMissingEnvResponse()
  if (missingEnvResponse) return missingEnvResponse

  try {
    // Try configured ID directly first
    let dbId = NOTION_DATABASE_ID
    let dbProps = null

    const directRes = await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
      headers: authHeaders(),
      cache: 'no-store',
    })

    if (directRes.ok) {
      const directData = await safeJson(directRes)
      dbProps = directData?.properties ?? {}
    } else {
      // Configured ID is a page — find the actual database via search
      const db = await findBrewingDatabase()
      if (!db) {
        return NextResponse.json(
          { error: 'No accessible databases found. Make sure your Notion integration is connected to the brewing station database.' },
          { status: 500 }
        )
      }
      dbId = db.id
      dbProps = db.properties ?? {}
    }

    // Find the progress/status property — try common names first, then fall back to type search
    const CANDIDATE_NAMES = ['Progress', 'Status', 'Stage', 'State']
    let statusProp = CANDIDATE_NAMES.find(name => name in dbProps)
    if (!statusProp) {
      const entry = Object.entries(dbProps).find(([, v]) => v.type === 'status' || v.type === 'select')
      statusProp = entry?.[0] ?? null
    }

    if (!statusProp) {
      return NextResponse.json(
        { error: 'Could not find a progress/status property in the database.', properties: Object.fromEntries(Object.entries(dbProps).map(([n, v]) => [n, v.type])) },
        { status: 500 }
      )
    }

    const propType = dbProps[statusProp]?.type ?? 'status'
    const filterBlock = propType === 'select'
      ? { property: statusProp, select: { equals: 'Ready for Review' } }
      : { property: statusProp, status: { equals: 'Ready for Review' } }

    const queryRes = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        filter: filterBlock,
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
        page_size: 100,
      }),
      cache: 'no-store',
    })

    const queryData = await safeJson(queryRes)

    if (!queryRes.ok) {
      return NextResponse.json(
        { error: queryData?.message || queryData?.error || 'Notion query failed' },
        { status: queryRes.status }
      )
    }

    const reels = (queryData?.results ?? []).map(page => ({
      id: page.id,
      title: page.properties['Video Title']?.title?.[0]?.plain_text ?? 'Untitled',
      filmer: getPropertyText(page.properties['Filmer/Editor']),
      story: getPropertyText(page.properties['Storyboarder/Ideator']),
      type: page.properties['Type']?.select?.name ?? '',
      status: propType === 'select'
        ? page.properties[statusProp]?.select?.name ?? ''
        : page.properties[statusProp]?.status?.name ?? '',
      notionUrl: page.url,
    }))

    return NextResponse.json({ reels })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
