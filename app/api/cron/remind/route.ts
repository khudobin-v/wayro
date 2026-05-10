import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendMessage } from '@/lib/telegram'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://wayro-mu.vercel.app'

export async function GET(req: NextRequest) {
  // Vercel cron auth
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Find users with Telegram who have no shifts/expenses today
  const users = await prisma.user.findMany({
    where: { telegramChatId: { not: null } },
    include: {
      shifts:   { where: { createdAt: { gte: today } }, take: 1 },
      expenses: { where: { createdAt: { gte: today } }, take: 1 },
    },
  })

  let sent = 0
  for (const user of users) {
    if (user.shifts.length === 0 && user.expenses.length === 0) {
      await sendMessage(user.telegramChatId!,
        '⏰ <b>Не забудь добавить отчёт за сегодня!</b>\n\n' +
        'Зафиксируй смену или расходы, чтобы статистика была точной.',
        {
          reply_markup: {
            inline_keyboard: [[{ text: '📋 Открыть Wayro', web_app: { url: APP_URL } }]],
          },
        }
      )
      sent++
    }
  }

  return NextResponse.json({ ok: true, sent })
}
