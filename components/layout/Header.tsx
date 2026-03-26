'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard', label: '대시보드' },
  { href: '/estimates', label: '견적서 목록' },
  { href: '/estimate/new', label: '+ 새 견적서' },
]

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
        <Link href="/dashboard" className="text-sm font-bold text-brand">
          방수명가
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === '/estimates' && pathname.startsWith('/estimate'))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-brand/10 text-brand'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
          <button
            onClick={handleLogout}
            className="ml-2 rounded-md px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            로그아웃
          </button>
        </nav>
      </div>
    </header>
  )
}
