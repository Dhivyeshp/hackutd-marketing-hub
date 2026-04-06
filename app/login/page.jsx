'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const [mode, setMode] = useState('password') // 'password' | 'magic'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function handlePasswordLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Sign in failed.')
      return
    }

    router.push(data.role === 'lead' ? '/dashboard' : '/my-tasks')
  }

  async function handleSendCode(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setLoading(false)

    if (!res.ok) {
      setError('Something went wrong. Try again.')
      return
    }

    // Store email for the verify page
    sessionStorage.setItem('verify_email', email)
    router.push('/verify')
  }

  return (
    <div className="flex min-h-screen">
      {/* Left — background */}
      <div className="hidden md:block md:w-1/2 relative">
        <img src="/onboardingbg.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute bottom-10 left-10 text-white">
          <p className="text-2xl font-semibold leading-snug">HackUTD<br />Marketing Hub</p>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex w-full md:w-1/2 flex-col items-center justify-center px-8 py-12 bg-background">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-1">
            <img src="/logo.png" alt="HackUTD" className="mx-auto mb-4 h-12 w-12 rounded-xl object-contain" />
            <h1 className="text-xl font-semibold text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground">HackUTD Marketing Hub</p>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          {info  && <p className="text-xs text-muted-foreground">{info}</p>}

          {mode === 'password' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-3">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
              <button
                type="button"
                onClick={() => { setMode('magic'); setError(''); setInfo('') }}
                className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                First time or forgot password? Get a login link →
              </button>
            </form>
          ) : (
            <form onSubmit={handleSendCode} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Enter your email and we'll send you a 6-digit login code.
              </p>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send login code'}
              </button>
              <button
                type="button"
                onClick={() => { setMode('password'); setError(''); setInfo('') }}
                className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                ← Back to password login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
