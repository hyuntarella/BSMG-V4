'use client'

import { useState, useRef, useEffect } from 'react'
import type { Estimate, Method } from '@/lib/estimate/types'
import { getPdfFileName } from '@/lib/estimate/fileExport'

interface SaveButtonProps {
  estimateId: string
  estimate: Estimate
  onSaved?: () => void
}

interface SaveResult {
  success: boolean
  jsonUrl?: string
  excelUrl?: string
  compositePdfUrl?: string
  urethanePdfUrl?: string
  fileName?: {
    json: string
    excel: string
    compositePdf: string
    urethanePdf: string
  }
  error?: string
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export default function SaveButton({ estimateId, estimate, onSaved }: SaveButtonProps) {
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [lastResult, setLastResult] = useState<SaveResult | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 토스트 자동 제거
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  async function handleSave() {
    setSaving(true)
    setToast(null)

    try {
      const res = await fetch(`/api/estimates/${estimateId}/save-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data: SaveResult = await res.json()

      if (!res.ok || !data.success) {
        setToast({ type: 'error', message: data.error ?? '저장 실패' })
        return
      }

      setLastResult(data)

      // PDF 자동 다운로드
      if (data.compositePdfUrl) {
        triggerDownload(
          data.compositePdfUrl,
          data.fileName?.compositePdf ?? getPdfFileName(estimate, '복합'),
        )
      }
      if (data.urethanePdfUrl) {
        setTimeout(() => {
          triggerDownload(
            data.urethanePdfUrl!,
            data.fileName?.urethanePdf ?? getPdfFileName(estimate, '우레탄'),
          )
        }, 500)
      }

      setToast({ type: 'success', message: '저장 완료. 복합/우레탄 PDF 다운로드 시작.' })
      onSaved?.()
    } catch {
      setToast({ type: 'error', message: '네트워크 오류' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative inline-flex items-center gap-1">
      {/* 메인 저장 버튼 */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded bg-[#A11D1F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8a1719] disabled:opacity-50"
      >
        {saving ? '저장 중...' : '저장'}
      </button>

      {/* 추가 다운로드 드롭다운 */}
      {lastResult?.success && (
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="rounded border border-gray-300 px-2 py-2 text-sm hover:bg-gray-50"
            title="추가 다운로드"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded border border-gray-200 bg-white py-1 shadow-lg">
              {lastResult.jsonUrl && (
                <button
                  className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  onClick={() => {
                    window.open(lastResult.jsonUrl, '_blank')
                    setDropdownOpen(false)
                  }}
                >
                  JSON 다운로드
                </button>
              )}
              {lastResult.excelUrl && (
                <button
                  className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  onClick={() => {
                    window.open(lastResult.excelUrl, '_blank')
                    setDropdownOpen(false)
                  }}
                >
                  엑셀 다운로드
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 토스트 */}
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
