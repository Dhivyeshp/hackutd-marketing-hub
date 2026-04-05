'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Suspense } from 'react'

const TEAMS = ['Design', 'UI/UX', 'Content', 'Outreach']

function LoginForm() {
  const router = useRouter()
  const [tab, setTab] = useState('signin')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [signIn, setSignIn] = useState({ email: '', password: '' })
  const [signUp, setSignUp] = useState({
    name: '', email: '', team: '', clickup_email: '', invite_code: '', password: '', confirm: '',
  })

  function setSignInField(field) {
    return e => setSignIn(f => ({ ...f, [field]: e.target.value }))
  }

  function setSignUpField(field) {
    return e => setSignUp(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSignIn(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: signIn.email, password: signIn.password }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Sign in failed.')
      return
    }

    router.push(data.role === 'lead' ? '/dashboard' : '/my-tasks')
  }

  async function handleSignUp(e) {
    e.preventDefault()
    setError('')

    if (signUp.password !== signUp.confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const res = await fetch('/api/auth/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: signUp.name,
        email: signUp.email,
        team: signUp.team,
        clickup_email: signUp.clickup_email,
        invite_code: signUp.invite_code,
        password: signUp.password,
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Sign up failed.')
      return
    }

    router.push(data.role === 'lead' ? '/dashboard' : '/my-tasks')
  }

  return (
    <div className="flex min-h-screen">
      {/* Left — background image */}
      <div className="hidden md:block md:w-1/2 relative">
        <img
          src="/onboardingbg.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
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
            <h1 className="text-xl font-semibold text-foreground">Welcome</h1>
          </div>

          {/* Tab switcher */}
          <div className="flex rounded-lg border border-border bg-muted p-1 text-sm">
            <button
              onClick={() => { setTab('signin'); setError('') }}
              className={`flex-1 rounded-md py-1.5 font-medium transition ${tab === 'signin' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Sign in
            </button>
            <button
              onClick={() => { setTab('signup'); setError('') }}
              className={`flex-1 rounded-md py-1.5 font-medium transition ${tab === 'signup' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Create account
            </button>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          {tab === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-3">
              <input
                type="email"
                placeholder="Email"
                value={signIn.email}
                onChange={setSignInField('email')}
                required
                autoFocus
                className="w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="password"
                placeholder="Password"
                value={signIn.password}
                onChange={setSignInField('password')}
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
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-3">
              <input
                type="text"
                placeholder="Full name"
                value={signUp.name}
                onChange={setSignUpField('name')}
                required
                autoFocus
                className="w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="email"
                placeholder="Email"
                value={signUp.email}
                onChange={setSignUpField('email')}
                required
                className="w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <select
                value={signUp.team}
                onChange={setSignUpField('team')}
                required
                className="w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select your team…</option>
                {TEAMS.map(t => <option key={t} value={t.toLowerCase()}>{t}</option>)}
              </select>
              <input
                type="email"
                placeholder="ClickUp email (optional)"
                value={signUp.clickup_email}
                onChange={setSignUpField('clickup_email')}
                className="w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="password"
                placeholder="Password"
                value={signUp.password}
                onChange={setSignUpField('password')}
                required
                autoComplete="new-password"
                className="w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={signUp.confirm}
                onChange={setSignUpField('confirm')}
                required
                autoComplete="new-password"
                className="w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="text"
                placeholder="Invite code"
                value={signUp.invite_code}
                onChange={setSignUpField('invite_code')}
                required
                className="w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Creating account…' : 'Create account'}
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
