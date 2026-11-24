import { createHmac, createHash, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'hub_session'
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

function getSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET
  // Local dev fallback so the login bypass works without a .env.local. Never used in production.
  return process.env.NODE_ENV !== 'production' ? 'dev-only-insecure-session-secret' : null
}

function sign(payload) {
  const secret = getSecret()
  if (!secret) throw new Error('SESSION_SECRET not configured')
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', secret).update(data).digest('base64url')
  return `${data}.${sig}`
}

function verify(raw) {
  const secret = getSecret()
  if (!secret) return null

  const dot = raw.lastIndexOf('.')
  if (dot === -1) return null

  const data = raw.slice(0, dot)
  const sig = raw.slice(dot + 1)
  const expected = createHmac('sha256', secret).update(data).digest('base64url')

  const expectedBuf = Buffer.from(expected)
  const sigBuf = Buffer.from(sig)
  if (expectedBuf.length !== sigBuf.length) return null
  if (!timingSafeEqual(expectedBuf, sigBuf)) return null

  try {
    return JSON.parse(Buffer.from(data, 'base64url').toString())
  } catch {
    return null
  }
}

export function getSession() {
  const raw = cookies().get(COOKIE_NAME)?.value
  if (!raw) return null
  try {
    const session = verify(raw)
    if (!session) return null
    if (Date.now() - session.createdAt > MAX_AGE_MS) return null
    return session
  } catch {
    return null
  }
}

export function setSession(payload) {
  const signed = sign(payload)
  cookies().set(COOKIE_NAME, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
}

export function clearSession() {
  cookies().delete(COOKIE_NAME)
}

/**
 * Timing-safe string comparison to prevent timing attacks on secrets.
 * Hashes both inputs to equal-length buffers before comparing.
 */
export function safeCompare(a, b) {
  const ha = createHash('sha256').update(String(a)).digest()
  const hb = createHash('sha256').update(String(b)).digest()
  return timingSafeEqual(ha, hb)
}
