import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendMessage } from '@/lib/telegram'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://wayro-mu.vercel.app'

async function handleMessage(chatId: number, text: string) {
  const cmd = text.split(' ')[0].toLowerCase()

  if (cmd === '/start' || cmd === '/menu') {
    await sendMessage(chatId,
      '👋 Привет! Я <b>Wayro</b> — твой трекер доходов курьера.\n\nНажми кнопку ниже, чтобы открыть приложение.',
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '🚀 Открыть Wayro', web_app: { url: APP_URL } },
          ]],
        },
      }
    )
    return
  }

  if (cmd === '/stats') {
    const user = await prisma.user.findFirst({ where: { telegramChatId: String(chatId) } })
    if (!user) {
      await sendMessage(chatId, 'Сначала откройте приложение и войдите через Telegram.')
      return
    }

    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    const [shifts, expenses] = await Promise.all([
      prisma.shift.findMany({ where: { userId: user.id, date: { gte: from }, status: 'completed' } }),
      prisma.expense.findMany({ where: { userId: user.id, date: { gte: from } } }),
    ])

    const gross = shifts.reduce((s, sh) => s + sh.grossEarnings + sh.bonuses + sh.tips, 0)
    const exp   = expenses.reduce((s, e) => s + e.amount, 0)
    const net   = gross - exp

    const fmt = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽'
    const month = now.toLocaleString('ru-RU', { month: 'long' })

    await sendMessage(chatId,
      `📊 <b>Статистика за ${month}</b>\n\n` +
      `💰 Выплата: <b>${fmt(gross)}</b>\n` +
      `💸 Расходы: <b>−${fmt(exp)}</b>\n` +
      `✅ Чистыми: <b>${fmt(net)}</b>\n\n` +
      `🚗 Смен: ${shifts.length}\n` +
      `📦 Заказов: ${shifts.reduce((s, sh) => s + sh.ordersCount, 0)}`
    )
    return
  }

  if (cmd === '/help') {
    await sendMessage(chatId,
      '<b>Команды Wayro:</b>\n\n' +
      '/start — открыть приложение\n' +
      '/stats — статистика за месяц\n' +
      '/help — справка'
    )
    return
  }

  await sendMessage(chatId, 'Используй /help для списка команд или открой приложение кнопкой ниже.', {
    reply_markup: {
      inline_keyboard: [[{ text: '📱 Открыть Wayro', web_app: { url: APP_URL } }]],
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const msg = body.message
    if (msg?.text && msg?.chat?.id) {
      await handleMessage(msg.chat.id, msg.text)
    }
  } catch {}
  return NextResponse.json({ ok: true })
}
