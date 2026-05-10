'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Trash2, ChevronLeft, CheckCircle, XCircle } from 'lucide-react'
import { formatMoney } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { Modal } from '@/components/ui/modal'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const TYPE_COLORS: Record<string, string> = {
  delivery: 'text-accent',
  bonus: 'text-blue-400',
  tip: 'text-amber-400',
}
const TYPE_LABELS: Record<string, string> = { delivery: 'Доставка', bonus: 'Бонус', tip: 'Чаевые' }

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

function Numpad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const press = (key: string) => {
    if (key === '⌫') { onChange(value.slice(0, -1) || '0'); return }
    if (key === '.' && value.includes('.')) return
    if (key === '.' && value === '0') { onChange('0.'); return }
    if (value === '0' && key !== '.') { onChange(key); return }
    if (value.includes('.') && value.split('.')[1]?.length >= 2) return
    onChange(value + key)
  }
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫']

  return (
    <div className="grid grid-cols-3 gap-2.5 px-2">
      {keys.map((k) => (
        <button
          key={k}
          onPointerDown={(e) => { e.preventDefault(); press(k) }}
          className={`h-14 rounded-2xl text-xl font-semibold flex items-center justify-center transition-all active:scale-95 active:bg-white/10 glass ${
            k === '⌫' ? 'text-white/35' : 'text-white'
          }`}
        >
          {k}
        </button>
      ))}
    </div>
  )
}

function FinishModal({ open, onClose, onFinish, loading }: {
  open: boolean
  onClose: () => void
  onFinish: (data: { distanceKm: string; parkCommission: string; serviceCommission: string; comment: string }) => void
  loading: boolean
}) {
  const [form, setForm] = useState({ distanceKm: '', parkCommission: '0', serviceCommission: '0', comment: '' })
  const inp = 'w-full glass rounded-xl px-4 py-3 text-sm placeholder:text-white/20 focus:outline-none focus:border-accent/40 tabular-nums border-transparent'

  return (
    <Modal open={open} onClose={onClose} title="Завершить смену">
      <div className="px-5 py-4 space-y-3">
        <div>
          <label className="block text-xs text-white/35 mb-1.5 font-medium">Пробег за смену (км) *</label>
          <input type="number" inputMode="decimal" placeholder="0" value={form.distanceKm}
            onChange={(e) => setForm((f) => ({ ...f, distanceKm: e.target.value }))} className={inp} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-white/35 mb-1.5 font-medium">Комиссия парка</label>
            <input type="number" inputMode="decimal" placeholder="0" value={form.parkCommission}
              onChange={(e) => setForm((f) => ({ ...f, parkCommission: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className="block text-xs text-white/35 mb-1.5 font-medium">Комиссия сервиса</label>
            <input type="number" inputMode="decimal" placeholder="0" value={form.serviceCommission}
              onChange={(e) => setForm((f) => ({ ...f, serviceCommission: e.target.value }))} className={inp} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-white/35 mb-1.5 font-medium">Комментарий</label>
          <input type="text" placeholder="Заметки..." value={form.comment}
            onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} className={inp} />
        </div>
        <button
          onClick={() => onFinish(form)}
          disabled={loading || !form.distanceKm}
          className="w-full bg-accent text-black font-bold rounded-2xl py-4 text-sm disabled:opacity-50 mt-1 active:scale-[0.98] transition-transform"
        >
          {loading ? 'Сохраняем...' : 'Сохранить смену'}
        </button>
      </div>
    </Modal>
  )
}

export default function LiveShiftPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: shift, mutate, isLoading } = useSWR('/api/shifts/active', fetcher, { refreshInterval: 3000 })

  const timer = useTimer(shift?.startTime ?? null)
  const [amount, setAmount] = useState('0')
  const [addLoading, setAddLoading] = useState(false)

  const [showFinish, setShowFinish] = useState(false)
  const [finishLoading, setFinishLoading] = useState(false)
  const [showCancel, setShowCancel] = useState(false)

  useEffect(() => {
    if (!isLoading && !shift) router.replace('/shifts')
  }, [shift, isLoading, router])

  // Keyboard input
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (showFinish || showCancel) return

      if (e.key >= '0' && e.key <= '9') {
        setAmount((v) => {
          if (v === '0') return e.key
          if (v.includes('.') && v.split('.')[1]?.length >= 2) return v
          return v + e.key
        })
      } else if (e.key === '.' || e.key === ',') {
        setAmount((v) => (v.includes('.') ? v : v + '.'))
      } else if (e.key === 'Backspace') {
        setAmount((v) => v.slice(0, -1) || '0')
      } else if (e.key === 'Enter') {
        e.preventDefault()
        addOrder('delivery')
      } else if (e.key === 'Escape') {
        setAmount('0')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showFinish, showCancel, amount])

  const gross = shift ? (shift.grossEarnings ?? 0) + (shift.bonuses ?? 0) + (shift.tips ?? 0) : 0

  async function addOrder(type: 'delivery' | 'bonus' | 'tip' = 'delivery') {
    const val = parseFloat(amount)
    if (!val || val <= 0) { toast('Введите сумму', 'error'); return }
    setAddLoading(true)
    try {
      const res = await fetch('/api/shifts/active/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: val, type }),
      })
      if (res.ok) {
        setAmount('0')
        mutate()
        toast(`+${formatMoney(val)}`, 'success')
      } else {
        const d = await res.json()
        toast(d.error || 'Ошибка', 'error')
      }
    } finally {
      setAddLoading(false)
    }
  }

  async function deleteOrder(id: string) {
    const res = await fetch(`/api/shifts/active/orders/${id}`, { method: 'DELETE' })
    if (res.ok) mutate()
    else toast('Ошибка', 'error')
  }

  async function handleFinish(form: { distanceKm: string; parkCommission: string; serviceCommission: string; comment: string }) {
    setFinishLoading(true)
    try {
      const res = await fetch('/api/shifts/active/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distanceKm: parseFloat(form.distanceKm) || 0,
          parkCommission: parseFloat(form.parkCommission) || 0,
          serviceCommission: parseFloat(form.serviceCommission) || 0,
          comment: form.comment || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error || 'Ошибка', 'error'); return }
      const accruals: { name: string; amount: number }[] = data.accruals || []
      if (accruals.length > 0) {
        toast('Смена завершена!', 'success', `В резервы: ${accruals.map((a) => `${a.name}: ${formatMoney(a.amount)}`).join(' · ')}`)
      } else {
        toast('Смена завершена!', 'success')
      }
      router.push('/shifts')
      router.refresh()
    } finally {
      setFinishLoading(false)
    }
  }

  async function handleCancel() {
    const res = await fetch('/api/shifts/active', { method: 'DELETE' })
    if (res.ok) {
      toast('Смена отменена', 'info')
      router.push('/shifts')
    }
  }

  if (!shift) return null

  const orders: { id: string; amount: number; type: string; note?: string; createdAt: string }[] = shift.liveOrders ?? []
return (
    <div className="flex flex-col min-h-[calc(100dvh-96px)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.push('/dashboard')} className="w-8 h-8 glass rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors">
          <ChevronLeft size={16} />
        </button>
        <div className="glass rounded-full px-4 py-1.5 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-sm font-semibold text-white/80 tabular-nums">{timer}</span>
        </div>
        <button onClick={() => setShowCancel(true)} className="w-8 h-8 glass rounded-xl flex items-center justify-center text-white/25 hover:text-danger transition-colors">
          <XCircle size={16} />
        </button>
      </div>

      {/* Earnings display */}
      <div className="text-center py-3">
        <p className="text-[10px] text-white/30 font-semibold uppercase tracking-widest mb-2">Заработано</p>
        <p className="text-6xl font-extrabold tabular-nums tracking-tight text-white">
          {formatMoney(gross)}
        </p>
        <div className="flex items-center justify-center gap-3 mt-3 text-xs text-white/30">
          <span>Доставка <span className="text-accent font-semibold">{formatMoney(shift.grossEarnings ?? 0)}</span></span>
          {(shift.bonuses ?? 0) > 0 && <span>Бонусы <span className="text-blue-400 font-semibold">{formatMoney(shift.bonuses)}</span></span>}
          {(shift.tips ?? 0) > 0 && <span>Чаевые <span className="text-amber-400 font-semibold">{formatMoney(shift.tips)}</span></span>}
        </div>
      </div>

      {/* Amount display */}
      <div className="text-center mb-3">
        <div className="inline-flex items-baseline gap-1">
          <span className={`text-4xl font-bold tabular-nums transition-colors ${parseFloat(amount) > 0 ? 'text-white' : 'text-white/20'}`}>
            {amount}
          </span>
          <span className={`text-2xl font-bold ${parseFloat(amount) > 0 ? 'text-white/50' : 'text-white/10'}`}>₽</span>
        </div>
      </div>

      {/* Numpad */}
      <Numpad value={amount} onChange={setAmount} />

      {/* Add buttons */}
      <div className="px-2 mt-3 space-y-2">
        {/* Main delivery button */}
        <button
          onClick={() => addOrder('delivery')}
          disabled={addLoading || parseFloat(amount) <= 0}
          className="w-full bg-accent text-black font-bold rounded-2xl py-4 text-base disabled:opacity-30 transition-all active:scale-[0.98]"
        >
          {addLoading ? '...' : `+ Заказ${parseFloat(amount) > 0 ? '  ' + formatMoney(parseFloat(amount)) : ''}`}
        </button>
        {/* Secondary: bonus + tip */}
        <div className="flex gap-2">
          <button
            onClick={() => addOrder('bonus')}
            disabled={addLoading || parseFloat(amount) <= 0}
            className="flex-1 glass border border-blue-500/20 text-blue-400 font-semibold rounded-2xl py-3 text-sm disabled:opacity-30 transition-all active:scale-[0.98]"
          >
            + Бонус
          </button>
          <button
            onClick={() => addOrder('tip')}
            disabled={addLoading || parseFloat(amount) <= 0}
            className="flex-1 glass border border-amber-500/20 text-amber-400 font-semibold rounded-2xl py-3 text-sm disabled:opacity-30 transition-all active:scale-[0.98]"
          >
            + Чаевые
          </button>
        </div>
      </div>

      {/* Orders list */}
      {orders.length > 0 && (
        <div className="mt-4 px-1">
          <p className="text-[10px] text-white/25 font-semibold uppercase tracking-widest mb-2 px-1">
            Заказы · {orders.length} шт.
          </p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-none">
            {[...orders].reverse().map((o) => (
              <div key={o.id} className="glass flex items-center justify-between rounded-xl px-4 py-2.5">
                <span className={`text-xs font-semibold ${TYPE_COLORS[o.type] ?? 'text-white/50'}`}>
                  {TYPE_LABELS[o.type] ?? o.type}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold tabular-nums">{formatMoney(o.amount)}</span>
                  <button onClick={() => deleteOrder(o.id)} className="text-white/15 hover:text-danger transition-colors p-0.5">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Finish button */}
      <div className="mt-auto pt-4 px-1">
        <button
          onClick={() => setShowFinish(true)}
          className="w-full flex items-center justify-center gap-2 glass border border-accent/20 text-accent font-bold rounded-2xl py-3.5 text-sm hover:bg-accent/5 transition-all active:scale-[0.98]"
        >
          <CheckCircle size={17} /> Завершить смену
        </button>
      </div>

      <FinishModal open={showFinish} onClose={() => setShowFinish(false)} onFinish={handleFinish} loading={finishLoading} />

      <Modal open={showCancel} onClose={() => setShowCancel(false)} title="Отменить смену?">
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-white/40">Все добавленные заказы будут удалены.</p>
          <button onClick={handleCancel} className="w-full glass border border-danger/20 text-danger font-bold rounded-2xl py-3.5 text-sm active:scale-[0.98] transition-transform">
            Да, отменить
          </button>
          <button onClick={() => setShowCancel(false)} className="w-full text-white/30 text-sm py-2">
            Вернуться
          </button>
        </div>
      </Modal>
    </div>
  )
}
