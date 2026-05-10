import { clearAuthCookies } from '@/lib/auth'
import { apiOk } from '@/lib/utils'

export async function POST() {
  clearAuthCookies()
  return apiOk({ ok: true })
}
