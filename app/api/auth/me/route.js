import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = cookies()
  const raw = cookieStore.get('hub_session')?.value

  if (!raw) {
    return Response.json({ user: null })
  }

  try {
    const session = JSON.parse(raw)
    // Check 30-day expiry
    if (Date.now() - session.createdAt > 30 * 24 * 60 * 60 * 1000) {
      return Response.json({ user: null })
    }
    return Response.json({ user: session })
  } catch {
    return Response.json({ user: null })
  }
}
