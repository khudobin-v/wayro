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

export async function GET(req: NextRequest) {
  const auth = await getAuth()
  if (!auth) return apiError('Unauthorized', 401)

  const { searchParams } = req.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const category = searchParams.get('category')

  const expenses = await prisma.expense.findMany({
    where: {
      userId: auth.userId,
      ...(category ? { category } : {}),
      date: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    },
    orderBy: { date: 'desc' },
  })

  return apiOk(expenses)
}

export async function POST(req: NextRequest) {
  const auth = await getAuth()
  if (!auth) return apiError('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  const parsed = expenseSchema.safeParse(body)
  if (!parsed.success) return apiError('Некорректные данные')

  const data = parsed.data

  let amount = data.amount
  if (data.liters && data.pricePerLiter) {
    amount = data.liters * data.pricePerLiter
  }

  const expense = await prisma.expense.create({
    data: {
      userId: auth.userId,
      date: new Date(data.date),
      category: data.category,
      amount,
      comment: data.comment ?? null,
      shiftId: data.shiftId ?? null,
      liters: data.liters ?? null,
      pricePerLiter: data.pricePerLiter ?? null,
    },
  })

  return apiOk(expense, 201)
}
