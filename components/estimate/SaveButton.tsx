'use client'

import { useState, useRef, useEffect } from 'react'
import type { Estimate } from '@/lib/estimate/types'
import { getPdfFileName } from '@/lib/estimate/fileNames'

interface SaveButtonProps {
  estimateId: string
  estimate: Estimate
  onSaved?: () => void
  fabStyle?: boolean
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

export default function SaveButton({ estimateId, estimate, onSaved, fabStyle }: SaveButtonProps) {
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
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

  /** 공법별 XLSX 다운로드 (Phase 3-A) */
  async function handleXlsxDownload() {
    setExporting(true)
    setToast(null)

    try {
      const methods: Array<{ key: string; label: string }> = []
      for (const s of estimate.sheets) {
        if (s.type === '복합') methods.push({ key: 'complex', label: '복합' })
        if (s.type === '우레탄') methods.push({ key: 'urethane', label: '우레탄' })
      }

      for (const m of methods) {
        const res = await fetch(`/api/estimates/${estimateId}/export`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format: 'xlsx', method: m.key }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'XLSX 생성 실패' }))
          setToast({ type: 'error', message: err.error ?? 'XLSX 생성 실패' })
          return
        }

        const blob = await res.blob()
        const disposition = res.headers.get('Content-Disposition') ?? ''
        const match = disposition.match(/filename="?([^"]+)"?/)
        const fileName = match ? decodeURIComponent(match[1]) : `견적서_${m.label}.xlsx`

        const url = URL.createObjectURL(blob)
        triggerDownload(url, fileName)
        URL.revokeObjectURL(url)
      }

      setToast({ type: 'success', message: 'XLSX 다운로드 완료' })
    } catch {
      setToast({ type: 'error', message: '네트워크 오류' })
    } finally {
      setExporting(false)
    }
  }

  const fabCls = 'min-w-[68px] h-11 px-[18px] rounded-[22px] border-none bg-white shadow-[0_4px_12px_rgba(0,0,0,.12),0_2px_4px_rgba(0,0,0,.08)] cursor-pointer text-sm font-semibold text-v-hdr transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(0,0,0,.2),0_3px_6px_rgba(0,0,0,.12)] active:translate-y-0 flex items-center justify-center tracking-tight disabled:opacity-50'
  const fabPrimaryCls = 'min-w-[68px] h-11 px-[18px] rounded-[22px] border-none bg-v-accent shadow-[0_4px_12px_rgba(0,0,0,.12),0_2px_4px_rgba(0,0,0,.08)] cursor-pointer text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#0062CC] hover:shadow-[0_6px_16px_rgba(0,0,0,.2),0_3px_6px_rgba(0,0,0,.12)] active:translate-y-0 flex items-center justify-center tracking-tight disabled:opacity-50'
  const fabDisabledCls = 'min-w-[68px] h-11 px-[18px] rounded-[22px] border-none bg-gray-200 shadow-[0_2px_6px_rgba(0,0,0,.06)] text-sm font-semibold text-gray-400 flex items-center justify-center tracking-tight cursor-not-allowed'

  if (fabStyle) {
    return (
      <>
        <button
          onClick={handleSave}
          disabled={saving}
          className={fabCls}
          title="저장 Ctrl+S"
        >
          {saving ? '...' : '저장'}
        </button>
        <button
          onClick={handleXlsxDownload}
          disabled={exporting}
          className={fabPrimaryCls}
          title="엑셀 다운로드"
        >
          {exporting ? '...' : 'XLSX'}
        </button>
        <button
          disabled
          className={fabDisabledCls}
          title="준비 중 — 차기 페이즈에서 구현 예정"
        >
          PDF
        </button>
        {toast && (
          <div
            className={`absolute -top-10 right-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium shadow-v-md ${
              toast.type === 'success'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {toast.message}
          </div>
        )}
      </>
    )
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
