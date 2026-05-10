import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import Script from 'next/script'
import { TelegramAuth } from '@/components/telegram-auth'
import './globals.css'

const ttHoves = localFont({
  src: './fonts/TTHovesProVariable.ttf',
  variable: '--font-tt-hoves',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Wayro — трекер доходов курьера',
  description: 'Трекер доходов, расходов и резервов для автокурьера Яндекс.Доставки',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Wayro',
    startupImage: '/icon-512.png',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-512.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={ttHoves.variable}>
      <body>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <TelegramAuth />
        {children}
      </body>
    </html>
  )
}
