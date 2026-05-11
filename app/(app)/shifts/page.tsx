'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { useState } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ru } from 'date-fns/locale'
import { formatMoney, formatDate, getDurationHours } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { Skeleton } from '@/components/ui/skeleton'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const PERIODS = [
  { label: 'Этот месяц', from: () => startOfMonth(new Date()), to: () => endOfMonth(new Date()) },
  { label: 'Прошлый', from: () => startOfMonth(subMonths(new Date(), 1)), to: () => endOfMonth(subMonths(new Date(), 1)) },
  { label: 'Все', from: () => new Date('2020-01-01'), to: () => new Date('2099-12-31') },
]

export default function ShiftsPage() {
  const [period, setPeriod] = useState(0)
  const { toast } = useToast()

  const from = PERIODS[period].from().toISOString()
  const to = PERIODS[period].to().toISOString()

  const { data: shifts, isLoading, mutate } = useSWR<{
    id: string
    date: string
    netEarnings: number
    grossEarnings: number
    distanceKm: number
    startTime?: string
    endTime?: string
    ordersCount?: number
  }[]>(
    `/api/shifts?from=${from}&to=${to}`,
    fetcher
  )

  async function deleteShift(id: string) {
    if (!confirm('Удалить смену? Начисления в резервы будут отменены.')) return
    const res = await fetch(`/api/shifts/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast('Смена удалена', 'success')
      mutate()
    } else {
      toast('Ошибка удаления', 'error')
    }
  }

  const totalNet = shifts?.reduce((s, x) => s + x.netEarnings, 0) ?? 0
  const totalKm = shifts?.reduce((s, x) => s + x.distanceKm, 0) ?? 0

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Смены</h1>
        <Link
          href="/shifts/new"
          className="flex items-center gap-1.5 bg-accent text-black text-sm font-semibold px-4 py-2 rounded-full"
        >
          <Plus size={16} /> Добавить
        </Link>
      </div>

      {/* Period filter */}
      <div className="flex gap-2">
        {PERIODS.map((p, i) => (
          <button
            key={p.label}
            onClick={() => setPeriod(i)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              period === i ? 'border-accent/50 bg-accent/10 text-accent' : 'border-white/8 text-white/35 glass hover:text-white/60'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Totals */}
      {shifts && shifts.length > 0 && (
        <div className="relative overflow-hidden flex gap-3 text-sm glass rounded-2xl px-4 py-3">
          <div className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
          <div className="flex-1">
            <p className="text-xs text-white/30 mb-0.5">Итого чистыми</p>
            <p className="font-bold text-accent tabular-nums">{formatMoney(totalNet)}</p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-white/30 mb-0.5">Смен</p>
            <p className="font-bold">{shifts.length}</p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-white/30 mb-0.5">Км всего</p>
            <p className="font-bold tabular-nums">{Math.round(totalKm)}</p>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      )}

      {!isLoading && shifts?.length === 0 && (
        <div className="text-center py-16">
          <p className="text-white/30 mb-4">Смен нет</p>
          <Link href="/shifts/new" className="bg-accent text-black text-sm font-semibold px-5 py-2.5 rounded-full inline-flex items-center gap-1.5">
            <Plus size={16} /> Добавить смену
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {shifts?.map((s) => {
          const hours = s.startTime && s.endTime ? getDurationHours(s.startTime, s.endTime) : null
          const iph = hours && hours > 0 ? s.netEarnings / hours : null
          return (
            <div key={s.id} className="glass rounded-2xl px-4 py-3.5 flex items-center gap-3">
              <Link href={`/shifts/${s.id}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{formatDate(s.date)}</p>
                  {s.ordersCount && (
                    <span className="text-[10px] text-white/30 border border-white/8 rounded px-1.5 py-0.5">{s.ordersCount} зак.</span>
                  )}
                </div>
                <p className="text-xs text-white/30 mt-0.5">
                  {s.distanceKm} км
                  {iph ? ` · ${Math.round(iph)} ₽/ч` : ''}
                  {hours ? ` · ${hours.toFixed(1)} ч` : ''}
                </p>
              </Link>
              <div className="flex items-center gap-3">
                <span className="text-accent font-bold text-sm tabular-nums">{formatMoney(s.netEarnings)}</span>
                <Link href={`/shifts/${s.id}/edit`} className="text-white/20 hover:text-white/60 p-1">
                  <Pencil size={14} />
                </Link>
                <button onClick={() => deleteShift(s.id)} className="text-white/20 hover:text-danger p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
