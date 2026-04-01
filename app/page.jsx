'use client'

import { useEffect, useState } from 'react'
import Dashboard from '@/components/Dashboard'
import ThemeToggle from '@/components/ThemeToggle'
import { MOCK_SESSION } from '@/lib/marketing'
import { bypassAuth, hasSupabaseEnv, supabase } from '@/lib/supabase'

export default function Home() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (bypassAuth || !hasSupabaseEnv || !supabase) {
      setSession(MOCK_SESSION)
      setLoading(false)
      return undefined
    }

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signInWithGoogle() {
    if (!supabase) return

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-4xl overflow-hidden rounded-[28px] border border-border bg-card shadow-sm">
          <div className="grid lg:grid-cols-[1.1fr,0.9fr]">
            <div className="border-b border-border bg-muted/50 px-8 py-10 lg:border-b-0 lg:border-r">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
                H
              </div>
              <div className="mt-8 space-y-4">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
                  HackUTD Marketing Hub
                </p>
                <h1 className="text-4xl font-semibold tracking-tight text-foreground">
                  Keep every marketing team in one calm workspace.
                </h1>
                <p className="max-w-md text-sm leading-6 text-muted-foreground">
                  Review reel ideas, track ClickUp deadlines, and keep Design, UI/UX, Outreach, and Content aligned.
                </p>
              </div>
            </div>

            <div className="px-8 py-10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-foreground">Sign in to continue</h2>
                  <p className="text-sm text-muted-foreground">
                    Use your UTD Google account to access the dashboard.
                  </p>
                </div>

                <button
                  onClick={signInWithGoogle}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-accent active:scale-[0.99]"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </button>

                <div className="rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
                  Live auth turns on automatically once `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <Dashboard session={session} onSignOut={signOut} previewMode={bypassAuth || !hasSupabaseEnv} />
}
