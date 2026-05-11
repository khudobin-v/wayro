import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns'
import { ru } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMoney(amount: number, showSign = false): string {
  const formatted = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))

  if (showSign && amount > 0) return `+${formatted}`
  if (showSign && amount < 0) return `−${formatted}`
  return formatted
}

export function formatMoneyCompact(amount: number): string {
  const abs = Math.abs(amount)
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}М ₽`
  if (abs >= 1_000) return `${Math.round(amount / 1_000)}К ₽`
  return `${Math.round(amount)} ₽`
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), 'd MMM yyyy', { locale: ru })
}

export function formatDateShort(date: Date | string): string {
  return format(new Date(date), 'd MMM', { locale: ru })
}

export function formatMonthYear(date: Date | string): string {
  return format(new Date(date), 'LLLL yyyy', { locale: ru })
}

export function formatTime(date: Date | string): string {
  return format(new Date(date), 'HH:mm')
}

export function getDurationHours(start: Date | string, end: Date | string): number {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  return (e - s) / 1000 / 3600
}

export function getCurrentMonthRange() {
  const now = new Date()
  return {
    from: startOfMonth(now).toISOString(),
    to: endOfMonth(now).toISOString(),
  }
}

export function calcNetEarnings(data: {
  grossEarnings: number
  bonuses: number
  tips: number
  parkCommission: number
  serviceCommission: number
  taxDeduction?: number
}): number {
  return (
    data.grossEarnings +
    data.bonuses +
    data.tips -
    data.parkCommission -
    data.serviceCommission -
    (data.taxDeduction ?? 0)
  )
}

export function apiError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

export function apiOk(data: unknown, status = 200) {
  return Response.json(data, { status })
}
