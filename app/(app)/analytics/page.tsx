'use client'

import useSWR from 'swr'
import { useState } from 'react'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import { SunHorizon, Sun, CloudSun, MoonStars } from '@phosphor-icons/react'
import { formatMoney, formatDate } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const PERIODS = [
  { label: 'Этот месяц', from: () => startOfMonth(new Date()), to: () => endOfMonth(new Date()) },
  { label: 'Прошлый', from: () => startOfMonth(subMonths(new Date(), 1)), to: () => endOfMonth(subMonths(new Date(), 1)) },
]

const DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const TIME_SLOTS = [
  { key: 'morning',   label: 'Утро',   sub: '6–12',  icon: SunHorizon,  color: 'text-orange-300' },
  { key: 'afternoon', label: 'День',   sub: '12–17', icon: Sun,         color: 'text-yellow-300' },
  { key: 'evening',   label: 'Вечер',  sub: '17–22', icon: CloudSun,    color: 'text-amber-400'  },
  { key: 'night',     label: 'Ночь',   sub: '22–6',  icon: MoonStars,   color: 'text-indigo-300' },
]

const tooltipStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  borderRadius: '12px',
  color: '#111827',
  fontSize: 12,
  boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl px-5 py-4 relative overflow-hidden">
      <div className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      <h2 className="font-semibold text-sm text-gray-800 mb-4">{title}</h2>
      {children}
    </div>
  )
}

function formatK(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(0)}к`
  return `${v}`
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState(0)

  const from = PERIODS[period].from().toISOString()
  const to = PERIODS[period].to().toISOString()

  const { data: efficiency, isLoading: effLoading } = useSWR(
    `/api/analytics?type=efficiency&from=${from}&to=${to}`, fetcher
  )
  const { data: monthly, isLoading: monthlyLoading } = useSWR('/api/analytics?type=monthly', fetcher)

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Аналитика</h1>
        <div className="flex gap-1.5">
          {PERIODS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setPeriod(i)}
              className={`text-xs px-3.5 py-1.5 rounded-full border transition-all ${
                period === i
                  ? 'border-accent bg-accent text-gray-900'
                  : 'border-gray-200 text-gray-400 glass hover:text-gray-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Monthly income chart */}
      <Section title="Доход по месяцам">
        {monthlyLoading ? (
          <Skeleton className="h-44" />
        ) : Array.isArray(monthly) ? (
          <ResponsiveContainer width="100%" height={176}>
            <BarChart
              data={monthly}
              margin={{ top: 8, right: 4, left: -8, bottom: 0 }}
              barCategoryGap="30%"
              barGap={3}
            >
              <XAxis
                dataKey="label"
                tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#9CA3AF', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatK}
                width={32}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number, name: string) => [formatMoney(v), name === 'gross' ? 'Чистый доход' : 'Расходы']}
                labelStyle={{ color: '#6B7280', marginBottom: 4 }}
                itemStyle={{ color: '#111827' }}
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
              />
              <Bar dataKey="gross" name="gross" radius={[6, 6, 2, 2]} maxBarSize={40}>
                <LabelList
                  dataKey="gross"
                  position="top"
                  formatter={(v: number) => v > 0 ? formatK(v) : ''}
                  style={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 500 }}
                />
                {Array.isArray(monthly) && (monthly as { net: number }[]).map((entry, i) => (
                  <Cell key={i} fill={entry.net > 0 ? '#FFD21E' : 'rgba(239,68,68,0.7)'} />
                ))}
              </Bar>
              <Bar dataKey="expenses" name="expenses" fill="rgba(248,113,113,0.5)" radius={[4, 4, 2, 2]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        ) : null}
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-accent" />
            <span className="text-xs text-gray-400">Доход</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-danger/50" />
            <span className="text-xs text-gray-400">Расходы</span>
          </div>
        </div>
      </Section>

      {/* Time of day */}
      <Section title="₽/час по времени суток">
        {effLoading ? (
          <Skeleton className="h-28" />
        ) : efficiency?.byTimeOfDay ? (
          <div className="grid grid-cols-4 gap-2">
            {TIME_SLOTS.map(({ key, label, sub, icon: Icon, color }) => {
              const val = (efficiency.byTimeOfDay as Record<string, number>)[key] ?? 0
              const max = Math.max(...Object.values(efficiency.byTimeOfDay as Record<string, number>))
              const isMax = val > 0 && val === max
              return (
                <div
                  key={key}
                  className={`glass rounded-xl px-3 py-3 text-center transition-all ${isMax ? 'border border-accent/20 bg-accent/5' : ''}`}
                >
                  <div className="flex justify-center mb-1.5">
                    <Icon size={22} weight="fill" className={color} />
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium">{label}</p>
                  <p className="text-[10px] text-gray-300 mb-1.5">{sub}</p>
                  <p className={`text-sm font-bold tabular-nums ${isMax ? 'text-gray-900' : 'text-gray-700'}`}>
                    {val > 0 ? `${Math.round(val)}₽` : '—'}
                  </p>
                </div>
              )
            })}
          </div>
        ) : null}
      </Section>

      {/* Day of week */}
      <Section title="₽/час по дням недели">
        {effLoading ? (
          <Skeleton className="h-36" />
        ) : efficiency?.byDayOfWeek ? (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart
              data={DAYS.map((label, i) => ({
                label,
                value: Math.round((efficiency.byDayOfWeek as Record<string, number>)[i] ?? 0),
              }))}
              margin={{ top: 8, right: 4, left: -8, bottom: 0 }}
              barCategoryGap="35%"
            >
              <XAxis
                dataKey="label"
                tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#9CA3AF', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatK}
                width={32}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => [`${v} ₽/ч`, 'Доход/час']}
                labelStyle={{ color: '#6B7280', marginBottom: 4 }}
                itemStyle={{ color: '#111827' }}
                cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              />
              <Bar dataKey="value" radius={[5, 5, 2, 2]} maxBarSize={36}>
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(v: number) => v > 0 ? `${v}` : ''}
                  style={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 500 }}
                />
                {DAYS.map((_, i) => (
                  <Cell key={i} fill={i === 0 || i === 6 ? 'rgba(251,191,36,0.7)' : 'rgba(96,165,250,0.7)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : null}
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-info/70" />
            <span className="text-xs text-gray-400">Будни</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-warning/70" />
            <span className="text-xs text-gray-400">Выходные</span>
          </div>
        </div>
      </Section>

      {/* Top shifts */}
      {efficiency?.topShifts?.length > 0 && (
        <Section title="Лучшие смены по ₽/час">
          <div className="space-y-3">
            {efficiency.topShifts.map((s: {
              id: string; date: string; netEarnings: number; distanceKm: number; incomePerHour: number
            }, i: number) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className={`text-xs font-bold w-5 text-center ${i === 0 ? 'text-warning' : 'text-gray-300'}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-800">{formatDate(s.date)}</span>
                    <span className="text-gray-900 font-bold text-sm tabular-nums">{formatMoney(s.netEarnings)}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{Math.round(s.incomePerHour)} ₽/ч · {s.distanceKm} км</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
