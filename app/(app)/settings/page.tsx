'use client'

import useSWR from 'swr'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast'
import { LogOut } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const TAX_MODES = [
  { key: 'npd4', label: 'НПД 4%', pct: 4 },
  { key: 'npd6', label: 'НПД 6%', pct: 6 },
  { key: 'ip_usn', label: 'ИП УСН 6%', pct: 6 },
  { key: 'custom', label: 'Свой %', pct: null },
  { key: 'none', label: 'Не использовать', pct: null },
]

export default function SettingsPage() {
  const { toast } = useToast()
  const router = useRouter()
  const { data: settings, mutate } = useSWR('/api/settings', fetcher)
  const { data: me } = useSWR('/api/auth/me', fetcher)

  const [form, setForm] = useState({
    maintenanceCost: '',
    maintenanceInterval: '',
    currentOdometer: '',
    taxMode: 'npd4',
    taxPercent: '4',
    tiresCost: '',
    tiresIntervalMonths: '',
    insuranceCost: '',
    insuranceIntervalMonths: '',
    fuelConsumption: '',
    targetMonthlyIncome: '',
    forecastShifts: '10',
    parkCommissionEnabled: true,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings) {
      setForm({
        maintenanceCost: settings.maintenanceCost ?? '',
        maintenanceInterval: settings.maintenanceInterval ?? '',
        currentOdometer: settings.currentOdometer ?? '',
        taxMode: settings.taxMode ?? 'npd4',
        taxPercent: settings.taxPercent ?? '4',
        tiresCost: settings.tiresCost ?? '',
        tiresIntervalMonths: settings.tiresIntervalMonths ?? '',
        insuranceCost: settings.insuranceCost ?? '',
        insuranceIntervalMonths: settings.insuranceIntervalMonths ?? '',
        fuelConsumption: settings.fuelConsumption ?? '',
        targetMonthlyIncome: settings.targetMonthlyIncome ?? '',
        forecastShifts: settings.forecastShifts ?? '10',
        parkCommissionEnabled: settings.parkCommissionEnabled ?? true,
      })
    }
  }, [settings])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {}
      const n = (v: string | number) => (v !== '' && v !== null ? parseFloat(String(v)) : null)

      payload.maintenanceCost = n(form.maintenanceCost)
      payload.maintenanceInterval = n(form.maintenanceInterval)
      payload.currentOdometer = n(form.currentOdometer)
      payload.taxMode = form.taxMode
      payload.taxPercent = form.taxMode === 'none' ? null : n(form.taxPercent)
      payload.tiresCost = n(form.tiresCost)
      payload.tiresIntervalMonths = n(form.tiresIntervalMonths)
      payload.insuranceCost = n(form.insuranceCost)
      payload.insuranceIntervalMonths = n(form.insuranceIntervalMonths)
      payload.fuelConsumption = n(form.fuelConsumption)
      payload.targetMonthlyIncome = n(form.targetMonthlyIncome)
      payload.forecastShifts = parseInt(String(form.forecastShifts)) || 10
      payload.parkCommissionEnabled = form.parkCommissionEnabled

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast('Настройки сохранены', 'success')
        mutate()
      } else {
        toast('Ошибка сохранения', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  function handleTaxMode(mode: string) {
    const t = TAX_MODES.find((m) => m.key === mode)
    setForm((f) => ({ ...f, taxMode: mode, taxPercent: t?.pct != null ? String(t.pct) : f.taxPercent }))
  }

  const inp = 'w-full glass rounded-xl px-4 py-3 text-sm placeholder:text-white/20 focus:outline-none focus:border-accent/30 transition-colors tabular-nums'
  const label = 'block text-xs text-white/40 mb-1.5'

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="glass rounded-2xl px-5 py-4">
        <h2 className="font-semibold text-sm text-white/60 uppercase tracking-wide text-[11px] mb-4">{title}</h2>
        <div className="space-y-3">{children}</div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Настройки</h1>
        {me && <p className="text-xs text-white/30">{me.email}</p>}
      </div>

      <form onSubmit={save} className="space-y-4">
        <Section title="Техническое обслуживание">
          <div>
            <label className={label}>Стоимость ТО (₽)</label>
            <input type="number" inputMode="decimal" placeholder="15000" value={form.maintenanceCost} onChange={(e) => setForm((f) => ({ ...f, maintenanceCost: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className={label}>Интервал ТО (км)</label>
            <input type="number" inputMode="decimal" placeholder="10000" value={form.maintenanceInterval} onChange={(e) => setForm((f) => ({ ...f, maintenanceInterval: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className={label}>Текущий пробег авто (км)</label>
            <input type="number" inputMode="decimal" placeholder="50000" value={form.currentOdometer} onChange={(e) => setForm((f) => ({ ...f, currentOdometer: e.target.value }))} className={inp} />
          </div>
        </Section>

        <Section title="Налоговый режим">
          <div className="grid grid-cols-2 gap-1.5">
            {TAX_MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => handleTaxMode(m.key)}
                className={`text-xs py-2 px-3 rounded-xl border text-left transition-colors ${form.taxMode === m.key ? 'border-accent/50 bg-accent/10 text-accent' : 'border-white/8 text-white/35 glass hover:text-white/60'}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {form.taxMode !== 'none' && (
            <div>
              <label className={label}>Процент налога</label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="6"
                value={form.taxPercent}
                onChange={(e) => setForm((f) => ({ ...f, taxPercent: e.target.value }))}
                disabled={form.taxMode !== 'custom'}
                className={inp + (form.taxMode !== 'custom' ? ' opacity-50' : '')}
              />
            </div>
          )}
        </Section>

        <Section title="Шины">
          <div>
            <label className={label}>Стоимость комплекта (₽)</label>
            <input type="number" inputMode="decimal" placeholder="20000" value={form.tiresCost} onChange={(e) => setForm((f) => ({ ...f, tiresCost: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className={label}>Интервал замены (месяцев)</label>
            <input type="number" inputMode="decimal" placeholder="12" value={form.tiresIntervalMonths} onChange={(e) => setForm((f) => ({ ...f, tiresIntervalMonths: e.target.value }))} className={inp} />
          </div>
        </Section>

        <Section title="Страховка">
          <div>
            <label className={label}>Стоимость (₽)</label>
            <input type="number" inputMode="decimal" placeholder="10000" value={form.insuranceCost} onChange={(e) => setForm((f) => ({ ...f, insuranceCost: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className={label}>Интервал (месяцев)</label>
            <input type="number" inputMode="decimal" placeholder="12" value={form.insuranceIntervalMonths} onChange={(e) => setForm((f) => ({ ...f, insuranceIntervalMonths: e.target.value }))} className={inp} />
          </div>
        </Section>

        <Section title="Прочее">
          <div>
            <label className={label}>Расход топлива авто (л/100км)</label>
            <input type="number" inputMode="decimal" placeholder="9.5" value={form.fuelConsumption} onChange={(e) => setForm((f) => ({ ...f, fuelConsumption: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className={label}>Целевой доход в месяц (₽)</label>
            <input type="number" inputMode="decimal" placeholder="100000" value={form.targetMonthlyIncome} onChange={(e) => setForm((f) => ({ ...f, targetMonthlyIncome: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className={label}>Число смен для прогноза</label>
            <input type="number" inputMode="numeric" placeholder="10" value={form.forecastShifts} onChange={(e) => setForm((f) => ({ ...f, forecastShifts: e.target.value }))} className={inp} />
          </div>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">Комиссия парка</span>
            <div
              onClick={() => setForm((f) => ({ ...f, parkCommissionEnabled: !f.parkCommissionEnabled }))}
              className={`w-11 h-6 rounded-full transition-colors ${form.parkCommissionEnabled ? 'bg-accent' : 'bg-border'} relative`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${form.parkCommissionEnabled ? 'left-6' : 'left-1'}`} />
            </div>
          </label>
        </Section>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-accent text-black font-bold rounded-2xl py-4 text-sm disabled:opacity-60"
        >
          {saving ? 'Сохраняем...' : 'Сохранить настройки'}
        </button>
      </form>

      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 glass border border-danger/20 rounded-2xl py-3.5 text-sm text-danger hover:opacity-80 transition-opacity"
      >
        <LogOut size={16} /> Выйти из аккаунта
      </button>
    </div>
  )
}
