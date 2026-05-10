import { redirect } from 'next/navigation'
import { getAuth } from '@/lib/auth'
import { BottomNav, SideNav } from '@/components/nav/bottom-nav'
import { ToastProvider } from '@/components/ui/toast'
import { ActiveShiftBanner, StartShiftButton } from '@/components/shifts/active-shift-banner'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuth()
  if (!auth) redirect('/login')

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <div className="hidden md:flex flex-shrink-0">
          <SideNav />
        </div>
        <main className="flex-1 min-w-0 pb-36 md:pb-0">
          <div className="max-w-5xl mx-auto px-4 py-6">{children}</div>
        </main>

        {/* Floating shift button — mobile only, above bottom nav */}
        <div className="md:hidden fixed bottom-[72px] left-0 right-0 z-40 px-4 pb-2">
          <ActiveShiftBanner />
          <StartShiftButton />
        </div>

        <div className="md:hidden">
          <BottomNav />
        </div>
      </div>
    </ToastProvider>
  )
}
