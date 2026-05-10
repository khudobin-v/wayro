import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { accrueReservesForShift } from '@/lib/reserves'
import { apiError, apiOk, calcNetEarnings } from '@/lib/utils'

const finishSchema = z.object({
  distanceKm: z.coerce.number().min(0),
  parkCommission: z.coerce.number().min(0).default(0),
  serviceCommission: z.coerce.number().min(0).default(0),
  comment: z.string().optional().nullable(),
})

export async function POST(req: NextRequest) {
  const auth = await getAuth()
  if (!auth) return apiError('Unauthorized', 401)

  const shift = await prisma.shift.findFirst({
    where: { userId: auth.userId, status: 'active' },
  })
  if (!shift) return apiError('Нет активной смены', 404)

  const body = await req.json().catch(() => null)
  const parsed = finishSchema.safeParse(body)
  if (!parsed.success) return apiError('Некорректные данные')

  const { distanceKm, parkCommission, serviceCommission, comment } = parsed.data
  const now = new Date()

  const netEarnings = calcNetEarnings({
    grossEarnings: shift.grossEarnings,
    bonuses: shift.bonuses,
    tips: shift.tips,
    parkCommission,
    serviceCommission,
  })

  const finished = await prisma.shift.update({
    where: { id: shift.id },
    data: {
      status: 'completed',
      endTime: now,
      distanceKm,
      parkCommission,
      serviceCommission,
      netEarnings,
      comment: comment ?? shift.comment,
    },
  })

  const accruals = await accrueReservesForShift({
    id: finished.id,
    userId: finished.userId,
    distanceKm: finished.distanceKm,
    netEarnings: finished.netEarnings,
    date: finished.date,
  })

  return apiOk({ shift: finished, accruals })
}
