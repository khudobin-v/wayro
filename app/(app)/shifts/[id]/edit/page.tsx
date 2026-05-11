'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { ShiftForm } from '@/components/shifts/shift-form'
import { format } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'

export default function EditShiftPage() {
  const { id } = useParams<{ id: string }>()
  const [shift, setShift] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/shifts/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setShift({
          id: data.id,
          date: format(new Date(data.date), 'yyyy-MM-dd'),
          startTime: data.startTime ? format(new Date(data.startTime), 'HH:mm') : '',
          endTime: data.endTime ? format(new Date(data.endTime), 'HH:mm') : '',
          distanceKm: String(data.distanceKm),
          grossEarnings: String(data.grossEarnings),
          bonuses: String(data.bonuses),
          tips: String(data.tips),
          parkCommission: String(data.parkCommission),
          serviceCommission: String(data.serviceCommission),
          taxDeduction: String(data.taxDeduction ?? 0),
          ordersCount: data.ordersCount ? String(data.ordersCount) : '',
          comment: data.comment ?? '',
        })
      })
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link href="/shifts" className="w-8 h-8 glass rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors">
          <ChevronLeft size={16} />
        </Link>
        <h1 className="text-xl font-bold">Редактировать смену</h1>
      </div>
      <div className="glass-heavy rounded-3xl overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-10 rounded-xl" />
          </div>
        ) : shift ? (
          <ShiftForm initial={shift as Parameters<typeof ShiftForm>[0]['initial']} isEdit />
        ) : (
          <p className="p-5 text-gray-400">Смена не найдена</p>
        )}
      </div>
    </div>
  )
}
