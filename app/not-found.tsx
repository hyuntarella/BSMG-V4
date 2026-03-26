import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="mb-2 text-4xl font-bold text-brand">404</h1>
        <p className="mb-4 text-sm text-gray-500">페이지를 찾을 수 없습니다.</p>
        <Link
          href="/dashboard"
          className="rounded-md bg-brand px-6 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          대시보드로 이동
        </Link>
      </div>
    </div>
  )
}
