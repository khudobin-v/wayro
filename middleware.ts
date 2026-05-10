import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from './lib/auth'

const PUBLIC_PATHS = ['/login', '/register', '/api/auth/login', '/api/auth/register', '/api/auth/telegram', '/api/telegram/webhook', '/api/cron/']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  if (isPublic) return NextResponse.next()

  if (pathname.startsWith('/api/')) {
    const auth = await getAuthFromRequest(req)
    if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.next()
  }

  const auth = await getAuthFromRequest(req)
  if (!auth) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
