import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { cached, invalidate } from '@/lib/cache'


const NOTION_API_KEY = process.env.NOTION_API_KEY
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID
const SHOWN_STATUSES = [
  'Idea',
  'Scripting',
  'Script pending approval',
  'Script approved → Editing',
  'Edit pending approval',
  'Edit needs changes',
  'Editing (revising)',
]

const NOTION_HEADERS = {
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
}

function authHeaders() {
  return { ...NOTION_HEADERS, Authorization: `Bearer ${NOTION_API_KEY}` }
}

async function safeJson(res) {
  try { return await res.json() } catch { return null }
}

function getPropertyValue(property) {
  if (!property) return ''
  switch (property.type) {
    case 'title':
      return property.title?.map(t => t.plain_text).join('') ?? ''
    case 'rich_text':
      return property.rich_text?.map(t => t.plain_text).join('') ?? ''
    case 'select':
      return property.select?.name ?? ''
    case 'multi_select':
      return property.multi_select?.map(s => s.name).join(', ') ?? ''
    case 'status':
      return property.status?.name ?? ''
    case 'people':
      return property.people?.map(p => p.name || p.person?.email || '').filter(Boolean).join(', ') ?? ''
    case 'date':
      return property.date?.start ?? ''
    case 'checkbox':
      return property.checkbox ? 'Yes' : 'No'
    case 'number':
      return property.number != null ? String(property.number) : ''
    case 'url':
      return property.url ?? ''
    case 'email':
      return property.email ?? ''
    case 'phone_number':
      return property.phone_number ?? ''
    case 'formula': {
      const f = property.formula
      if (!f) return ''
      return f.string ?? (f.number != null ? String(f.number) : '') ?? f.date?.start ?? String(f.boolean ?? '')
    }
    case 'files':
      return property.files?.map(f => f.name || '').filter(Boolean).join(', ') ?? ''
    case 'relation':
      return property.relation?.length ? `${property.relation.length} linked` : ''
    case 'rollup': {
      const r = property.rollup
      if (!r) return ''
      if (r.type === 'number') return r.number != null ? String(r.number) : ''
      if (r.type === 'date') return r.date?.start ?? ''
      if (r.type === 'array') return r.array?.map(i => getPropertyValue(i)).filter(Boolean).join(', ') ?? ''
      return ''
    }
    case 'created_time':
      return property.created_time ? new Date(property.created_time).toLocaleDateString() : ''
    case 'last_edited_time':
      return property.last_edited_time ? new Date(property.last_edited_time).toLocaleDateString() : ''
    case 'created_by':
      return property.created_by?.name ?? ''
    case 'last_edited_by':
      return property.last_edited_by?.name ?? ''
    default:
      return ''
  }
}

async function resolveDbId(id) {
  const dbRes = await fetch(`https://api.notion.com/v1/databases/${id}`, {
    headers: authHeaders(), cache: 'no-store',
  })
  if (dbRes.ok) return { dbId: id, schemaData: await safeJson(dbRes) }

  const childRes = await fetch(`https://api.notion.com/v1/blocks/${id}/children?page_size=50`, {
    headers: authHeaders(), cache: 'no-store',
  })
  const childData = await safeJson(childRes)
  if (!childRes.ok) throw new Error(childData?.message || 'Failed to fetch page children')

  const dbBlocks = childData.results?.filter(b => b.type === 'child_database') ?? []
  if (dbBlocks.length === 0) throw new Error('No database found inside the page.')

  const dbBlock = dbBlocks.find(b => /reel|idea/i.test(b.child_database?.title ?? '')) ?? dbBlocks[0]
  const dbId = dbBlock.id

  const schemaRes = await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
    headers: authHeaders(), cache: 'no-store',
  })
  const schemaData = await safeJson(schemaRes)
  if (!schemaRes.ok) throw new Error(schemaData?.message || 'Failed to fetch database schema')

  return { dbId, schemaData }
}

async function fetchAllPages(dbId, statusPropName) {
  const pages = []
  let cursor = undefined

  do {
    const body = {
      page_size: 100,
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      filter: {
        or: SHOWN_STATUSES.map(s => ({
          property: statusPropName,
          status: { equals: s },
        })),
      },
    }
    if (cursor) body.start_cursor = cursor

    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    const data = await safeJson(res)
    if (!res.ok) throw new Error(data?.message || 'Notion query failed')

    pages.push(...(data.results ?? []))
    cursor = data.has_more ? data.next_cursor : undefined
  } while (cursor)

  return pages
}

const NOTION_DB_KEY = 'notion:db'
const NOTION_TTL_MS = 60_000 // 60 seconds

export async function GET(request) {
  const session = getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'lead' && session.team !== 'content') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
    return NextResponse.json({ error: 'Missing NOTION_API_KEY or NOTION_DATABASE_ID' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  if (searchParams.get('refresh') === '1') invalidate(NOTION_DB_KEY)

  try {
    const result = await cached(NOTION_DB_KEY, NOTION_TTL_MS, async () => {
      const { dbId, schemaData } = await resolveDbId(NOTION_DATABASE_ID)
      const dbProps = schemaData.properties ?? {}

      const statusEntry = Object.entries(dbProps).find(([, v]) => v.type === 'status')
      const statusPropName = statusEntry?.[0] ?? null
      if (!statusPropName) throw new Error('No status property found in database.')

      const columns = Object.entries(dbProps)
        .map(([name, def]) => ({ name, type: def.type }))
        .sort((a, b) => {
          if (a.type === 'title') return -1
          if (b.type === 'title') return 1
          return a.name.localeCompare(b.name)
        })

      const pages = await fetchAllPages(dbId, statusPropName)

      const rows = pages.map(page => {
        const props = {}
        for (const { name } of columns) {
          props[name] = getPropertyValue(page.properties[name])
        }
        return { id: page.id, notionUrl: page.url, properties: props }
      })

      return { columns, rows, statusPropName }
    })

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
