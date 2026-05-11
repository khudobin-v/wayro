import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { rollbackReservesForShift, accrueReservesForShift } from '@/lib/reserves'
import { apiError, apiOk, calcNetEarnings } from '@/lib/utils'

const shiftSchema = z.object({
  date: z.string(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  distanceKm: z.coerce.number().min(0),
  grossEarnings: z.coerce.number().min(0),
  bonuses: z.coerce.number().min(0).default(0),
  tips: z.coerce.number().min(0).default(0),
  parkCommission: z.coerce.number().min(0).default(0),
  serviceCommission: z.coerce.number().min(0).default(0),
  taxDeduction: z.coerce.number().min(0).default(0),
  ordersCount: z.coerce.number().int().min(0).optional().nullable(),
  comment: z.string().optional().nullable(),
})

async function getShift(id: string, userId: string) {
  const shift = await prisma.shift.findFirst({ where: { id, userId } })
  if (!shift) return null
  return shift
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuth()
  if (!auth) return apiError('Unauthorized', 401)

  const shift = await getShift(params.id, auth.userId)
  if (!shift) return apiError('Смена не найдена', 404)

  return apiOk(shift)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuth()
  if (!auth) return apiError('Unauthorized', 401)

  const shift = await getShift(params.id, auth.userId)
  if (!shift) return apiError('Смена не найдена', 404)

  const body = await req.json().catch(() => null)
  const parsed = shiftSchema.safeParse(body)
  if (!parsed.success) return apiError('Некорректные данные')

  const data = parsed.data
  const netEarnings = calcNetEarnings(data)

  await rollbackReservesForShift(shift.id)

  const updated = await prisma.shift.update({
    where: { id: shift.id },
    data: {
      date: new Date(data.date),
      startTime: data.startTime ? new Date(data.startTime) : null,
      endTime: data.endTime ? new Date(data.endTime) : null,
      distanceKm: data.distanceKm,
      grossEarnings: data.grossEarnings,
      bonuses: data.bonuses,
      tips: data.tips,
      parkCommission: data.parkCommission,
      serviceCommission: data.serviceCommission,
      taxDeduction: data.taxDeduction,
      netEarnings,
      ordersCount: data.ordersCount ?? undefined,
      comment: data.comment ?? null,
    },
  })

  const accruals = await accrueReservesForShift({
    id: updated.id,
    userId: updated.userId,
    distanceKm: updated.distanceKm,
    netEarnings: updated.netEarnings,
    date: updated.date,
  })

  return apiOk({ shift: updated, accruals })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuth()
  if (!auth) return apiError('Unauthorized', 401)

  const shift = await getShift(params.id, auth.userId)
  if (!shift) return apiError('Смена не найдена', 404)

  await rollbackReservesForShift(shift.id)
  await prisma.shift.delete({ where: { id: shift.id } })

  return apiOk({ ok: true })
}
