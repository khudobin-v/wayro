import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError, apiOk } from '@/lib/utils'

const expenseSchema = z.object({
  date: z.string(),
  category: z.enum(['fuel', 'maintenance', 'wash', 'communication', 'food', 'other']),
  amount: z.coerce.number().min(0),
  comment: z.string().optional().nullable(),
  shiftId: z.string().optional().nullable(),
  liters: z.coerce.number().min(0).optional().nullable(),
  pricePerLiter: z.coerce.number().min(0).optional().nullable(),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuth()
  if (!auth) return apiError('Unauthorized', 401)

  const expense = await prisma.expense.findFirst({ where: { id: params.id, userId: auth.userId } })
  if (!expense) return apiError('Расход не найден', 404)

  const body = await req.json().catch(() => null)
  const parsed = expenseSchema.safeParse(body)
  if (!parsed.success) return apiError('Некорректные данные')

  const data = parsed.data
  let amount = data.amount
  if (data.liters && data.pricePerLiter) amount = data.liters * data.pricePerLiter

  const updated = await prisma.expense.update({
    where: { id: params.id },
    data: {
      date: new Date(data.date),
      category: data.category,
      amount,
      comment: data.comment ?? null,
      shiftId: data.shiftId ?? null,
      liters: data.liters ?? null,
      pricePerLiter: data.pricePerLiter ?? null,
    },
  })

  return apiOk(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuth()
  if (!auth) return apiError('Unauthorized', 401)

  const expense = await prisma.expense.findFirst({ where: { id: params.id, userId: auth.userId } })
  if (!expense) return apiError('Расход не найден', 404)

  await prisma.expense.delete({ where: { id: params.id } })
  return apiOk({ ok: true })
}
