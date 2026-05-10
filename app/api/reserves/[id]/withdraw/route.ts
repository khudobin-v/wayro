import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError, apiOk } from '@/lib/utils'

const schema = z.object({
  amount: z.coerce.number().min(0.01),
  comment: z.string().optional().nullable(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuth()
  if (!auth) return apiError('Unauthorized', 401)

  const reserve = await prisma.reserve.findFirst({ where: { id: params.id, userId: auth.userId } })
  if (!reserve) return apiError('Резерв не найден', 404)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError('Некорректные данные')

  const { amount, comment } = parsed.data

  if (amount > reserve.balance) return apiError('Недостаточно средств в резерве')

  const [updated] = await prisma.$transaction([
    prisma.reserve.update({
      where: { id: reserve.id },
      data: { balance: { decrement: amount } },
    }),
    prisma.reserveEntry.create({
      data: {
        reserveId: reserve.id,
        amount,
        type: 'withdrawal',
        comment: comment ?? null,
      },
    }),
  ])

  return apiOk(updated)
}
