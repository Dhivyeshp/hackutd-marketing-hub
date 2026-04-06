'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Suspense } from 'react'

function VerifyForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('verify_email')
    if (stored) setEmail(stored)
  }, [])

  async function handleVerify(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Invalid code.')
      return
    }

    sessionStorage.removeItem('verify_email')

    if (data.needsPassword) {
      router.push('/set-password')
    } else {
      router.push(data.role === 'lead' ? '/dashboard' : '/my-tasks')
    }
  }

  async function handleResend() {
    if (!email) return
    await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setError('')
    setCode('')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <img src="/logo.png" alt="HackUTD" className="mx-auto mb-4 h-12 w-12 rounded-xl object-contain" />
          <h1 className="text-xl font-semibold text-foreground">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            We sent a 6-digit code to <span className="font-medium text-foreground">{email || 'your email'}</span>.
          </p>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <form onSubmit={handleVerify} className="space-y-3">
          <input
            type="text"
            inputMode="numeric"
            placeholder="000000"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            autoFocus
            className="w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-center text-2xl tracking-widest text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Verifying…' : 'Verify'}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Didn't get it?{' '}
          <button onClick={handleResend} className="underline underline-offset-2 hover:text-foreground">
            Resend code
          </button>
        </p>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  )
}
