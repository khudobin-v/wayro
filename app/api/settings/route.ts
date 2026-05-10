import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError, apiOk } from '@/lib/utils'

const settingsSchema = z.object({
  maintenanceCost: z.coerce.number().optional().nullable(),
  maintenanceInterval: z.coerce.number().optional().nullable(),
  currentOdometer: z.coerce.number().optional().nullable(),
  taxMode: z.string().optional().nullable(),
  taxPercent: z.coerce.number().optional().nullable(),
  tiresCost: z.coerce.number().optional().nullable(),
  tiresIntervalMonths: z.coerce.number().optional().nullable(),
  insuranceCost: z.coerce.number().optional().nullable(),
  insuranceIntervalMonths: z.coerce.number().optional().nullable(),
  fuelConsumption: z.coerce.number().optional().nullable(),
  targetMonthlyIncome: z.coerce.number().optional().nullable(),
  forecastShifts: z.coerce.number().int().min(1).max(50).optional(),
  theme: z.enum(['dark', 'light', 'system']).optional(),
  parkCommissionEnabled: z.boolean().optional(),
})

export async function GET() {
  const auth = await getAuth()
  if (!auth) return apiError('Unauthorized', 401)

  const settings = await prisma.settings.findUnique({ where: { userId: auth.userId } })
  return apiOk(settings)
}

export async function PUT(req: NextRequest) {
  const auth = await getAuth()
  if (!auth) return apiError('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  const parsed = settingsSchema.safeParse(body)
  if (!parsed.success) return apiError('Некорректные данные')

  const settings = await prisma.settings.upsert({
    where: { userId: auth.userId },
    update: parsed.data,
    create: { userId: auth.userId, ...parsed.data },
  })

  return apiOk(settings)
}
