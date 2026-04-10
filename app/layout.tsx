import type { Metadata, Viewport } from 'next'
import './globals.css'
import MobileTabBar from '@/components/layout/MobileTabBar'
import { ToastProvider } from '@/components/ui/Toast'

export const metadata: Metadata = {
  title: '방수명가 견적서 v4',
  description: '음성 기반 방수 시공 견적서 시스템',
  manifest: '/manifest.json',
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#A11D1F',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body className="min-h-screen bg-surface font-sans text-ink antialiased">
        <ToastProvider>
          {children}
          <MobileTabBar />
        </ToastProvider>
      </body>
    </html>
  )
}
