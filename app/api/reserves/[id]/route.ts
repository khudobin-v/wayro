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
  isActive: z.boolean().optional(),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuth()
  if (!auth) return apiError('Unauthorized', 401)

  const reserve = await prisma.reserve.findFirst({ where: { id: params.id, userId: auth.userId } })
  if (!reserve) return apiError('Резерв не найден', 404)

  const body = await req.json().catch(() => null)
  const parsed = reserveSchema.safeParse(body)
  if (!parsed.success) return apiError('Некорректные данные')

  const updated = await prisma.reserve.update({ where: { id: params.id }, data: parsed.data })
  return apiOk(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuth()
  if (!auth) return apiError('Unauthorized', 401)

  const reserve = await prisma.reserve.findFirst({ where: { id: params.id, userId: auth.userId } })
  if (!reserve) return apiError('Резерв не найден', 404)

  await prisma.reserve.delete({ where: { id: params.id } })
  return apiOk({ ok: true })
}
