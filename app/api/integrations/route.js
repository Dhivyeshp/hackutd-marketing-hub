import { NextResponse } from 'next/server'
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

const NOTION_API_KEY = process.env.NOTION_API_KEY
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID
const CLICKUP_API_KEY = process.env.CLICKUP_API_KEY
const CLICKUP_LIST_ID = process.env.CLICKUP_LIST_ID

async function safeJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function checkNotion() {
  if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
    return {
      ok: false,
      service: 'notion',
      message: 'Missing NOTION_API_KEY or NOTION_DATABASE_ID',
    }
  }

  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page_size: 1 }),
      cache: 'no-store',
    })

    const data = await safeJson(response)

    if (!response.ok) {
      return {
        ok: false,
        service: 'notion',
        message: data?.message || data?.error || `Notion returned ${response.status}`,
      }
    }

    return {
      ok: true,
      service: 'notion',
      message: 'Connected',
      pageCount: data?.results?.length ?? 0,
    }
  } catch (error) {
    return {
      ok: false,
      service: 'notion',
      message: error.message,
    }
  }
}

async function checkClickUp() {
  if (!CLICKUP_API_KEY || !CLICKUP_LIST_ID) {
    return {
      ok: false,
      service: 'clickup',
      message: 'Missing CLICKUP_API_KEY or CLICKUP_LIST_ID',
    }
  }

  try {
    const response = await fetch(
      `https://api.clickup.com/api/v2/list/${CLICKUP_LIST_ID}/task?include_closed=false&page=0`,
      {
        headers: { Authorization: CLICKUP_API_KEY },
        cache: 'no-store',
      }
    )

    const data = await safeJson(response)

    if (!response.ok) {
      return {
        ok: false,
        service: 'clickup',
        message: data?.err || data?.error || `ClickUp returned ${response.status}`,
      }
    }

    return {
      ok: true,
      service: 'clickup',
      message: 'Connected',
      taskCount: data?.tasks?.length ?? 0,
    }
  } catch (error) {
    return {
      ok: false,
      service: 'clickup',
      message: error.message,
    }
  }
}

export async function GET() {
  const session = getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [notion, clickup] = await Promise.all([checkNotion(), checkClickUp()])
  const ok = notion.ok && clickup.ok

  return NextResponse.json(
    {
      ok,
      notion,
      clickup,
    },
    { status: ok ? 200 : 500 }
  )
}
