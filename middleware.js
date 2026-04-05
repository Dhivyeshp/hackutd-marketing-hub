import { NextResponse } from 'next/server'

function getSession(request) {
  const raw = request.cookies.get('hub_session')?.value
  if (!raw) return null
  try {
    const session = JSON.parse(raw)
    if (Date.now() - session.createdAt > 30 * 24 * 60 * 60 * 1000) return null
    return session
  } catch {
    return null
  }
}

export function middleware(request) {
  const { pathname } = request.nextUrl
  const isPublicPage = pathname === '/login' || pathname === '/onboarding' || pathname === '/verify'
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

  const session = getSession(request)

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
