'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export function TelegramAuth() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    if (!tg) return

    tg.ready()
    tg.expand()

    const initData = tg.initData
    if (!initData) return

    const authPages = ['/login', '/register']
    if (!authPages.includes(pathname)) return

    fetch('/api/auth/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData }),
      credentials: 'include',
    }).then((r) => {
      if (r.ok) router.replace('/dashboard')
    })
  }, [pathname, router])

  return null
}
