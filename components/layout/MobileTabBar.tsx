'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  {
    href: '/dashboard',
    label: '대시보드',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4',
  },
  {
    href: '/crm',
    label: 'CRM',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    href: '/calendar',
    label: '캘린더',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    href: '/estimates',
    label: '견적서',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    href: '/settings',
    label: '더보기',
    icon: 'M4 6h16M4 12h16M4 18h16',
  },
];

export default function MobileTabBar() {
  const pathname = usePathname();

  // 로그인, 오프라인, 견적서 편집 페이지에서는 숨김
  const hiddenPaths = ['/login', '/offline'];
  const isEstimateEditor = /^\/estimate\/[^/]+$/.test(pathname);
  if (hiddenPaths.some((p) => pathname.startsWith(p)) || isEstimateEditor) {
    return null;
  }

  return (
    <nav
      data-testid="mobile-tab-bar"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-ink-faint/20 bg-white shadow-elevated sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around px-1 py-1">
        {TABS.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href === '/estimates' && pathname.startsWith('/estimate'));

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 transition-colors ${
                isActive
                  ? 'text-brand'
                  : 'text-ink-muted hover:text-ink-secondary'
              }`}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={isActive ? 2 : 1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={tab.icon}
                />
              </svg>
              <span className="text-[10px] font-medium leading-none">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
