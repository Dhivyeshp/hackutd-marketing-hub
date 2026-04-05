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
  if (!statusProp) throw new Error('Could not find status property on Notion page')

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

async function createClickUpFilmTask(title, clickupUserIds = []) {
  if (!process.env.CLICKUP_API_KEY || !process.env.CLICKUP_LIST_ID) {
    throw new Error('CLICKUP_API_KEY or CLICKUP_LIST_ID not configured')
  }

  const payload = { name: `Film: ${title}`, tags: ['content'] }
  if (clickupUserIds.length > 0) {
    // ClickUp expects integer user IDs — parse as int, filter out NaN/0
    payload.assignees = clickupUserIds.map(id => parseInt(id, 10)).filter(id => id > 0)
    console.log('[approve] ClickUp assignees payload:', payload.assignees)
  }

  const res = await fetch(
    `https://api.clickup.com/api/v2/list/${process.env.CLICKUP_LIST_ID}/task`,
    {
      method: 'POST',
      headers: {
        Authorization: process.env.CLICKUP_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  )
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.err || data?.error || 'ClickUp task creation failed')
  console.log('[approve] ClickUp task created:', data?.id, 'assignees:', payload.assignees)
  return data?.id ?? null
}

export async function PATCH(request, { params }) {
  const session = getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'lead') return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!process.env.NOTION_API_KEY) return Response.json({ error: 'NOTION_API_KEY not configured' }, { status: 500 })

  const { title, assigneeIds = [], nextStatus, skipNotionUpdate } = await request.json()
  if (!title?.trim()) return Response.json({ error: 'Missing title' }, { status: 400 })

  // Look up clickup_user_id for each selected assignee
  let clickupUserIds = []
  if (assigneeIds.length > 0 && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { supabaseAdmin } = await import('@/lib/supabase-server')
    const { data } = await supabaseAdmin
      .from('users')
      .select('clickup_user_id')
      .in('id', assigneeIds)
    clickupUserIds = (data ?? []).map(u => u.clickup_user_id).filter(Boolean)
    console.log('[approve] assigneeIds:', assigneeIds, '→ clickup_user_ids:', clickupUserIds)
  }

  const statusToSet = nextStatus || 'Approved'

  // Run Notion and ClickUp independently so one failure doesn't block the other
  const jobs = [createClickUpFilmTask(title.trim(), clickupUserIds)]
  if (!skipNotionUpdate) jobs.unshift(patchNotionStatus(params.id, statusToSet))

  const results = await Promise.allSettled(jobs)
  const [notionResult, clickupResult] = skipNotionUpdate
    ? [{ status: 'fulfilled' }, results[0]]
    : results

  if (notionResult.status === 'rejected') {
    console.error('[approve] Notion error:', notionResult.reason?.message)
  }
  if (clickupResult.status === 'rejected') {
    console.error('[approve] ClickUp error:', clickupResult.reason?.message)
  }

  // If both failed, return error
  if (notionResult.status === 'rejected' && clickupResult.status === 'rejected') {
    return Response.json({
      error: `Notion: ${notionResult.reason?.message} | ClickUp: ${clickupResult.reason?.message}`,
    }, { status: 500 })
  }

  return Response.json({
    ok: true,
    clickupTaskId: clickupResult.status === 'fulfilled' ? clickupResult.value : null,
    notionError: notionResult.status === 'rejected' ? notionResult.reason?.message : null,
    clickupError: clickupResult.status === 'rejected' ? clickupResult.reason?.message : null,
  })
}
