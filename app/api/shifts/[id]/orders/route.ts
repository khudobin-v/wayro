import { NextRequest } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError, apiOk } from '@/lib/utils'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuth()
  if (!auth) return apiError('Unauthorized', 401)

  const shift = await prisma.shift.findFirst({ where: { id: params.id, userId: auth.userId } })
  if (!shift) return apiError('Смена не найдена', 404)

  const orders = await prisma.shiftOrder.findMany({
    where: { shiftId: params.id },
    orderBy: { createdAt: 'desc' },
  })

  return apiOk(orders)
}
