'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { WayroLogo } from '@/components/ui/wayro-logo'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
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
        <p className="text-sm text-white/40 mt-1">Создайте аккаунт</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Имя (необязательно)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-surface border border-border rounded-xl px-4 py-3.5 text-sm placeholder:text-white/30 focus:outline-none focus:border-accent/50 transition-colors"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-surface border border-border rounded-xl px-4 py-3.5 text-sm placeholder:text-white/30 focus:outline-none focus:border-accent/50 transition-colors"
        />
        <input
          type="password"
          placeholder="Пароль (мин. 6 символов)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full bg-surface border border-border rounded-xl px-4 py-3.5 text-sm placeholder:text-white/30 focus:outline-none focus:border-accent/50 transition-colors"
        />

        {error && <p className="text-danger text-sm px-1">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-black font-semibold rounded-xl py-3.5 text-sm transition-opacity disabled:opacity-60 mt-2"
        >
          {loading ? 'Создаём...' : 'Создать аккаунт'}
        </button>
      </form>

      <p className="text-center text-sm text-white/40 mt-6">
        Уже есть аккаунт?{' '}
        <Link href="/login" className="text-accent hover:underline">
          Войти
        </Link>
      </p>
    </div>
  )
}
