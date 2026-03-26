import Link from 'next/link'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold text-gray-700">오프라인</h1>
        <p className="mb-4 text-sm text-gray-500">
          인터넷 연결이 필요합니다. 연결 확인 후 다시 시도해주세요.
        </p>
        <Link
          href="/dashboard"
          className="rounded-md bg-brand px-6 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          새로고침
        </Link>
      </div>
    </div>
  )
}
