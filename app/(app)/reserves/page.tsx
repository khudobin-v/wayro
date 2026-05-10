'use client'

import useSWR from 'swr'
import { useState } from 'react'
import { Plus, Minus, ChevronDown, ChevronUp, Settings2 } from 'lucide-react'
import { formatMoney, formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const RESERVE_TYPES = [
  { key: 'maintenance', label: 'ТО (по пробегу)' },
  { key: 'tax', label: 'Налоговый' },
  { key: 'tires', label: 'На шины' },
  { key: 'insurance', label: 'На страховку' },
  { key: 'custom', label: 'Произвольный' },
]

interface Reserve {
  id: string
  name: string
  type: string
  balance: number
  goal?: number
  taxPercent?: number
  costPerEvent?: number
  intervalKm?: number
  intervalMonths?: number
  entries: { id: string; amount: number; type: string; comment?: string; createdAt: string }[]
}

function ReserveCard({ reserve, onWithdraw, onRefresh }: { reserve: Reserve; onWithdraw: (r: Reserve) => void; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const pct = reserve.goal ? Math.min(100, (reserve.balance / reserve.goal) * 100) : null
  const critical = pct !== null && pct < 20

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="px-4 py-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-semibold text-sm">{reserve.name}</p>
            <p className="text-xs text-white/30 mt-0.5">{RESERVE_TYPES.find((t) => t.key === reserve.type)?.label}</p>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold tabular-nums ${critical ? 'text-danger' : 'text-accent'}`}>
              {formatMoney(reserve.balance)}
            </p>
            {reserve.goal && (
              <p className="text-xs text-white/30">из {formatMoney(reserve.goal)}</p>
            )}
          </div>
        </div>

        {pct !== null && (
          <div className="mb-3">
            <div className="h-2 bg-white/8 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${critical ? 'bg-danger' : 'bg-accent'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-white/30 mt-1">{Math.round(pct)}% накоплено</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => onWithdraw(reserve)}
            className="flex-1 glass border border-white/8 rounded-xl py-2 text-xs text-white/40 hover:text-white flex items-center justify-center gap-1.5"
          >
            <Minus size={12} /> Списать
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="px-3 glass border border-white/8 rounded-xl py-2 text-xs text-white/40 hover:text-white flex items-center gap-1"
          >
            История {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {expanded && reserve.entries.length > 0 && (
        <div className="border-t border-white/6 px-4 py-3 space-y-2">
          {reserve.entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between text-xs">
              <div>
                <span className={e.type === 'accrual' ? 'text-accent' : 'text-danger'}>
                  {e.type === 'accrual' ? '+' : '−'}{formatMoney(e.amount)}
                </span>
                {e.comment && <span className="text-white/30 ml-2">{e.comment}</span>}
              </div>
              <span className="text-white/20">{formatDate(e.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ReservesPage() {
  const { toast } = useToast()
  const [showCreate, setShowCreate] = useState(false)
  const [withdrawTarget, setWithdrawTarget] = useState<Reserve | null>(null)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawComment, setWithdrawComment] = useState('')
  const [loading, setLoading] = useState(false)

  const [newReserve, setNewReserve] = useState({
    name: '',
    type: 'maintenance',
    goal: '',
    costPerEvent: '',
    intervalKm: '',
    taxPercent: '',
    intervalMonths: '',
  })

  const { data: reserves, isLoading, mutate } = useSWR<Reserve[]>('/api/reserves', fetcher)

  async function createReserve(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/reserves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newReserve.name,
          type: newReserve.type,
          goal: parseFloat(newReserve.goal) || null,
          costPerEvent: parseFloat(newReserve.costPerEvent) || null,
          intervalKm: parseFloat(newReserve.intervalKm) || null,
          taxPercent: parseFloat(newReserve.taxPercent) || null,
          intervalMonths: parseFloat(newReserve.intervalMonths) || null,
        }),
      })
      if (res.ok) {
        toast('Резерв создан', 'success')
        setShowCreate(false)
        setNewReserve({ name: '', type: 'maintenance', goal: '', costPerEvent: '', intervalKm: '', taxPercent: '', intervalMonths: '' })
        mutate()
      } else {
        const d = await res.json()
        toast(d.error || 'Ошибка', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault()
    if (!withdrawTarget) return
    setLoading(true)
    try {
      const res = await fetch(`/api/reserves/${withdrawTarget.id}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(withdrawAmount), comment: withdrawComment || null }),
      })
      if (res.ok) {
        toast('Списание выполнено', 'success')
        setWithdrawTarget(null)
        setWithdrawAmount('')
        setWithdrawComment('')
        mutate()
      } else {
        const d = await res.json()
        toast(d.error || 'Ошибка', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const inp = 'w-full glass rounded-xl px-4 py-3 text-sm placeholder:text-white/20 focus:outline-none focus:border-accent/30 transition-colors'

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Резервы</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-accent text-black text-sm font-semibold px-4 py-2 rounded-full"
        >
          <Plus size={16} /> Создать
        </button>
      </div>

      {isLoading && <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>}

      {!isLoading && reserves?.length === 0 && (
        <div className="text-center py-16">
          <p className="text-white/30 mb-2 text-sm">Резервов нет</p>
          <p className="text-white/20 text-xs mb-5">Создайте резервы для ТО, налогов, шин</p>
          <button onClick={() => setShowCreate(true)} className="bg-accent text-black text-sm font-semibold px-5 py-2.5 rounded-full inline-flex items-center gap-1.5">
            <Plus size={16} /> Создать резерв
          </button>
        </div>
      )}

      <div className="space-y-3">
        {reserves?.map((r) => (
          <ReserveCard key={r.id} reserve={r} onWithdraw={setWithdrawTarget} onRefresh={mutate} />
        ))}
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Новый резерв">
        <form onSubmit={createReserve} className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Название *</label>
            <input type="text" placeholder="Например: Резерв на ТО" value={newReserve.name} onChange={(e) => setNewReserve((f) => ({ ...f, name: e.target.value }))} required className={inp} />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Тип</label>
            <select value={newReserve.type} onChange={(e) => setNewReserve((f) => ({ ...f, type: e.target.value }))} className={inp + ' appearance-none'}>
              {RESERVE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Цель накопления (₽)</label>
            <input type="number" inputMode="decimal" placeholder="0" value={newReserve.goal} onChange={(e) => setNewReserve((f) => ({ ...f, goal: e.target.value }))} className={inp} />
          </div>

          {newReserve.type === 'maintenance' && (
            <>
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Стоимость ТО (₽)</label>
                <input type="number" inputMode="decimal" placeholder="0" value={newReserve.costPerEvent} onChange={(e) => setNewReserve((f) => ({ ...f, costPerEvent: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Интервал (км)</label>
                <input type="number" inputMode="decimal" placeholder="10000" value={newReserve.intervalKm} onChange={(e) => setNewReserve((f) => ({ ...f, intervalKm: e.target.value }))} className={inp} />
              </div>
            </>
          )}

          {newReserve.type === 'tax' && (
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Процент от заработка</label>
              <input type="number" inputMode="decimal" placeholder="6" value={newReserve.taxPercent} onChange={(e) => setNewReserve((f) => ({ ...f, taxPercent: e.target.value }))} className={inp} />
            </div>
          )}

          {(['tires', 'insurance', 'custom'] as const).includes(newReserve.type as 'tires' | 'insurance' | 'custom') && (
            <>
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Сумма события (₽)</label>
                <input type="number" inputMode="decimal" placeholder="0" value={newReserve.costPerEvent} onChange={(e) => setNewReserve((f) => ({ ...f, costPerEvent: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Интервал (месяцев)</label>
                <input type="number" inputMode="decimal" placeholder="6" value={newReserve.intervalMonths} onChange={(e) => setNewReserve((f) => ({ ...f, intervalMonths: e.target.value }))} className={inp} />
              </div>
            </>
          )}

          <button type="submit" disabled={loading} className="w-full bg-accent text-black font-bold rounded-2xl py-3.5 text-sm disabled:opacity-60">
            {loading ? 'Создаём...' : 'Создать резерв'}
          </button>
        </form>
      </Modal>

      {/* Withdraw modal */}
      <Modal open={!!withdrawTarget} onClose={() => { setWithdrawTarget(null); setWithdrawAmount(''); setWithdrawComment('') }} title={`Списание: ${withdrawTarget?.name}`}>
        <form onSubmit={handleWithdraw} className="px-5 py-4 space-y-3">
          <div className="glass rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-white/30 mb-1">Доступно</p>
            <p className="text-xl font-bold text-accent">{withdrawTarget ? formatMoney(withdrawTarget.balance) : '—'}</p>
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Сумма списания (₽) *</label>
            <input type="number" inputMode="decimal" placeholder="0" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} required className={inp} />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Комментарий</label>
            <input type="text" placeholder="На что потрачено" value={withdrawComment} onChange={(e) => setWithdrawComment(e.target.value)} className={inp} />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-danger text-white font-bold rounded-2xl py-3.5 text-sm disabled:opacity-60">
            {loading ? 'Списываем...' : 'Списать'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
