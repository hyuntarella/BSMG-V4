import { test, expect } from '@playwright/test'

// 공통: 새 견적서 생성 + 복합 시트 추가 + 세부 탭
async function createWithComplexSheet(page: import('@playwright/test').Page) {
  await page.goto('/estimate/new')
  await page.waitForURL(/\/estimate\/[a-f0-9-]+$/, { timeout: 15000 })
  const id = page.url().split('/estimate/')[1]

  const addComplexBtn = page.getByRole('button', { name: '+ 복합' })
  if (await addComplexBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await addComplexBtn.click()
    await page.waitForTimeout(1000)
  }
  const detailTab = page.getByRole('button', { name: '복합-세부' })
  if (await detailTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await detailTab.click()
    await page.waitForTimeout(500)
  }
  return id
}

// ─── 모드 전환 테스트 ────────────────────────────────────────────────────────

test.describe('2모드 — 모드 전환', () => {
  test('MODE-01: 모드 토글 버튼 표시', async ({ page }) => {
    await createWithComplexSheet(page)
    const modeBtn = page.locator('[data-testid="mode-toggle"]')
    await expect(modeBtn).toBeVisible()
    // 기본 모드는 현장
    await expect(modeBtn).toContainText('현장')
  })

  test('MODE-02: 현장 ↔ 운전 순환 전환', async ({ page }) => {
    await createWithComplexSheet(page)
    const modeBtn = page.locator('[data-testid="mode-toggle"]')

    // 현장 → 운전
    await modeBtn.click()
    await expect(modeBtn).toContainText('운전')

    // 운전 → 현장
    await modeBtn.click()
    await expect(modeBtn).toContainText('현장')
  })

  test('MODE-04: 현장 모드 — 마이크 버튼 표시, 텍스트 입력 숨김', async ({ page }) => {
    await createWithComplexSheet(page)
    // 기본 현장 모드
    const modeBtn = page.locator('[data-testid="mode-toggle"]')
    await expect(modeBtn).toContainText('현장')

    // 마이크 버튼 확인 (VoiceBar의 녹음 버튼)
    const micButton = page.getByRole('button', { name: /녹음/ })
    await expect(micButton).toBeVisible()

    // 텍스트 입력창 없음 (사무실 모드 제거됨)
    const textInput = page.locator('[data-testid="text-input-bar"]')
    await expect(textInput).not.toBeVisible()
  })

  test('MODE-05: 운전 모드 — TTS ON 표시', async ({ page }) => {
    await createWithComplexSheet(page)
    const modeBtn = page.locator('[data-testid="mode-toggle"]')

    // 운전 모드로 전환
    await modeBtn.click()
    await expect(modeBtn).toContainText('운전')

    // TTS ON 배지 표시
    await expect(page.getByText('TTS ON')).toBeVisible()
  })

  test('MODE-06: 모드 전환 시 시트 데이터 유지', async ({ page }) => {
    await createWithComplexSheet(page)

    // 현재 시트에 데이터가 있는지 확인 (바탕정리 행 존재)
    const row = page.locator('tr').filter({ hasText: '바탕정리' })
    await expect(row).toBeVisible()

    const modeBtn = page.locator('[data-testid="mode-toggle"]')
    // 모드 전환 2회 (현장 → 운전 → 현장)
    await modeBtn.click() // 운전
    await modeBtn.click() // 현장

    // 데이터 유지 확인
    await expect(row).toBeVisible()
  })
})

// ─── 기존 E2E 호환 테스트 ─────────────────────────────────────────────────────

test.describe('2모드 — 기존 기능 호환', () => {
  test('COMPAT-01: 기본 모드(현장)에서 기존 UI 정상 동작', async ({ page }) => {
    await createWithComplexSheet(page)

    // 기본 현장 모드 확인
    const modeBtn = page.locator('[data-testid="mode-toggle"]')
    await expect(modeBtn).toContainText('현장')

    // VoiceBar 표시 확인
    const voiceBarArea = page.locator('.fixed.bottom-0')
    await expect(voiceBarArea.first()).toBeVisible()

    // 시트 데이터 표시 확인
    await expect(page.locator('tr').filter({ hasText: '바탕정리' })).toBeVisible()
  })
})
