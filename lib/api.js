import { cloneReels, cloneTasks, QUICK_LINKS } from '@/lib/marketing'

async function requestJson(url, options, fallbackMessage) {
  const response = await fetch(url, {
    ...options,
    cache: 'no-store',
  })

  let data = null

  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new Error(data?.error || fallbackMessage)
  }

  return data
}

export async function fetchTasks() {
  try {
    const data = await requestJson('/api/clickup', undefined, 'Failed to fetch tasks')
    return { ...data, preview: false }
  } catch {
    return { tasks: cloneTasks(), preview: true }
  }
}

export async function fetchReels() {
  const data = await requestJson('/api/notion', undefined, 'Failed to fetch reels')
  return { ...data, preview: false }
}

export async function fetchRoster() {
  return requestJson('/api/roster', undefined, 'Failed to fetch roster')
}

export async function createClickUpTask({ title, team, due, assignee }) {
  try {
    const task = await requestJson(
      '/api/clickup',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, team, due, assignee }),
      },
      'Failed to create task'
    )

    return { ...task, preview: false }
  } catch {
    return {
      id: `preview-task-${Date.now()}`,
      title,
      team,
      due,
      assignee,
      status: 'open',
      clickupUrl: QUICK_LINKS[1].url,
      preview: true,
    }
  }
}

export async function approveReel(id, title) {
  return requestJson(
    `/api/notion/${id}/approve`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    },
    'Failed to approve'
  )
}

export async function reviseReel(id) {
  return requestJson(
    `/api/notion/${id}/revise`,
    { method: 'PATCH' },
    'Failed to request changes'
  )
}

export async function rejectReel(id) {
  return requestJson(
    `/api/notion/${id}/reject`,
    { method: 'PATCH' },
    'Failed to reject'
  )
}
