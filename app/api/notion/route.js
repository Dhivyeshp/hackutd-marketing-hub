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
  try {
    return await response.json()
  } catch {
    return null
  }
}

function getPropertyText(property) {
  if (!property) return ''

  if (property.type === 'people') {
    return (property.people ?? [])
      .map((person) => person.name || person.person?.email || '')
      .filter(Boolean)
      .join(', ')
  }

  if (property.type === 'rich_text') {
    return (property.rich_text ?? [])
      .map((item) => item.plain_text ?? '')
      .join('')
  }

  return property.rich_text?.[0]?.plain_text ?? ''
}

export async function GET() {
  const missingEnvResponse = getMissingEnvResponse()
  if (missingEnvResponse) return missingEnvResponse

  try {
    const res = await fetch(
      `https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ page_size: 100 }),
        cache: 'no-store',
      }
    )

    const data = await safeJson(res)

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.message || data?.error || 'Notion API error' },
        { status: res.status }
      )
    }

    const reels = (data?.results ?? []).map((page) => ({
      id: page.id,
      title: page.properties['Video Title']?.title?.[0]?.plain_text ?? 'Untitled',
      filmer: getPropertyText(page.properties['Filmer/Editor']),
      story: getPropertyText(page.properties['Storyboarder/Ideator']),
      type: page.properties['Type']?.select?.name ?? '',
      status: page.properties['Progress']?.status?.name ?? '',
      notionUrl: page.url,
    }))

    return NextResponse.json({ reels })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  const missingEnvResponse = getMissingEnvResponse()
  if (missingEnvResponse) return missingEnvResponse

  try {
    const { pageId } = await request.json()

    if (!pageId) {
      return NextResponse.json({ error: 'Missing pageId' }, { status: 400 })
    }

    const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          Progress: {
            status: { name: 'In Progress' },
          },
        },
      }),
    })

    const data = await safeJson(res)

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.message || data?.error || 'Notion PATCH error' },
        { status: res.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
