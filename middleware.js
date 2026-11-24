import { NextResponse } from 'next/server'

const COOKIE_NAME = 'hub_session'
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

// Convert base64url string to Uint8Array without Node.js Buffer (Edge-safe)
function base64urlToBytes(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=')
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0))
}

// HMAC-verify the session cookie using Web Crypto API (works in Edge + Node runtimes)
async function getSession(request) {
  const raw = request.cookies.get(COOKIE_NAME)?.value
  if (!raw) return null

  // Must match getSecret() in app/lib/session.js (incl. the dev-only fallback)
  const secret = process.env.SESSION_SECRET ||
    (process.env.NODE_ENV !== 'production' ? 'dev-only-insecure-session-secret' : null)
  if (!secret) return null

  const dot = raw.lastIndexOf('.')
  if (dot === -1) return null

  const data = raw.slice(0, dot)
  const sig = raw.slice(dot + 1)

  try {
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64urlToBytes(sig),
      enc.encode(data)
    )
    if (!valid) return null

    const session = JSON.parse(new TextDecoder().decode(base64urlToBytes(data)))
    if (Date.now() - session.createdAt > MAX_AGE_MS) return null
    return session
  } catch {
    return null
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl
  const isPublicPage = pathname === '/login' || pathname === '/onboarding' || pathname === '/verify' || pathname === '/set-password'
  const isPublicAuthApi = pathname.startsWith('/api/auth')
  const isPublicRequestIngress = pathname === '/api/requests'

  // Always allow public paths and static assets
  if (
    isPublicPage ||
    isPublicAuthApi ||
    isPublicRequestIngress ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  const session = await getSession(request)

  // No session → 401 for API routes, redirect to login for pages
  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Role-based protection
  if (pathname.startsWith('/dashboard') && session.role !== 'lead') {
    return NextResponse.redirect(new URL('/my-tasks', request.url))
  }

  if (pathname.startsWith('/my-tasks') && session.role === 'lead') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Root → redirect to role home
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(session.role === 'lead' ? '/dashboard' : '/my-tasks', request.url)
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg|.*\\.ico|.*\\.webp|.*\\.gif).*)'],
}
