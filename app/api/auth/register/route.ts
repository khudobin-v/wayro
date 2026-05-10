import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { setAuthCookies } from '@/lib/auth'
import { apiError, apiOk } from '@/lib/utils'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError('Некорректные данные')

  const { email, password, name } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return apiError('Пользователь с таким email уже существует')

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { email, name, passwordHash },
  })

  await setAuthCookies(user.id, user.email)
  return apiOk({ id: user.id, email: user.email, name: user.name }, 201)
}
