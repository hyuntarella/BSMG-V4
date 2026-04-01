'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen bg-brand-900">
      {/* 좌측 브랜드 패널 — 데스크탑만 */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center px-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-2xl font-bold text-white mb-6">
          B
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">방수명가</h1>
        <p className="mt-3 text-base text-brand-200 text-center leading-relaxed">
          음성 한마디로 견적 완성
        </p>
        <div className="mt-8 flex items-center gap-3 rounded-full bg-white/10 px-5 py-2.5">
          <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2" />
          </svg>
          <span className="text-sm text-brand-100">견적서 v4</span>
        </div>
      </div>

      {/* 우측 폼 영역 */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 bg-surface rounded-t-3xl lg:rounded-l-3xl lg:rounded-tr-none">
        <div className="w-full max-w-sm space-y-8">
          {/* 모바일 로고 */}
          <div className="text-center lg:hidden">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-900 text-lg font-bold text-white mb-3">
              B
            </div>
            <h1 className="text-xl font-bold text-ink">방수명가</h1>
            <p className="mt-1 text-sm text-ink-secondary">음성 한마디로 견적 완성</p>
          </div>

          {/* 데스크탑 타이틀 */}
          <div className="hidden lg:block">
            <h2 className="text-2xl font-bold text-ink">로그인</h2>
            <p className="mt-1 text-sm text-ink-secondary">계정에 로그인하세요</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink">
                이메일
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 block w-full rounded-xl border border-ink-faint/30 bg-white px-4 py-2.5 text-sm text-ink shadow-card focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 block w-full rounded-xl border border-ink-faint/30 bg-white px-4 py-2.5 text-sm text-ink shadow-card focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-brand to-brand-dark px-4 py-3 text-sm font-semibold text-white shadow-card hover:shadow-card-hover transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
