import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { signToken } from '@/lib/auth'

function validateTelegramInitData(initData: string, botToken: string): Record<string, string> | null {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null
  params.delete('hash')

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

  if (expectedHash !== hash) return null

  const result: Record<string, string> = {}
  params.forEach((v, k) => { result[k] = v })
  return result
}

export async function POST(req: NextRequest) {
  const { initData } = await req.json()
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) return NextResponse.json({ error: 'Bot not configured' }, { status: 500 })

  const data = validateTelegramInitData(initData, botToken)
  if (!data) return NextResponse.json({ error: 'Invalid initData' }, { status: 401 })

  const tgUser = JSON.parse(data.user)
  const email = `tg_${tgUser.id}@wayro.internal`
  const name = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || tgUser.username || 'Пользователь'

  let user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    user = await prisma.user.create({
      data: { email, name, passwordHash: crypto.randomBytes(32).toString('hex') },
    })
  }

  const ACCESS = 60 * 60
  const REFRESH = 60 * 60 * 24 * 30
  const accessToken  = await signToken({ userId: user.id, email, type: 'access' }, ACCESS)
  const refreshToken = await signToken({ userId: user.id, email, type: 'refresh' }, REFRESH)

  const res = NextResponse.json({ ok: true })
  const cookieOpts = {
    httpOnly: true,
    secure: true,
    sameSite: 'none' as const,
    path: '/',
  }
  res.cookies.set('access_token',  accessToken,  { ...cookieOpts, maxAge: ACCESS  })
  res.cookies.set('refresh_token', refreshToken, { ...cookieOpts, maxAge: REFRESH })
  return res
}
