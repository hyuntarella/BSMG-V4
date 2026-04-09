'use client'

import { useRef, useState, useEffect } from 'react'
import { importFromJson } from '@/lib/estimate/jsonIO'
import type { Estimate } from '@/lib/estimate/types'

interface LoadButtonProps {
  onLoad: (estimate: Estimate) => void
}

export default function LoadButton({ onLoad }: LoadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const jsonStr = reader.result as string
        const estimate = importFromJson(jsonStr)
        onLoad(estimate)
        setToast({ type: 'success', message: '견적서를 불러왔습니다' })
      } catch (err) {
        const msg = err instanceof Error ? err.message : '파일 읽기 실패'
        setToast({ type: 'error', message: msg })
      }
    }
    reader.readAsText(file)

    // 동일 파일 재선택 가능하도록 초기화
    e.target.value = ''
  }

  return (
    <div className="relative inline-block">
      <input
        ref={inputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="rounded border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
      >
        불러오기
      </button>

      {toast && (
        <div
          className={`absolute -bottom-10 left-0 whitespace-nowrap rounded px-3 py-1.5 text-xs font-medium shadow ${
            toast.type === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}
