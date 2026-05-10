import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError, apiOk } from '@/lib/utils'

const reserveSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['maintenance', 'tax', 'tires', 'insurance', 'custom']),
  goal: z.coerce.number().optional().nullable(),
  costPerEvent: z.coerce.number().optional().nullable(),
  intervalKm: z.coerce.number().optional().nullable(),
  currentKm: z.coerce.number().optional().nullable(),
  taxPercent: z.coerce.number().optional().nullable(),
  intervalMonths: z.coerce.number().optional().nullable(),
})

export async function GET() {
  const auth = await getAuth()
  if (!auth) return apiError('Unauthorized', 401)

  const reserves = await prisma.reserve.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: 'asc' },
    include: {
      entries: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })

  return apiOk(reserves)
}

export async function POST(req: NextRequest) {
  const auth = await getAuth()
  if (!auth) return apiError('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  const parsed = reserveSchema.safeParse(body)
  if (!parsed.success) return apiError('Некорректные данные')

  const data = parsed.data
  const reserve = await prisma.reserve.create({
    data: { userId: auth.userId, ...data },
  })

  return apiOk(reserve, 201)
}
