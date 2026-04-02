import { cookies } from 'next/headers'

export async function POST() {
  const cookieStore = cookies()
  cookieStore.delete('hub_session')
  return Response.json({ ok: true })
}
