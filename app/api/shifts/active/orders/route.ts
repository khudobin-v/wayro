import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError, apiOk } from '@/lib/utils'

const orderSchema = z.object({
  amount: z.coerce.number().min(0.01),
  type: z.enum(['delivery', 'bonus', 'tip']).default('delivery'),
  note: z.string().optional().nullable(),
})

export async function POST(req: NextRequest) {
  const auth = await getAuth()
  if (!auth) return apiError('Unauthorized', 401)

  const shift = await prisma.shift.findFirst({
    where: { userId: auth.userId, status: 'active' },
  })
  if (!shift) return apiError('Нет активной смены', 404)

  const body = await req.json().catch(() => null)
  const parsed = orderSchema.safeParse(body)
  if (!parsed.success) return apiError('Некорректные данные')

  const { amount, type, note } = parsed.data

  // Добавляем заказ и обновляем счётчики смены
  const [order] = await prisma.$transaction([
    prisma.shiftOrder.create({
      data: { shiftId: shift.id, amount, type, note: note ?? null },
    }),
    prisma.shift.update({
      where: { id: shift.id },
      data: {
        grossEarnings: type === 'delivery' ? { increment: amount } : undefined,
        bonuses: type === 'bonus' ? { increment: amount } : undefined,
        tips: type === 'tip' ? { increment: amount } : undefined,
        ordersCount: { increment: 1 },
      },
    }),
  ])

  return apiOk(order, 201)
}
