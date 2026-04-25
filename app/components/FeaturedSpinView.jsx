'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const SEGMENT_COLORS = [
  '#6366f1', '#8b5cf6', '#7c3aed', '#4f46e5',
  '#a78bfa', '#818cf8', '#c4b5fd', '#4338ca',
]

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4)
}

export default function FeaturedSpinView() {
  const canvasRef = useRef(null)
  const angleRef = useRef(0)
  const animRef = useRef(null)
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState(null)
  const [accepting, setAccepting] = useState(false)

  async function fetchPeople() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/featured')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load people')
      setPeople(data.people ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPeople()
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [])

  const drawWheel = useCallback((rotation, peopleToDraw) => {
    const canvas = canvasRef.current
    if (!canvas || peopleToDraw.length === 0) return
    const ctx = canvas.getContext('2d')
    const size = canvas.width
    const cx = size / 2
    const cy = size / 2
    const radius = cx - 20
    const segAngle = (2 * Math.PI) / peopleToDraw.length

    ctx.clearRect(0, 0, size, size)

    peopleToDraw.forEach((person, i) => {
      const start = rotation + i * segAngle
      const end = start + segAngle

      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, radius, start, end)
      ctx.closePath()
      ctx.fillStyle = SEGMENT_COLORS[i % SEGMENT_COLORS.length]
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      const labelSize = Math.max(10, Math.min(14, 160 / peopleToDraw.length + 4))
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(start + segAngle / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#fff'
      ctx.font = `600 ${labelSize}px sans-serif`
      ctx.shadowColor = 'rgba(0,0,0,0.3)'
      ctx.shadowBlur = 2
      ctx.fillText(person.name, radius - 12, labelSize / 3)
      ctx.restore()
    })

    // Center cap
    ctx.beginPath()
    ctx.arc(cx, cy, 22, 0, 2 * Math.PI)
    ctx.fillStyle = 'rgba(0,0,0,0.15)'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx, cy, 18, 0, 2 * Math.PI)
    ctx.fillStyle = '#fff'
    ctx.fill()

    // Pointer at 3 o'clock
    const px = size - 4
    ctx.beginPath()
    ctx.moveTo(px, cy)
    ctx.lineTo(px - 24, cy - 12)
    ctx.lineTo(px - 24, cy + 12)
    ctx.closePath()
    ctx.fillStyle = '#1e1b4b'
    ctx.fill()
  }, [])

  useEffect(() => {
    if (people.length > 0) drawWheel(angleRef.current, people)
  }, [people, drawWheel])

  function spin() {
    if (spinning || people.length === 0) return
    setSpinning(true)
    setWinner(null)

    const segAngle = (2 * Math.PI) / people.length
    const winnerIdx = Math.floor(Math.random() * people.length)

    // Pointer is at 0 radians (3 o'clock). For segment `winnerIdx` to land there,
    // the rotation must satisfy: rotation + winnerIdx * segAngle + segAngle/2 ≡ 0 (mod 2π)
    const targetRemainder = -(winnerIdx * segAngle + segAngle / 2)
    const fullSpins = (5 + Math.floor(Math.random() * 3)) * 2 * Math.PI
    const totalDelta = -fullSpins + (targetRemainder - angleRef.current)
    const startAngle = angleRef.current
    const duration = 4000 + Math.random() * 1200
    const startTime = performance.now()

    function animate(now) {
      const t = Math.min((now - startTime) / duration, 1)
      angleRef.current = startAngle + totalDelta * easeOutQuart(t)
      drawWheel(angleRef.current, people)

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        setSpinning(false)
        setWinner(people[winnerIdx])
      }
    }

    animRef.current = requestAnimationFrame(animate)
  }

  async function handleAccept() {
    if (!winner) return
    setAccepting(true)
    try {
      const res = await fetch('/api/featured', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndex: winner.rowIndex }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to mark as featured')
      }
      const next = people.filter(p => p !== winner)
      setPeople(next)
      setWinner(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    )
  }

  if (error) {
    const isPermission = /share the sheet/i.test(error)
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center px-6">
        {isPermission ? (
          <>
            <p className="text-sm font-semibold text-foreground">Sheet not shared</p>
            <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
          </>
        ) : (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <button onClick={fetchPeople} className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
          Try again
        </button>
      </div>
    )
  }

  if (!loading && people.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
        <p className="text-lg font-semibold text-foreground">Everyone has been featured!</p>
        <p className="text-sm text-muted-foreground">No one left to spin for.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Featured</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Spin to pick who gets featured next · {people.length} remaining
        </p>
      </div>

      <div className="flex flex-col items-center gap-6">
        <canvas
          ref={canvasRef}
          width={420}
          height={420}
          className="max-w-full rounded-full"
        />

        {winner ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-2xl font-bold text-foreground">{winner.name}</p>
            <p className="text-sm text-muted-foreground">Selected to be featured</p>
            <div className="flex gap-3">
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {accepting ? 'Saving…' : 'Accept & mark as featured'}
              </button>
              <button
                onClick={() => setWinner(null)}
                className="rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={spin}
            disabled={spinning}
            className="rounded-lg bg-primary px-10 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {spinning ? 'Spinning…' : 'Spin the wheel'}
          </button>
        )}
      </div>
    </div>
  )
}
