'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, ClipboardText, Invoice, Coins, ChartBar, Gear } from '@phosphor-icons/react'
import { WayroWordmark } from '@/components/ui/wayro-logo'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/dashboard', icon: House, label: 'Главная' },
  { href: '/shifts', icon: ClipboardText, label: 'Смены' },
  { href: '/expenses', icon: Invoice, label: 'Расходы' },
  { href: '/reserves', icon: Coins, label: 'Резервы' },
  { href: '/analytics', icon: ChartBar, label: 'Аналитика' },
  { href: '/settings', icon: Gear, label: 'Настройки' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-nav safe-bottom">
      <div className="flex items-center justify-around px-1 pt-2 pb-2 max-w-lg mx-auto">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-2 py-1.5 rounded-2xl transition-all duration-200 min-w-0 flex-1',
                active
                  ? 'text-accent'
                  : 'text-white/30 hover:text-white/60'
              )}
            >
              <div className={cn(
                'w-10 h-7 flex items-center justify-center rounded-xl transition-all duration-200',
                active && 'bg-accent/12'
              )}>
                <Icon size={20} weight={active ? 'fill' : 'regular'} />
              </div>
              <span className="text-[9px] font-medium leading-none truncate">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function SideNav() {
  const pathname = usePathname()

  return (
    <nav className="glass-sidebar w-56 flex-shrink-0 flex flex-col gap-0.5 py-6 px-3 min-h-screen">
      <div className="flex items-center gap-2.5 px-3 mb-7">
        <WayroWordmark />
      </div>
      {tabs.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-150',
              active
                ? 'bg-accent/10 text-accent border border-accent/15'
                : 'text-white/35 hover:text-white/70 hover:bg-white/5 border border-transparent'
            )}
          >
            <Icon size={17} weight={active ? 'fill' : 'regular'} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
