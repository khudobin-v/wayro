'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { WayroLogo } from '@/components/ui/wayro-logo'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('error')) {
      setError('Ошибка авторизации через Telegram')
    }

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', 'wayro_trackerbot')
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-auth-url', `${window.location.origin}/api/auth/telegram-widget`)
    script.setAttribute('data-request-access', 'write')
    script.async = true
    const container = document.getElementById('tg-widget')
    container?.appendChild(script)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm animate-fade-in">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 border border-white/08 mb-4">
          <WayroLogo size={36} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Wayro</h1>
        <p className="text-sm text-white/40 mt-1">Войдите в аккаунт</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-surface border border-border rounded-xl px-4 py-3.5 text-sm placeholder:text-white/30 focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-surface border border-border rounded-xl px-4 py-3.5 text-sm placeholder:text-white/30 focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>

        {error && (
          <p className="text-danger text-sm px-1">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-black font-semibold rounded-xl py-3.5 text-sm transition-opacity disabled:opacity-60 mt-2"
        >
          {loading ? 'Входим...' : 'Войти'}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-white/30">или</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <div id="tg-widget" className="flex justify-center" />

      <p className="text-center text-sm text-white/40 mt-6">
        Нет аккаунта?{' '}
        <Link href="/register" className="text-accent hover:underline">
          Зарегистрироваться
        </Link>
      </p>
    </div>
  )
}
