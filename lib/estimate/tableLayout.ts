/** Phase 4H: 행 수 자동 축소 tier 정책 */

export interface TableTier {
  tier: 1 | 2 | 3 | 4
  rowHeight: number
  fontClass: 'text-sm' | 'text-xs'
  paddingClass: 'py-1' | 'py-0.5' | 'py-0'
  headerHeight: number
  showOverflowWarning: boolean
}

/**
 * visibleItemCount 기준으로 테이블 tier 결정
 * - 1~15행: 28px / text-sm (기본)
 * - 16~18행: 24px / text-sm (행 높이만 축소)
 * - 19~20행: 22px / text-xs (행 높이 + 폰트 축소)
 * - 21행+: 22px / text-xs + 경고 배너
 */
export function calcTableTier(visibleItemCount: number): TableTier {
  if (visibleItemCount <= 15) {
    return {
      tier: 1,
      rowHeight: 28,
      fontClass: 'text-sm',
      paddingClass: 'py-1',
      headerHeight: 30,
      showOverflowWarning: false,
    }
  }

  if (visibleItemCount <= 18) {
    return {
      tier: 2,
      rowHeight: 24,
      fontClass: 'text-sm',
      paddingClass: 'py-0.5',
      headerHeight: 28,
      showOverflowWarning: false,
    }
  }

  if (visibleItemCount <= 20) {
    return {
      tier: 3,
      rowHeight: 22,
      fontClass: 'text-xs',
      paddingClass: 'py-0',
      headerHeight: 26,
      showOverflowWarning: false,
    }
  }

  return {
    tier: 4,
    rowHeight: 22,
    fontClass: 'text-xs',
    paddingClass: 'py-0',
    headerHeight: 26,
    showOverflowWarning: true,
  }
}
