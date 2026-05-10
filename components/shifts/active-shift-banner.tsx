'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Play, ChevronRight } from 'lucide-react'
import { formatMoney } from '@/lib/utils'
import Link from 'next/link'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function useTimer(startTime: string | null) {
  const [elapsed, setElapsed] = useState('')
  useEffect(() => {
    if (!startTime) return
    const update = () => {
      const diff = Date.now() - new Date(startTime).getTime()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setElapsed(`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [startTime])
  return elapsed
}

export function ActiveShiftBanner() {
  const { data: shift } = useSWR('/api/shifts/active', fetcher, { refreshInterval: 5000 })
  const timer = useTimer(shift?.startTime ?? null)

  if (!shift) return null

  const gross = (shift.grossEarnings ?? 0) + (shift.bonuses ?? 0) + (shift.tips ?? 0)

  return (
    <Link
      href="/shifts/live"
      className="glass-accent rounded-3xl px-5 py-4 flex items-center justify-between animate-fade-in relative overflow-hidden block"
    >
      {/* Top shine */}
      <div className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
          <div className="absolute inset-0 rounded-full bg-accent/30 scale-150 animate-pulse" />
        </div>
        <div>
          <p className="text-sm font-bold text-accent">Смена идёт</p>
          <p className="text-xs text-white/35 mt-0.5 tabular-nums">{timer}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-base font-bold tabular-nums">{formatMoney(gross)}</p>
          <p className="text-xs text-white/30">{shift.ordersCount ?? 0} зак.</p>
        </div>
        <ChevronRight size={16} className="text-white/25" />
      </div>
    </Link>
  )
}

export function StartShiftButton() {
  const { data: shift, mutate } = useSWR('/api/shifts/active', fetcher)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  if (shift) return null

  async function start() {
    setLoading(true)
    try {
      const res = await fetch('/api/shifts/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      if (res.ok) {
        mutate()
        router.push('/shifts/live')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={start}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2.5 bg-accent text-black font-bold rounded-2xl py-4 text-sm disabled:opacity-60 relative overflow-hidden group transition-all active:scale-[0.98]"
    >
      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      <Play size={15} fill="black" />
      {loading ? 'Запускаем...' : 'Начать смену'}
    </button>
  )
}
