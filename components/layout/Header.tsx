'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard', label: '대시보드' },
  { href: '/estimates', label: '견적서 목록' },
  { href: '/estimate/new', label: '+ 새 견적서' },
  { href: '/crm', label: 'CRM' },
  { href: '/calendar', label: '캘린더' },
  { href: '/settings', label: '설정' },
]

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  // 페이지 이동 시 메뉴 닫기
  useEffect(() => { setMenuOpen(false) }, [pathname])

  // ESC로 닫기
  useEffect(() => {
    if (!menuOpen) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [menuOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setMenuOpen(false)
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
          {/* 햄버거 + 로고 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMenuOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
              aria-label="메뉴"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/dashboard" className="text-sm font-bold text-brand">방수명가</Link>
          </div>

          {/* 우측 간단 네비 */}
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.slice(0, 3).map(item => {
              const isActive = pathname === item.href || (item.href === '/estimates' && pathname.startsWith('/estimate'))
              return (
                <Link key={item.href} href={item.href}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive ? 'bg-brand/10 text-brand' : 'text-gray-500 hover:bg-gray-100'
                  }`}>
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      {/* 오버레이 메뉴 */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <nav className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">
            {/* 헤더 */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-bold text-brand">방수명가</span>
              <button onClick={() => setMenuOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 메뉴 항목 */}
            <div className="py-2">
              {NAV_ITEMS.map(item => {
                const isActive = pathname === item.href || (item.href === '/estimates' && pathname.startsWith('/estimate'))
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center px-4 py-3 text-sm transition-colors ${
                      isActive ? 'bg-brand/5 font-semibold text-brand' : 'text-gray-700 hover:bg-gray-50'
                    }`}>
                    {item.label}
                  </Link>
                )
              })}
            </div>

            {/* 로그아웃 */}
            <div className="absolute bottom-0 left-0 right-0 border-t p-4">
              <button onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-100">
                로그아웃
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
