import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-dev-secret-change-in-production'
)

const ACCESS_TOKEN_MAX_AGE = 60 * 60 // 1h
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30 // 30d

export async function signToken(payload: Record<string, unknown>, expiresIn: number) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as { userId: string; email: string; type: string }
  } catch {
    return null
  }
}

export async function setAuthCookies(userId: string, email: string) {
  const accessToken = await signToken({ userId, email, type: 'access' }, ACCESS_TOKEN_MAX_AGE)
  const refreshToken = await signToken({ userId, email, type: 'refresh' }, REFRESH_TOKEN_MAX_AGE)

  const cookieStore = cookies()
  cookieStore.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ACCESS_TOKEN_MAX_AGE,
    path: '/',
  })
  cookieStore.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_TOKEN_MAX_AGE,
    path: '/',
  })
}

export function clearAuthCookies() {
  const cookieStore = cookies()
  cookieStore.delete('access_token')
  cookieStore.delete('refresh_token')
}

export async function getAuthFromRequest(req: NextRequest) {
  const accessToken = req.cookies.get('access_token')?.value
  if (accessToken) {
    const payload = await verifyToken(accessToken)
    if (payload?.type === 'access') return payload
  }
  return null
}

export async function getAuth() {
  const cookieStore = cookies()
  const accessToken = cookieStore.get('access_token')?.value
  if (accessToken) {
    const payload = await verifyToken(accessToken)
    if (payload?.type === 'access') return payload
  }
  return null
}
