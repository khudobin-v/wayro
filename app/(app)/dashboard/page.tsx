'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Plus, TrendingUp, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { formatMoney, formatDate, getDurationHours } from '@/lib/utils'
import { DashboardSkeleton } from '@/components/ui/skeleton'
import { useState } from 'react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function MonthPicker({ date, onChange }: { date: Date; onChange: (d: Date) => void }) {
  const label = format(date, 'LLLL yyyy', { locale: ru })
  return (
    <div className="glass rounded-full flex items-center px-1 py-1 gap-1">
      <button
        onClick={() => onChange(subMonths(date, 1))}
        className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 transition-all"
      >
        <ChevronLeft size={14} />
      </button>
      <span className="text-sm font-semibold capitalize text-white/80 px-2 min-w-[120px] text-center">
        {label}
      </span>
      <button
        onClick={() => onChange(subMonths(date, -1))}
        className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 transition-all disabled:opacity-20"
        disabled={date >= startOfMonth(new Date())}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  )
}

function ReserveBar({ name, balance, goal }: { name: string; balance: number; goal?: number | null }) {
  const pct = goal ? Math.min(100, (balance / goal) * 100) : null
  const critical = pct !== null && pct < 20
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium truncate text-white/80">{name}</span>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          {critical && <AlertTriangle size={11} className="text-danger" />}
          <span className="text-sm tabular-nums font-semibold">{formatMoney(balance)}</span>
          {goal && <span className="text-xs text-white/25">/ {formatMoney(goal)}</span>}
        </div>
      </div>
      {pct !== null && (
        <div className="h-1 bg-white/8 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${critical ? 'bg-danger' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const [month, setMonth] = useState(new Date())
  const from = startOfMonth(month).toISOString()
  const to = endOfMonth(month).toISOString()

  const { data, isLoading } = useSWR(
    `/api/analytics?type=dashboard&from=${from}&to=${to}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  const header = (
    <div className="flex items-center justify-between">
      <MonthPicker date={month} onChange={setMonth} />
    </div>
  )

  if (isLoading || !data || !data.totals) {
    return (
      <div className="space-y-4">
        <DashboardSkeleton />
      </div>
    )
  }

  const { totals, metrics, forecast, reserves, recentShifts } = data
  const netPositive = totals.net >= 0
  const progressPct = forecast.targetMonthlyIncome
    ? Math.min(100, (totals.net / forecast.targetMonthlyIncome) * 100)
    : null

  return (
    <div className="animate-fade-in space-y-4">
      {/* Month picker — centered row */}
      <div className="flex justify-center">
        <MonthPicker date={month} onChange={setMonth} />
      </div>

      {/* Desktop: 2-column grid / Mobile: single column */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">

        {/* LEFT COLUMN — main content */}
        <div className="md:col-span-3 space-y-3">

          {/* Main metric */}
          <div className="glass-heavy rounded-3xl px-6 py-6 relative overflow-hidden">
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <p className="text-[10px] text-white/35 font-semibold uppercase tracking-widest mb-2">Чистый доход</p>
            <p className={`text-5xl font-extrabold tabular-nums tracking-tight ${netPositive ? 'text-accent' : 'text-danger'}`}>
              {formatMoney(totals.net)}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-white/35">
              <span>Выплата <span className="text-white/65 font-semibold">{formatMoney(totals.gross)}</span></span>
              <span>Расходы <span className="text-danger/80 font-semibold">−{formatMoney(totals.expenses)}</span></span>
              <span>Резервы <span className="text-warning/80 font-semibold">−{formatMoney(totals.reserves)}</span></span>
            </div>
            {progressPct !== null && (
              <div className="mt-5">
                <div className="flex justify-between text-[11px] text-white/25 mb-2">
                  <span>Цель {formatMoney(forecast.targetMonthlyIncome)}</span>
                  <span className="font-semibold text-white/40">{Math.round(progressPct)}%</span>
                </div>
                <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Recent shifts */}
          <div className="glass rounded-3xl px-5 py-4 relative overflow-hidden">
            <div className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm text-white/80">Последние смены</h2>
              <Link href="/shifts" className="text-xs text-accent/80 hover:text-accent transition-colors">Все →</Link>
            </div>
            {recentShifts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-white/25 text-sm mb-4">Смен ещё нет</p>
                <Link href="/shifts/new" className="inline-flex items-center gap-1.5 bg-accent text-black text-xs font-bold px-5 py-2.5 rounded-full">
                  <Plus size={13} /> Добавить первую
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentShifts.map((s: {
                  id: string; date: string; netEarnings: number; distanceKm: number; startTime?: string; endTime?: string
                }) => {
                  const hours = s.startTime && s.endTime ? getDurationHours(s.startTime, s.endTime) : null
                  const iph = hours && hours >= 0.25 ? s.netEarnings / hours : null
                  return (
                    <Link
                      key={s.id}
                      href={`/shifts/${s.id}/edit`}
                      className="flex items-center justify-between py-3 hover:bg-white/3 -mx-1 px-1 rounded-xl transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-white/85">{formatDate(s.date)}</p>
                        <p className="text-xs text-white/25 mt-0.5">
                          {s.distanceKm} км{iph ? ` · ${Math.round(iph)} ₽/ч` : ''}
                        </p>
                      </div>
                      <span className="text-accent font-bold text-sm tabular-nums">{formatMoney(s.netEarnings)}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN — metrics & reserves */}
        <div className="md:col-span-2 space-y-3">

          {/* Metric cards — vertical on desktop, horizontal scroll on mobile */}
          <div className="hidden md:grid grid-cols-2 gap-2.5">
            {[
              { label: 'Смен', value: metrics.shiftsCount.toString(), sub: `${Math.round(metrics.totalKm)} км` },
              { label: '₽/час', value: metrics.incomePerHour > 0 ? `${Math.round(metrics.incomePerHour)} ₽` : '—', sub: `${Math.round(metrics.hoursWorked)} ч работы` },
              { label: '₽/км', value: metrics.incomePerKm > 0 ? `${metrics.incomePerKm.toFixed(1)} ₽` : '—', sub: 'доход на км' },
              { label: 'Прогноз', value: formatMoney(Math.round(forecast.byRate)), sub: 'при текущем темпе' },
            ].map((m) => (
              <div key={m.label} className="glass rounded-2xl px-4 py-3.5">
                <p className="text-[10px] text-white/35 font-semibold uppercase tracking-widest mb-1.5">{m.label}</p>
                <p className="text-base font-bold tabular-nums">{m.value}</p>
                {m.sub && <p className="text-[11px] text-white/25 mt-1">{m.sub}</p>}
              </div>
            ))}
          </div>

          {/* Mobile: horizontal scroll metric cards */}
          <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none md:hidden">
            {[
              { label: 'Смен', value: metrics.shiftsCount.toString(), sub: `${Math.round(metrics.totalKm)} км` },
              { label: '₽/час', value: metrics.incomePerHour > 0 ? `${Math.round(metrics.incomePerHour)} ₽` : '—', sub: `${Math.round(metrics.hoursWorked)} ч работы` },
              { label: '₽/км', value: metrics.incomePerKm > 0 ? `${metrics.incomePerKm.toFixed(1)} ₽` : '—', sub: 'доход на км' },
              { label: 'Прогноз', value: formatMoney(Math.round(forecast.byRate)), sub: 'при текущем темпе' },
            ].map((m) => (
              <div key={m.label} className="flex-shrink-0 glass rounded-2xl px-4 py-3.5 min-w-[130px]">
                <p className="text-[10px] text-white/35 font-semibold uppercase tracking-widest mb-1.5">{m.label}</p>
                <p className="text-base font-bold tabular-nums">{m.value}</p>
                {m.sub && <p className="text-[11px] text-white/25 mt-1">{m.sub}</p>}
              </div>
            ))}
          </div>

          {/* Reserves */}
          {reserves.length > 0 && (
            <div className="glass rounded-3xl px-5 py-4 relative overflow-hidden">
              <div className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-sm text-white/80">Резервы</h2>
                <Link href="/reserves" className="text-xs text-accent/80 hover:text-accent transition-colors">Все →</Link>
              </div>
              <div className="space-y-4">
                {reserves.map((r: { id: string; name: string; balance: number; goal?: number }) => (
                  <ReserveBar key={r.id} name={r.name} balance={r.balance} goal={r.goal} />
                ))}
              </div>
            </div>
          )}

          {/* Forecast */}
          <div className="glass rounded-2xl px-5 py-4 flex items-center gap-3 relative overflow-hidden">
            <div className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/15 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={16} className="text-accent" />
            </div>
            <div>
              <p className="text-[11px] text-white/30">Прогноз по среднему</p>
              <p className="text-sm font-bold mt-0.5">{formatMoney(Math.round(forecast.byShifts))}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
