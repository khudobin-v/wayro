import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError, apiOk } from '@/lib/utils'

// GET — текущая активная смена
export async function GET() {
  const auth = await getAuth()
  if (!auth) return apiError('Unauthorized', 401)

  const shift = await prisma.shift.findFirst({
    where: { userId: auth.userId, status: 'active' },
    include: { liveOrders: { orderBy: { createdAt: 'asc' } } },
  })

  return apiOk(shift)
}

// POST — начать смену
const startSchema = z.object({
  startKm: z.coerce.number().min(0).optional().nullable(),
})

export async function POST(req: NextRequest) {
  const auth = await getAuth()
  if (!auth) return apiError('Unauthorized', 401)

  const existing = await prisma.shift.findFirst({
    where: { userId: auth.userId, status: 'active' },
  })
  if (existing) return apiError('Смена уже идёт')

  const body = await req.json().catch(() => ({}))
  const { startKm } = startSchema.parse(body)

  const now = new Date()
  const shift = await prisma.shift.create({
    data: {
      userId: auth.userId,
      status: 'active',
      date: now,
      startTime: now,
      distanceKm: 0,
      grossEarnings: 0,
      netEarnings: 0,
      comment: startKm ? `Начальный пробег: ${startKm} км` : null,
    },
    include: { liveOrders: true },
  })

  return apiOk(shift, 201)
}

// DELETE — отменить активную смену (без сохранения)
export async function DELETE() {
  const auth = await getAuth()
  if (!auth) return apiError('Unauthorized', 401)

  const shift = await prisma.shift.findFirst({
    where: { userId: auth.userId, status: 'active' },
  })
  if (!shift) return apiError('Нет активной смены', 404)

  await prisma.shift.delete({ where: { id: shift.id } })
  return apiOk({ ok: true })
}
