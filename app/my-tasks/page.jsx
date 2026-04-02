'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MemberView from '@/components/MemberView'

export default function MyTasksPage() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(response => response.json())
      .then(({ user }) => {
        if (!user) {
          router.replace('/login')
          return
        }

        if (user.role === 'lead') {
          router.replace('/dashboard')
          return
        }

        setSession(user)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [router])

  async function handleSignOut() {
    await fetch('/api/auth/signout', { method: 'POST' })
    router.replace('/login')
  }

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    )
  }

  return <MemberView user={session} onSignOut={handleSignOut} />
}
