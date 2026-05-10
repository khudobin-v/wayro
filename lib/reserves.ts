import { prisma } from './db'
import { differenceInDays } from 'date-fns'

interface ShiftData {
  id: string
  userId: string
  distanceKm: number
  netEarnings: number
  date: Date
}

export async function accrueReservesForShift(shift: ShiftData) {
  const reserves = await prisma.reserve.findMany({
    where: { userId: shift.userId, isActive: true },
  })

  const accruals: { reserveId: string; amount: number; name: string }[] = []

  for (const reserve of reserves) {
    let amount = 0

    if (reserve.type === 'maintenance' && reserve.costPerEvent && reserve.intervalKm) {
      amount = shift.distanceKm * (reserve.costPerEvent / reserve.intervalKm)
    } else if (reserve.type === 'tax' && reserve.taxPercent) {
      amount = shift.netEarnings * (reserve.taxPercent / 100)
    } else if (
      (reserve.type === 'tires' || reserve.type === 'insurance' || reserve.type === 'custom') &&
      reserve.costPerEvent &&
      reserve.intervalMonths
    ) {
      const refDate = reserve.lastAccruedAt ?? reserve.createdAt
      const shiftDate = new Date(shift.date)
      const days = differenceInDays(shiftDate, refDate)
      if (days > 0) {
        amount = (reserve.costPerEvent / (reserve.intervalMonths * 30.5)) * days
      }
    }

    if (amount > 0.01) {
      accruals.push({ reserveId: reserve.id, amount, name: reserve.name })

      await prisma.$transaction([
        prisma.reserve.update({
          where: { id: reserve.id },
          data: {
            balance: { increment: amount },
            lastAccruedAt: new Date(shift.date),
          },
        }),
        prisma.reserveEntry.create({
          data: {
            reserveId: reserve.id,
            shiftId: shift.id,
            amount,
            type: 'accrual',
          },
        }),
      ])
    }
  }

  return accruals
}

export async function rollbackReservesForShift(shiftId: string) {
  const entries = await prisma.reserveEntry.findMany({
    where: { shiftId, type: 'accrual' },
  })

  for (const entry of entries) {
    await prisma.reserve.update({
      where: { id: entry.reserveId },
      data: { balance: { decrement: entry.amount } },
    })
  }

  await prisma.reserveEntry.deleteMany({ where: { shiftId, type: 'accrual' } })
}
