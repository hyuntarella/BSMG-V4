'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold text-brand">오류 발생</h1>
        <p className="mb-4 text-sm text-gray-500">
          {error.message || '알 수 없는 오류가 발생했습니다.'}
        </p>
        <button
          onClick={reset}
          className="rounded-md bg-brand px-6 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          다시 시도
        </button>
      </div>
    </div>
  )
}
