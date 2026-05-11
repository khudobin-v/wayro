'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Pencil } from 'lucide-react'
import { formatMoney, formatDate, formatTime, getDurationHours } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface ShiftOrder {
  id: string
  amount: number
  type: string
  note: string | null
  createdAt: string
}

interface Shift {
  id: string
  date: string
  startTime?: string
  endTime?: string
  distanceKm: number
  grossEarnings: number
  bonuses: number
  tips: number
  parkCommission: number
  serviceCommission: number
  taxDeduction: number
  netEarnings: number
  ordersCount?: number
  comment?: string
}

const typeLabel: Record<string, string> = {
  delivery: 'Заказ',
  bonus: 'Бонус',
  tip: 'Чаевые',
}

export default function ShiftDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [shift, setShift] = useState<Shift | null>(null)
  const [orders, setOrders] = useState<ShiftOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/shifts/${id}`).then((r) => r.json()),
      fetch(`/api/shifts/${id}/orders`).then((r) => r.json()),
    ]).then(([shiftData, ordersData]) => {
      setShift(shiftData)
      setOrders(Array.isArray(ordersData) ? ordersData : [])
    }).finally(() => setLoading(false))
  }, [id])

  const hours = shift?.startTime && shift?.endTime
    ? getDurationHours(shift.startTime, shift.endTime)
    : null

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/shifts"
            className="w-8 h-8 glass rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft size={16} />
          </Link>
          <h1 className="text-xl font-bold">
            {shift ? formatDate(shift.date) : 'Смена'}
          </h1>
        </div>
        {shift && (
          <Link
            href={`/shifts/${id}/edit`}
            className="w-8 h-8 glass rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
          >
            <Pencil size={14} />
          </Link>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
      )}

      {!loading && shift && (
        <>
          {/* Shift summary */}
          <div className="glass-heavy rounded-2xl px-4 py-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Чистый заработок</span>
              <span className="text-lg font-bold text-gray-900 tabular-nums">{formatMoney(shift.netEarnings)}</span>
            </div>
            <div className="h-px bg-gray-50" />
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-gray-400">Грязный</span>
              <span className="text-right tabular-nums">{formatMoney(shift.grossEarnings)}</span>
              {shift.bonuses > 0 && <>
                <span className="text-gray-400">Бонусы</span>
                <span className="text-right tabular-nums">+{formatMoney(shift.bonuses)}</span>
              </>}
              {shift.tips > 0 && <>
                <span className="text-gray-400">Чаевые</span>
                <span className="text-right tabular-nums">+{formatMoney(shift.tips)}</span>
              </>}
              {shift.parkCommission > 0 && <>
                <span className="text-gray-400">Комиссия парка</span>
                <span className="text-right tabular-nums text-danger/80">−{formatMoney(shift.parkCommission)}</span>
              </>}
              {shift.serviceCommission > 0 && <>
                <span className="text-gray-400">Комиссия сервиса</span>
                <span className="text-right tabular-nums text-danger/80">−{formatMoney(shift.serviceCommission)}</span>
              </>}
              {shift.taxDeduction > 0 && <>
                <span className="text-gray-400">В счёт налога</span>
                <span className="text-right tabular-nums text-danger/80">−{formatMoney(shift.taxDeduction)}</span>
              </>}
            </div>
            <div className="h-px bg-gray-50" />
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Пробег</p>
                <p className="font-semibold tabular-nums">{shift.distanceKm} км</p>
              </div>
              {hours && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Время</p>
                  <p className="font-semibold tabular-nums">{hours.toFixed(1)} ч</p>
                </div>
              )}
              {shift.startTime && shift.endTime && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Период</p>
                  <p className="font-semibold tabular-nums">{formatTime(shift.startTime)}–{formatTime(shift.endTime)}</p>
                </div>
              )}
            </div>
            {shift.comment && (
              <p className="text-xs text-gray-400 italic">{shift.comment}</p>
            )}
          </div>

          {/* Orders list */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
              Заказы {orders.length > 0 ? `· ${orders.length}` : ''}
            </p>
            {orders.length === 0 ? (
              <div className="glass rounded-2xl px-4 py-6 text-center">
                <p className="text-sm text-gray-400">Заказы не записывались</p>
                <p className="text-xs text-gray-300 mt-1">Заказы сохраняются только при живой смене</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {orders.map((order) => (
                  <div key={order.id} className="glass rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm">{typeLabel[order.type] ?? order.type}</span>
                      {order.note && (
                        <p className="text-xs text-gray-400 mt-0.5">{order.note}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">{formatTime(order.createdAt)}</p>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${order.amount >= 0 ? 'text-gray-900' : 'text-danger'}`}>
                      {formatMoney(order.amount, true)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
