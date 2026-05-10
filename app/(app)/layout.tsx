import { redirect } from 'next/navigation'
import { getAuth } from '@/lib/auth'
import { BottomNav, SideNav } from '@/components/nav/bottom-nav'
import { ToastProvider } from '@/components/ui/toast'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuth()
  if (!auth) redirect('/login')

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <div className="hidden md:flex flex-shrink-0">
          <SideNav />
        </div>
        <main className="flex-1 min-w-0 pb-24 md:pb-0">
          <div className="max-w-5xl mx-auto px-4 py-6">{children}</div>
        </main>
        <div className="md:hidden">
          <BottomNav />
        </div>
      </div>
    </ToastProvider>
  )
}
