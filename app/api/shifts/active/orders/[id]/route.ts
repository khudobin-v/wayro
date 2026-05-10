import { NextRequest } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError, apiOk } from '@/lib/utils'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuth()
  if (!auth) return apiError('Unauthorized', 401)

  const shift = await prisma.shift.findFirst({
    where: { userId: auth.userId, status: 'active' },
  })
  if (!shift) return apiError('Нет активной смены', 404)

  const order = await prisma.shiftOrder.findFirst({
    where: { id: params.id, shiftId: shift.id },
  })
  if (!order) return apiError('Заказ не найден', 404)

  await prisma.$transaction([
    prisma.shiftOrder.delete({ where: { id: order.id } }),
    prisma.shift.update({
      where: { id: shift.id },
      data: {
        grossEarnings: order.type === 'delivery' ? { decrement: order.amount } : undefined,
        bonuses: order.type === 'bonus' ? { decrement: order.amount } : undefined,
        tips: order.type === 'tip' ? { decrement: order.amount } : undefined,
        ordersCount: { decrement: 1 },
      },
    }),
  ])

  return apiOk({ ok: true })
}
