import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { accrueReservesForShift } from '@/lib/reserves'
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

export async function GET(req: NextRequest) {
  const auth = await getAuth()
  if (!auth) return apiError('Unauthorized', 401)

  const { searchParams } = req.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const shifts = await prisma.shift.findMany({
    where: {
      userId: auth.userId,
      date: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    },
    orderBy: { date: 'desc' },
  })

  return apiOk(shifts)
}

export async function POST(req: NextRequest) {
  const auth = await getAuth()
  if (!auth) return apiError('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  const parsed = shiftSchema.safeParse(body)
  if (!parsed.success) return apiError('Некорректные данные: ' + JSON.stringify(parsed.error.flatten()))

  const data = parsed.data
  const netEarnings = calcNetEarnings(data)

  const shift = await prisma.shift.create({
    data: {
      userId: auth.userId,
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
    id: shift.id,
    userId: shift.userId,
    distanceKm: shift.distanceKm,
    netEarnings: shift.netEarnings,
    date: shift.date,
  })

  return apiOk({ shift, accruals }, 201)
}
