'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { calcNetEarnings, formatMoney } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { AlertTriangle } from 'lucide-react'

interface ShiftFormData {
  date: string
  startTime: string
  endTime: string
  distanceKm: string
  grossEarnings: string
  bonuses: string
  tips: string
  parkCommission: string
  serviceCommission: string
  ordersCount: string
  comment: string
}

const DRAFT_KEY = 'shift_draft'

const emptyForm: ShiftFormData = {
  date: '',
  startTime: '',
  endTime: '',
  distanceKm: '',
  grossEarnings: '',
  bonuses: '0',
  tips: '0',
  parkCommission: '0',
  serviceCommission: '0',
  ordersCount: '',
  comment: '',
}

interface ShiftFormProps {
  initial?: Partial<ShiftFormData> & { id?: string }
  isEdit?: boolean
}

export function ShiftForm({ initial, isEdit }: ShiftFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [form, setForm] = useState<ShiftFormData>(() => {
    if (initial) return { ...emptyForm, ...initial }
    if (typeof window !== 'undefined') {
      const draft = localStorage.getItem(DRAFT_KEY)
      if (draft) return { ...emptyForm, ...JSON.parse(draft) }
    }
    return emptyForm
  })
  const [loading, setLoading] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)

  useEffect(() => {
    if (!isEdit && typeof window !== 'undefined') {
      const draft = localStorage.getItem(DRAFT_KEY)
      if (draft) setHasDraft(true)
    }
  }, [isEdit])

  useEffect(() => {
    if (!isEdit) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
    }
  }, [form, isEdit])

  const n = (v: string) => parseFloat(v) || 0

  const calcNet = calcNetEarnings({
    grossEarnings: n(form.grossEarnings),
    bonuses: n(form.bonuses),
    tips: n(form.tips),
    parkCommission: n(form.parkCommission),
    serviceCommission: n(form.serviceCommission),
  })

  const mismatch = Math.abs(calcNet) > 0.01

  function set(key: keyof ShiftFormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      let v = e.target.value
      if (['distanceKm', 'grossEarnings', 'bonuses', 'tips', 'parkCommission', 'serviceCommission'].includes(key)) {
        v = v.replace(',', '.')
      }
      setForm((prev) => ({ ...prev, [key]: v }))
    }
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY)
    setForm(emptyForm)
    setHasDraft(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.date) { toast('Укажите дату смены', 'error'); return }
    if (!form.distanceKm || n(form.distanceKm) <= 0) { toast('Укажите пробег', 'error'); return }
    if (!form.grossEarnings || n(form.grossEarnings) <= 0) { toast('Укажите заработок', 'error'); return }

    setLoading(true)
    try {
      const payload = {
        date: new Date(form.date).toISOString(),
        startTime: form.startTime ? `${form.date}T${form.startTime}:00` : null,
        endTime: form.endTime ? `${form.date}T${form.endTime}:00` : null,
        distanceKm: n(form.distanceKm),
        grossEarnings: n(form.grossEarnings),
        bonuses: n(form.bonuses),
        tips: n(form.tips),
        parkCommission: n(form.parkCommission),
        serviceCommission: n(form.serviceCommission),
        ordersCount: form.ordersCount ? parseInt(form.ordersCount) : null,
        comment: form.comment || null,
      }

      const url = isEdit && initial?.id ? `/api/shifts/${initial.id}` : '/api/shifts'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) { toast(data.error || 'Ошибка', 'error'); return }

      if (!isEdit) localStorage.removeItem(DRAFT_KEY)

      const accruals: { name: string; amount: number }[] = data.accruals || []
      if (accruals.length > 0) {
        const detail = accruals.map((a) => `${a.name}: ${formatMoney(a.amount)}`).join(' · ')
        toast('Смена сохранена', 'success', `В резервы: ${detail}`)
      } else {
        toast('Смена сохранена', 'success')
      }

      router.push('/shifts')
      router.refresh()
    } catch {
      toast('Ошибка соединения', 'error')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full glass rounded-xl px-4 py-3 text-sm placeholder:text-white/20 focus:outline-none focus:border-accent/30 transition-colors tabular-nums'
  const labelCls = 'block text-xs font-medium text-white/35 mb-1.5'

  return (
    <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
      {hasDraft && !isEdit && (
        <div className="flex items-center justify-between bg-warning/10 border border-warning/20 rounded-xl px-4 py-3">
          <p className="text-xs text-warning">Найден сохранённый черновик</p>
          <button type="button" onClick={clearDraft} className="text-xs text-white/50 hover:text-white">
            Очистить
          </button>
        </div>
      )}

      {/* Date */}
      <div>
        <label className={labelCls}>Дата смены *</label>
        <div className="grid grid-cols-3 gap-2 mb-2">
          {['сегодня', 'вчера'].map((label, i) => {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const val = format(d, 'yyyy-MM-dd')
            return (
              <button
                key={label}
                type="button"
                onClick={() => setForm((f) => ({ ...f, date: val }))}
                className={`text-xs py-2 rounded-xl border transition-colors ${form.date === val ? 'border-accent/50 bg-accent/10 text-accent' : 'border-white/8 text-white/35 glass hover:text-white/70'}`}
              >
                {label}
              </button>
            )
          })}
          <input
            type="date"
            value={form.date}
            onChange={set('date')}
            className="col-span-1 text-xs glass rounded-xl px-2 py-2 text-center text-white/35 focus:outline-none focus:border-accent/30"
          />
        </div>
      </div>

      {/* Times */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Начало</label>
          <input type="time" value={form.startTime} onChange={set('startTime')} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Конец</label>
          <input type="time" value={form.endTime} onChange={set('endTime')} className={inputCls} />
        </div>
      </div>

      {/* Distance */}
      <div>
        <label className={labelCls}>Пробег (км) *</label>
        <input
          type="number"
          inputMode="decimal"
          placeholder="0"
          value={form.distanceKm}
          onChange={set('distanceKm')}
          className={inputCls}
        />
      </div>

      <div className="h-px bg-white/6" />

      {/* Earnings from Yandex Pro */}
      <p className="text-xs font-medium text-white/30 uppercase tracking-wide">Данные из Яндекс Про</p>

      <div>
        <label className={labelCls}>Заработок (грязный) *</label>
        <input type="number" inputMode="decimal" placeholder="0" value={form.grossEarnings} onChange={set('grossEarnings')} className={inputCls} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Бонусы</label>
          <input type="number" inputMode="decimal" placeholder="0" value={form.bonuses} onChange={set('bonuses')} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Чаевые</label>
          <input type="number" inputMode="decimal" placeholder="0" value={form.tips} onChange={set('tips')} className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Комиссия парка</label>
          <input type="number" inputMode="decimal" placeholder="0" value={form.parkCommission} onChange={set('parkCommission')} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Комиссия сервиса</label>
          <input type="number" inputMode="decimal" placeholder="0" value={form.serviceCommission} onChange={set('serviceCommission')} className={inputCls} />
        </div>
      </div>

      {/* Net earnings calc */}
      <div className="bg-accent/5 border border-accent/10 rounded-xl px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50">Чистый заработок</span>
          <span className="text-base font-bold text-accent tabular-nums">{formatMoney(calcNet)}</span>
        </div>
        <p className="text-[11px] text-white/25 mt-1">Грязный + Бонусы + Чаевые − Комиссии</p>
      </div>

      <div className="h-px bg-white/6" />

      {/* Optional */}
      <div>
        <label className={labelCls}>Заказов (необязательно)</label>
        <input type="number" inputMode="numeric" placeholder="0" value={form.ordersCount} onChange={set('ordersCount')} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Комментарий</label>
        <textarea
          placeholder="Заметки о смене..."
          value={form.comment}
          onChange={set('comment')}
          rows={2}
          className={inputCls + ' resize-none'}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-accent text-black font-bold rounded-2xl py-4 text-sm transition-opacity disabled:opacity-60 mt-2"
      >
        {loading ? 'Сохраняем...' : isEdit ? 'Сохранить изменения' : 'Сохранить смену'}
      </button>
    </form>
  )
}
