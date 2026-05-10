'use client'

import useSWR from 'swr'
import { useState } from 'react'
import { Plus, Trash2, Fuel, Wrench, WashingMachine, Phone, Utensils, MoreHorizontal } from 'lucide-react'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { formatMoney, formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const CATEGORIES = [
  { key: 'fuel',         label: 'Топливо',   icon: Fuel,            color: 'text-amber-400',  hex: '#FBBF24' },
  { key: 'maintenance',  label: 'ТО/ремонт', icon: Wrench,          color: 'text-blue-400',   hex: '#60A5FA' },
  { key: 'wash',         label: 'Мойка',     icon: WashingMachine,  color: 'text-sky-400',    hex: '#38BDF8' },
  { key: 'communication',label: 'Связь',     icon: Phone,           color: 'text-purple-400', hex: '#C084FC' },
  { key: 'food',         label: 'Питание',   icon: Utensils,        color: 'text-orange-400', hex: '#FB923C' },
  { key: 'other',        label: 'Прочее',    icon: MoreHorizontal,  color: 'text-white/40',   hex: '#6B7280' },
]

const catMap = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]))

const PERIODS = [
  { label: 'Этот месяц', from: () => startOfMonth(new Date()), to: () => endOfMonth(new Date()) },
  { label: 'Прошлый',    from: () => startOfMonth(subMonths(new Date(), 1)), to: () => endOfMonth(subMonths(new Date(), 1)) },
  { label: 'Все',        from: () => new Date('2020-01-01'), to: () => new Date('2099-12-31') },
]

interface ExpenseFormState {
  date: string; category: string; amount: string; comment: string
  liters: string; pricePerLiter: string; fuelMode: 'amount' | 'liters'
}

const tooltipStyle = {
  backgroundColor: 'rgba(10,14,22,0.95)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  color: '#fff',
  fontSize: 12,
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
}

export default function ExpensesPage() {
  const [period, setPeriod] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const { toast } = useToast()
  const [form, setForm] = useState<ExpenseFormState>({
    date: '', category: 'fuel', amount: '', comment: '', liters: '', pricePerLiter: '', fuelMode: 'amount',
  })
  const [loading, setLoading] = useState(false)

  const from = PERIODS[period].from().toISOString()
  const to = PERIODS[period].to().toISOString()

  const { data: expenses, isLoading, mutate } = useSWR<{
    id: string; date: string; category: string; amount: number; comment?: string; liters?: number; pricePerLiter?: number
  }[]>(`/api/expenses?from=${from}&to=${to}`, fetcher)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.date) { toast('Укажите дату', 'error'); return }
    setLoading(true)
    try {
      let amount = parseFloat(form.amount) || 0
      const liters = parseFloat(form.liters) || null
      const pricePerLiter = parseFloat(form.pricePerLiter) || null
      if (form.category === 'fuel' && form.fuelMode === 'liters' && liters && pricePerLiter) {
        amount = liters * pricePerLiter
      }
      if (amount <= 0) { toast('Укажите сумму', 'error'); setLoading(false); return }
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date(form.date).toISOString(), category: form.category, amount,
          comment: form.comment || null,
          liters: form.fuelMode === 'liters' ? liters : null,
          pricePerLiter: form.fuelMode === 'liters' ? pricePerLiter : null,
        }),
      })
      if (res.ok) {
        toast('Расход добавлен', 'success')
        setShowForm(false)
        setForm({ date: '', category: 'fuel', amount: '', comment: '', liters: '', pricePerLiter: '', fuelMode: 'amount' })
        mutate()
      } else {
        const data = await res.json()
        toast(data.error || 'Ошибка', 'error')
      }
    } finally { setLoading(false) }
  }

  async function deleteExpense(id: string) {
    if (!confirm('Удалить расход?')) return
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    if (res.ok) { toast('Удалено', 'success'); mutate() }
    else toast('Ошибка', 'error')
  }

  const totalByCategory = expenses
    ? CATEGORIES.map((cat) => ({
        ...cat,
        total: expenses.filter((e) => e.category === cat.key).reduce((s, e) => s + e.amount, 0),
      })).filter((c) => c.total > 0)
    : []

  const total = expenses?.reduce((s, e) => s + e.amount, 0) ?? 0
  const inp = 'w-full glass rounded-xl px-4 py-3 text-sm placeholder:text-white/20 focus:outline-none focus:border-accent/30 transition-colors'

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Расходы</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-accent text-black text-sm font-semibold px-4 py-2 rounded-full"
        >
          <Plus size={16} /> Добавить
        </button>
      </div>

      <div className="flex gap-2">
        {PERIODS.map((p, i) => (
          <button key={p.label} onClick={() => setPeriod(i)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              period === i ? 'border-accent/50 bg-accent/10 text-accent' : 'border-white/8 text-white/35 glass hover:text-white/60'
            }`}
          >{p.label}</button>
        ))}
      </div>

      {/* Chart + summary */}
      {isLoading ? (
        <Skeleton className="h-48 rounded-3xl" />
      ) : total > 0 ? (
        <div className="glass rounded-3xl px-5 py-4 relative overflow-hidden">
          <div className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />

            {/* Bar chart */}
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={totalByCategory} barCategoryGap="30%" margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  formatter={(v: number) => [formatMoney(v), '']}
                  labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {totalByCategory.map((cat) => (
                    <Cell key={cat.key} fill={cat.hex} opacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="mt-3 space-y-1.5">
            {totalByCategory.map((cat) => {
              const pct = Math.round((cat.total / total) * 100)
              return (
                <div key={cat.key} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.hex }} />
                  <span className="text-xs text-white/50 truncate flex-1">{cat.label}</span>
                  <span className="text-xs text-white/30 tabular-nums">{pct}%</span>
                  <span className="text-xs font-semibold tabular-nums">{formatMoney(cat.total)}</span>
                </div>
              )
            })}
          </div>

          {/* Category bar */}
          <div className="mt-3 h-1.5 rounded-full overflow-hidden flex gap-px">
            {totalByCategory.map((cat) => (
              <div
                key={cat.key}
                className="h-full rounded-full transition-all"
                style={{ width: `${(cat.total / total) * 100}%`, background: cat.hex, opacity: 0.8 }}
              />
            ))}
          </div>
        </div>
      ) : null}

      {isLoading && !total && (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
      )}

      {!isLoading && expenses?.length === 0 && (
        <div className="text-center py-16">
          <p className="text-white/30 mb-4">Расходов нет</p>
          <button onClick={() => setShowForm(true)} className="bg-accent text-black text-sm font-semibold px-5 py-2.5 rounded-full inline-flex items-center gap-1.5">
            <Plus size={16} /> Добавить расход
          </button>
        </div>
      )}

      <div className="space-y-2">
        {expenses?.map((e) => {
          const cat = catMap[e.category]
          const Icon = cat?.icon ?? MoreHorizontal
          return (
            <div key={e.id} className="glass rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                <Icon size={15} className={cat?.color ?? 'text-white/40'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{cat?.label ?? e.category}</p>
                <p className="text-xs text-white/30">{formatDate(e.date)}{e.comment ? ` · ${e.comment}` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/80 font-semibold text-sm tabular-nums">{formatMoney(e.amount)}</span>
                <button onClick={() => deleteExpense(e.id)} className="text-white/20 hover:text-danger p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Новый расход">
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs text-white/35 mb-1.5 font-medium">Дата *</label>
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inp} required />
          </div>
          <div>
            <label className="block text-xs text-white/35 mb-1.5 font-medium">Категория</label>
            <div className="grid grid-cols-3 gap-1.5">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon
                return (
                  <button key={cat.key} type="button"
                    onClick={() => setForm((f) => ({ ...f, category: cat.key }))}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs transition-colors ${
                      form.category === cat.key ? 'border-accent/50 bg-accent/10 text-accent' : 'border-white/8 text-white/35 glass'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          {form.category === 'fuel' && (
            <div>
              <div className="flex gap-2 mb-2">
                {(['amount', 'liters'] as const).map((mode) => (
                  <button key={mode} type="button"
                    onClick={() => setForm((f) => ({ ...f, fuelMode: mode }))}
                    className={`text-xs px-3 py-1.5 rounded-full border ${form.fuelMode === mode ? 'border-accent/50 bg-accent/10 text-accent' : 'border-white/8 text-white/35 glass'}`}
                  >
                    {mode === 'amount' ? 'Сумма' : 'Литры × цена'}
                  </button>
                ))}
              </div>
              {form.fuelMode === 'liters' ? (
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" inputMode="decimal" placeholder="Литры" value={form.liters} onChange={(e) => setForm((f) => ({ ...f, liters: e.target.value }))} className={inp} />
                  <input type="number" inputMode="decimal" placeholder="₽/литр" value={form.pricePerLiter} onChange={(e) => setForm((f) => ({ ...f, pricePerLiter: e.target.value }))} className={inp} />
                </div>
              ) : (
                <input type="number" inputMode="decimal" placeholder="Сумма, ₽" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className={inp} />
              )}
            </div>
          )}
          {form.category !== 'fuel' && (
            <div>
              <label className="block text-xs text-white/35 mb-1.5 font-medium">Сумма, ₽ *</label>
              <input type="number" inputMode="decimal" placeholder="0" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className={inp} />
            </div>
          )}
          <div>
            <label className="block text-xs text-white/35 mb-1.5 font-medium">Комментарий{form.category === 'other' ? ' *' : ''}</label>
            <input type="text" placeholder="Описание..." value={form.comment} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} className={inp} required={form.category === 'other'} />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-accent text-black font-bold rounded-2xl py-3.5 text-sm disabled:opacity-50 mt-1 active:scale-[0.98] transition-transform">
            {loading ? 'Сохраняем...' : 'Добавить расход'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
