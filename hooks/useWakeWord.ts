'use client'

import { useEffect, useCallback } from 'react'

interface UseWakeWordOptions {
  /** 녹음 토글 콜백 */
  onToggle: () => void
  /** 활성화 여부 */
  enabled?: boolean
}

/**
 * 하드웨어 버튼(볼륨키) + 키보드 단축키로 녹음 토글
 *
 * - 볼륨 Up/Down 키 → 녹음 토글 (PWA 모바일)
 * - Space 키 → 녹음 토글 (데스크탑, input 포커스 아닐 때)
 */
export function useWakeWord({ onToggle, enabled = true }: UseWakeWordOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return

      // input/textarea 포커스 중이면 무시
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      // 볼륨 버튼
      if (e.key === 'VolumeUp' || e.key === 'VolumeDown') {
        e.preventDefault()
        onToggle()
        return
      }

      // Space 키 (데스크탑)
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        onToggle()
        return
      }
    },
    [onToggle, enabled],
  )

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, enabled])
}
