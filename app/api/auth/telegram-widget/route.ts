import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { signToken } from '@/lib/auth'

function validateWidgetData(params: URLSearchParams, botToken: string): Record<string, string> | null {
  const hash = params.get('hash')
  if (!hash) return null

  const authDate = parseInt(params.get('auth_date') ?? '0', 10)
  if (Date.now() / 1000 - authDate > 86400) return null

  const dataCheckString = Array.from(params.entries())
    .filter(([k]) => k !== 'hash')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  const secretKey = crypto.createHash('sha256').update(botToken).digest()
  const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

  if (expectedHash !== hash) return null

  const result: Record<string, string> = {}
  params.forEach((v, k) => { if (k !== 'hash') result[k] = v })
  return result
}

export async function GET(req: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) return NextResponse.redirect(new URL('/login?error=1', req.url))

  const data = validateWidgetData(req.nextUrl.searchParams, botToken)
  if (!data) return NextResponse.redirect(new URL('/login?error=1', req.url))

  const tgId = data.id
  const email = `tg_${tgId}@wayro.internal`
  const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || data.username || 'Пользователь'

  let user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    user = await prisma.user.create({
      data: { email, name, passwordHash: crypto.randomBytes(32).toString('hex'), telegramChatId: tgId },
    })
  } else if (!user.telegramChatId) {
    user = await prisma.user.update({ where: { id: user.id }, data: { telegramChatId: tgId } })
  }

  const ACCESS = 60 * 60
  const REFRESH = 60 * 60 * 24 * 30
  const accessToken = await signToken({ userId: user.id, email, type: 'access' }, ACCESS)
  const refreshToken = await signToken({ userId: user.id, email, type: 'refresh' }, REFRESH)

  const res = NextResponse.redirect(new URL('/dashboard', req.url))
  res.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS,
  })
  res.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH,
  })
  return res
}
