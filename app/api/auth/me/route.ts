import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError, apiOk } from '@/lib/utils'

export async function GET() {
  const auth = await getAuth()
  if (!auth) return apiError('Unauthorized', 401)

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, email: true, name: true, createdAt: true },
  })
  if (!user) return apiError('Not found', 404)

  return apiOk(user)
}
