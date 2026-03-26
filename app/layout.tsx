import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '방수명가 견적서 v4',
  description: '음성 기반 방수 시공 견적서 시스템',
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
      </head>
      <body className="min-h-screen bg-bg font-sans text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
