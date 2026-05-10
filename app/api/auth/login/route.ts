import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { setAuthCookies } from '@/lib/auth'
import { apiError, apiOk } from '@/lib/utils'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError('Некорректные данные')

  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return apiError('Неверный email или пароль', 401)

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return apiError('Неверный email или пароль', 401)

  await setAuthCookies(user.id, user.email)
  return apiOk({ id: user.id, email: user.email, name: user.name })
}
