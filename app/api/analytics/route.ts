import { NextRequest } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError, apiOk } from '@/lib/utils'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import { ru } from 'date-fns/locale'

export async function GET(req: NextRequest) {
  const auth = await getAuth()
  if (!auth) return apiError('Unauthorized', 401)

  const { searchParams } = req.nextUrl
  const type = searchParams.get('type') ?? 'dashboard'
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')

  const now = new Date()
  const from = fromParam ? new Date(fromParam) : startOfMonth(now)
  const to = toParam ? new Date(toParam) : endOfMonth(now)

  if (type === 'dashboard') return getDashboardData(auth.userId, from, to, now)
  if (type === 'monthly') return getMonthlyData(auth.userId)
  if (type === 'efficiency') return getEfficiencyData(auth.userId, from, to)

  return apiError('Unknown analytics type')
}

const MIN_SHIFT_HOURS = 0.25 // игнорируем смены короче 15 минут в ₽/ч

function shiftHours(sh: { startTime: Date | null; endTime: Date | null }): number {
  if (!sh.startTime || !sh.endTime) return 0
  return (new Date(sh.endTime).getTime() - new Date(sh.startTime).getTime()) / 3600000
}

async function getDashboardData(userId: string, from: Date, to: Date, now: Date) {
  const settings = await prisma.settings.findUnique({ where: { userId } })

  const [completedShifts, expenses, reserves, recentCompleted] = await Promise.all([
    prisma.shift.findMany({
      where: { userId, status: 'completed', date: { gte: from, lte: to } },
      orderBy: { date: 'desc' },
    }),
    prisma.expense.findMany({ where: { userId, date: { gte: from, lte: to } } }),
    prisma.reserve.findMany({ where: { userId } }),
    // Последние N завершённых смен за всё время для прогноза
    prisma.shift.findMany({
      where: { userId, status: 'completed' },
      orderBy: { date: 'desc' },
      take: settings?.forecastShifts ?? 10,
    }),
  ])

  const totalNet = completedShifts.reduce((s, x) => s + x.netEarnings, 0)
  const totalGross = completedShifts.reduce((s, x) => s + x.grossEarnings + x.bonuses + x.tips, 0)
  const totalExpenses = expenses.reduce((s, x) => s + x.amount, 0)

  const reserveEntries = await prisma.reserveEntry.findMany({
    where: { shiftId: { in: completedShifts.map((s) => s.id) }, type: 'accrual' },
  })
  const totalReserves = reserveEntries.reduce((s, e) => s + e.amount, 0)
  const netIncome = totalNet - totalExpenses - totalReserves

  // Только смены с реальной длительностью (≥ 15 мин) для ₽/ч
  const validHourShifts = completedShifts.filter((sh) => shiftHours(sh) >= MIN_SHIFT_HOURS)
  const hoursWorked = validHourShifts.reduce((s, sh) => s + shiftHours(sh), 0)
  const totalKm = completedShifts.reduce((s, sh) => s + sh.distanceKm, 0)

  const incomePerHour = hoursWorked > 0 ? validHourShifts.reduce((s, x) => s + x.netEarnings, 0) / hoursWorked : 0
  const incomePerKm = totalKm > 0 ? totalNet / totalKm : 0

  const daysElapsed = Math.max(1, (now.getTime() - from.getTime()) / 86400000)
  const daysInMonth = (to.getTime() - from.getTime()) / 86400000
  const forecastN = settings?.forecastShifts ?? 10
  const avgShiftIncome =
    recentCompleted.length > 0
      ? recentCompleted.reduce((s, x) => s + x.netEarnings, 0) / recentCompleted.length
      : 0
  const forecastByRate = daysElapsed > 0 ? (totalNet / daysElapsed) * daysInMonth : 0
  const forecastByShifts = avgShiftIncome * forecastN

  return apiOk({
    period: { from, to },
    totals: {
      gross: totalGross,
      expenses: totalExpenses,
      reserves: totalReserves,
      net: netIncome,
    },
    metrics: {
      shiftsCount: completedShifts.length,
      hoursWorked,
      totalKm,
      incomePerHour,
      incomePerKm,
    },
    forecast: {
      byRate: forecastByRate,
      byShifts: forecastByShifts,
      targetMonthlyIncome: settings?.targetMonthlyIncome ?? null,
    },
    reserves: reserves.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      balance: r.balance,
      goal: r.goal,
    })),
    recentShifts: completedShifts.slice(0, 5),
  })
}

async function getMonthlyData(userId: string) {
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i)
    return { from: startOfMonth(d), to: endOfMonth(d), label: format(d, 'LLL', { locale: ru }) }
  })

  const data = await Promise.all(
    months.map(async ({ from, to, label }) => {
      const [shifts, expenses] = await Promise.all([
        prisma.shift.findMany({ where: { userId, status: 'completed', date: { gte: from, lte: to } } }),
        prisma.expense.findMany({ where: { userId, date: { gte: from, lte: to } } }),
      ])

      const net = shifts.reduce((s, x) => s + x.netEarnings, 0)
      const exp = expenses.reduce((s, x) => s + x.amount, 0)
      const validShifts = shifts.filter((sh) => shiftHours(sh) >= MIN_SHIFT_HOURS)
      const hours = validShifts.reduce((s, sh) => s + shiftHours(sh), 0)

      return {
        label,
        gross: net,
        expenses: exp,
        net: net - exp,
        shifts: shifts.length,
        incomePerHour: hours > 0 ? validShifts.reduce((s, x) => s + x.netEarnings, 0) / hours : 0,
      }
    })
  )

  return apiOk(data)
}

async function getEfficiencyData(userId: string, from: Date, to: Date) {
  const shifts = await prisma.shift.findMany({
    where: { userId, status: 'completed', date: { gte: from, lte: to } },
    orderBy: { date: 'desc' },
  })

  const byHourGroup = {
    morning: [] as number[],
    afternoon: [] as number[],
    evening: [] as number[],
    night: [] as number[],
  }
  const byDayOfWeek: Record<number, number[]> = {}

  for (const shift of shifts) {
    const hours = shiftHours(shift)
    if (hours < MIN_SHIFT_HOURS) continue
    const iph = shift.netEarnings / hours

    const hour = new Date(shift.date).getHours()
    if (hour >= 6 && hour < 12) byHourGroup.morning.push(iph)
    else if (hour >= 12 && hour < 17) byHourGroup.afternoon.push(iph)
    else if (hour >= 17 && hour < 22) byHourGroup.evening.push(iph)
    else byHourGroup.night.push(iph)

    const dow = new Date(shift.date).getDay()
    if (!byDayOfWeek[dow]) byDayOfWeek[dow] = []
    byDayOfWeek[dow].push(iph)
  }

  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)

  const topShifts = shifts
    .filter((s) => shiftHours(s) >= MIN_SHIFT_HOURS)
    .map((s) => ({ ...s, incomePerHour: s.netEarnings / shiftHours(s) }))
    .sort((a, b) => b.incomePerHour - a.incomePerHour)
    .slice(0, 5)

  return apiOk({
    byTimeOfDay: {
      morning: avg(byHourGroup.morning),
      afternoon: avg(byHourGroup.afternoon),
      evening: avg(byHourGroup.evening),
      night: avg(byHourGroup.night),
    },
    byDayOfWeek: Object.fromEntries(Object.entries(byDayOfWeek).map(([k, v]) => [k, avg(v)])),
    topShifts,
  })
}
