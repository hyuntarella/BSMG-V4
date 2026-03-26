import type { VoiceParsed, Method, BuildItemsInput, PriceMatrixRaw } from '@/lib/estimate/types'
import { buildSheet } from '@/lib/estimate/buildItems'
import { getAR } from '@/lib/estimate/areaRange'

/**
 * 음성 파싱 결과(VoiceParsed) → BuildItemsInput → EstimateSheet
 *
 * 기본 평단가: P매트릭스에서 해당 면적대의 중간값 사용
 */
export function convertToEstimate(
  parsed: VoiceParsed,
  priceMatrix: PriceMatrixRaw,
  defaultPricePerPyeong?: number,
) {
  const methods: Method[] = []

  if (parsed.method === '복합' || parsed.method === '복합+우레탄') {
    methods.push('복합')
  }
  if (parsed.method === '우레탄' || parsed.method === '복합+우레탄') {
    methods.push('우레탄')
  }
  if (methods.length === 0) {
    methods.push('복합') // 기본값
  }

  const m2 = parsed.area ?? 0

  const sheets = methods.map(method => {
    // 평단가 결정: 지정값 or P매트릭스 중간값
    const ppp = defaultPricePerPyeong ?? getMiddlePrice(priceMatrix, m2, method)

    const input: BuildItemsInput = {
      method,
      m2,
      pricePerPyeong: ppp,
      priceMatrix,
      options: {
        leak: parsed.leak ?? undefined,
        rooftop: parsed.rooftop ?? undefined,
        plaster: parsed.plaster ?? undefined,
        elevator: parsed.elevator ?? undefined,
        ladder: parsed.ladder ?? undefined,
        sky: parsed.sky ?? undefined,
        dryvit: parsed.dryvit ?? undefined,
        waste: parsed.waste ?? undefined,
      },
    }

    return buildSheet(input)
  })

  return {
    m2,
    sheets,
    memo: parsed.notes ?? undefined,
    deadline: parsed.deadline ?? undefined,
  }
}

/**
 * P매트릭스에서 해당 면적대/공법의 평단가 중간값
 */
function getMiddlePrice(
  matrix: PriceMatrixRaw,
  m2: number,
  method: Method,
): number {
  const ar = getAR(m2 || 100) // m2가 0이면 기본 100
  const methodData = matrix[ar]?.[method]
  if (!methodData) return 35000 // 기본값

  const prices = Object.keys(methodData).map(Number).sort((a, b) => a - b)
  if (prices.length === 0) return 35000

  return prices[Math.floor(prices.length / 2)]
}
