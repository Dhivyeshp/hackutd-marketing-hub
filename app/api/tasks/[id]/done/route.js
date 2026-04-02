import { cookies } from 'next/headers'

function getSession() {
  const cookieStore = cookies()
  const raw = cookieStore.get('hub_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export async function PATCH(request, { params }) {
  const session = getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params

  const res = await fetch(`https://api.clickup.com/api/v2/task/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: process.env.CLICKUP_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'complete' }),
  })

  if (!res.ok) {
    const err = await res.text()
    return Response.json({ error: err }, { status: res.status })
  }

  return Response.json({ ok: true })
}
