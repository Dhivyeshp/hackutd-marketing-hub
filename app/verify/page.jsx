'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function VerifyPage() {
  const router = useRouter()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [email, setEmail] = useState('')
  const [devCode, setDevCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const inputs = useRef([])

  useEffect(() => {
    const pendingEmail = sessionStorage.getItem('pending_email')
    if (!pendingEmail) {
      router.push('/login')
      return
    }

    setEmail(pendingEmail)
    setDevCode(sessionStorage.getItem('pending_dev_code') || '')

    const warn = sessionStorage.getItem('clickup_warning')
    if (warn) {
      sessionStorage.removeItem('clickup_warning')
    }
  }, [router])

  function handleDigit(index, value) {
    const nextValue = value.replace(/\D/g, '').slice(-1)
    const nextCode = [...code]
    nextCode[index] = nextValue
    setCode(nextCode)

    if (nextValue && index < 5) {
      inputs.current[index + 1]?.focus()
    }

    if (nextCode.every(digit => digit)) {
      submitCode(nextCode.join(''))
    }
  }

  function handleKeyDown(index, event) {
    if (event.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  function handlePaste(event) {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setCode(pasted.split(''))
      submitCode(pasted)
    }
  }

  async function submitCode(codeStr) {
    if (!email) return

    setLoading(true)
    setError('')

    const response = await fetch('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code: codeStr }),
    })
    const data = await response.json()

    setLoading(false)

    if (!response.ok) {
      setError(
        data.error === 'Code expired'
          ? 'Code expired. Request a new one below.'
          : 'Invalid code. Try again.'
      )
      setCode(['', '', '', '', '', ''])
      inputs.current[0]?.focus()
      return
    }

    sessionStorage.removeItem('pending_email')
    sessionStorage.removeItem('pending_dev_code')
    router.push(data.role === 'lead' ? '/dashboard' : '/my-tasks')
  }

  async function handleResend() {
    if (!email) return

    setResending(true)

    const response = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await response.json()

    if (data?.devCode) {
      sessionStorage.setItem('pending_dev_code', data.devCode)
      setDevCode(data.devCode)
    } else {
      sessionStorage.removeItem('pending_dev_code')
      setDevCode('')
    }

    setResending(false)
    setResent(true)
    setCode(['', '', '', '', '', ''])
    inputs.current[0]?.focus()
    window.setTimeout(() => setResent(false), 5000)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-6 text-center">
        <div className="space-y-1">
          <img src="/logo.png" alt="HackUTD" className="mx-auto mb-4 h-12 w-12 rounded-xl object-contain" />
          <h1 className="text-xl font-semibold text-foreground">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>

        <div className="flex justify-center gap-2" onPaste={handlePaste}>
          {code.map((digit, index) => (
            <input
              key={index}
              ref={element => (inputs.current[index] = element)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={event => handleDigit(index, event.target.value)}
              onKeyDown={event => handleKeyDown(index, event)}
              disabled={loading}
              className="h-12 w-10 rounded-lg border border-border bg-card text-center text-lg font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
          ))}
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
        {loading && <p className="text-xs text-muted-foreground">Verifying...</p>}
        {devCode && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
            Local dev code: <span className="font-semibold tracking-[0.2em]">{devCode}</span>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          {resent ? (
            <span className="text-green-600 dark:text-green-400">New code sent!</span>
          ) : (
            <>
              Didn&apos;t get it?{' '}
              <button
                onClick={handleResend}
                disabled={resending}
                className="underline underline-offset-2 hover:text-foreground disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend code'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
