'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard', label: '대시보드', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
  { href: '/estimates', label: '견적서 목록', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { href: '/estimate/new', label: '+ 새 견적서', icon: 'M12 4v16m8-8H4' },
  { href: '/crm', label: 'CRM', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { href: '/calendar', label: '캘린더', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
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
      <header className="sticky top-0 z-50 border-b border-brand-800/20 bg-brand-900 shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
          {/* 햄버거 + 로고 */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-brand-200 hover:bg-white/10 transition-colors"
              aria-label="메뉴"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent font-bold text-xs text-white">B</span>
              <span className="text-sm font-bold text-white tracking-tight">방수명가</span>
            </Link>
          </div>

          {/* 우측 간단 네비 */}
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.slice(0, 3).map(item => {
              const isActive = pathname === item.href || (item.href === '/estimates' && pathname.startsWith('/estimate'))
              return (
                <Link key={item.href} href={item.href}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive ? 'bg-white/15 text-white' : 'text-brand-200 hover:bg-white/10 hover:text-white'
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
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <nav className="absolute left-0 top-0 h-full w-72 bg-brand-900 shadow-2xl">
            {/* 헤더 */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent font-bold text-sm text-white">B</span>
                <span className="text-sm font-bold text-white">방수명가</span>
              </div>
              <button onClick={() => setMenuOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-300 hover:bg-white/10">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 메뉴 항목 */}
            <div className="py-3 px-2">
              {NAV_ITEMS.map(item => {
                const isActive = pathname === item.href || (item.href === '/estimates' && pathname.startsWith('/estimate'))
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${
                      isActive ? 'bg-white/15 font-semibold text-white' : 'text-brand-200 hover:bg-white/10 hover:text-white'
                    }`}>
                    <svg className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{width: 18, height: 18}}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                    {item.label}
                  </Link>
                )
              })}
            </div>

            {/* 로그아웃 */}
            <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
              <button onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-brand-300 hover:bg-white/10 hover:text-white transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                로그아웃
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
