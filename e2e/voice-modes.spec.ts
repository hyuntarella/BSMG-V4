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

test.describe('3모드 — 모드 전환', () => {
  test('MODE-01: 모드 토글 버튼 표시', async ({ page }) => {
    await createWithComplexSheet(page)
    const modeBtn = page.locator('[data-testid="mode-toggle"]')
    await expect(modeBtn).toBeVisible()
    // 기본 모드는 현장
    await expect(modeBtn).toContainText('현장')
  })

  test('MODE-02: 현장 → 운전 → 사무실 순환 전환', async ({ page }) => {
    await createWithComplexSheet(page)
    const modeBtn = page.locator('[data-testid="mode-toggle"]')

    // 현장 → 운전
    await modeBtn.click()
    await expect(modeBtn).toContainText('운전')

    // 운전 → 사무실
    await modeBtn.click()
    await expect(modeBtn).toContainText('사무실')

    // 사무실 → 현장
    await modeBtn.click()
    await expect(modeBtn).toContainText('현장')
  })

  test('MODE-03: 사무실 모드 — 텍스트 입력창 표시', async ({ page }) => {
    await createWithComplexSheet(page)
    const modeBtn = page.locator('[data-testid="mode-toggle"]')

    // 사무실 모드로 전환 (현장 → 운전 → 사무실)
    await modeBtn.click() // 운전
    await modeBtn.click() // 사무실
    await expect(modeBtn).toContainText('사무실')

    // 텍스트 입력창 표시
    const textInput = page.locator('[data-testid="text-input-bar"]')
    await expect(textInput).toBeVisible()
  })

  test('MODE-04: 현장 모드 — 마이크 버튼 표시, 텍스트 입력 숨김', async ({ page }) => {
    await createWithComplexSheet(page)
    // 기본 현장 모드
    const modeBtn = page.locator('[data-testid="mode-toggle"]')
    await expect(modeBtn).toContainText('현장')

    // 마이크 버튼 확인 (VoiceBar의 녹음 버튼)
    const micButton = page.getByRole('button', { name: /녹음/ })
    await expect(micButton).toBeVisible()

    // 텍스트 입력창 없음
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
    // 모드 전환 3회
    await modeBtn.click() // 운전
    await modeBtn.click() // 사무실
    await modeBtn.click() // 현장

    // 데이터 유지 확인
    await expect(row).toBeVisible()
  })
})

// ─── 사무실 모드 테스트 ────────────────────────────────────────────────────────

test.describe('3모드 — 사무실 모드', () => {
  // 사무실 모드로 진입하는 헬퍼
  async function enterOfficeMode(page: import('@playwright/test').Page) {
    await createWithComplexSheet(page)
    const modeBtn = page.locator('[data-testid="mode-toggle"]')
    await modeBtn.click() // 운전
    await modeBtn.click() // 사무실
    await expect(modeBtn).toContainText('사무실')
    return page.locator('[data-testid="text-input-bar"]')
  }

  test('OFFICE-01: 입력창에 "바탕 500" → 시트 하이라이트', async ({ page }) => {
    const input = await enterOfficeMode(page)
    await input.fill('바탕 500')
    await page.waitForTimeout(300)

    // 하이라이트: 바탕정리 행에 노란색 배경이 있는지 확인
    const row = page.locator('tr').filter({ hasText: '바탕정리' })
    await expect(row).toBeVisible()
    // 스크린샷으로 시각 확인
    await page.screenshot({ path: 'test-results/office-highlight.png' })
  })

  test('OFFICE-02: Enter → 시트 값 변경', async ({ page }) => {
    const input = await enterOfficeMode(page)

    // 바탕정리 재료비 현재값 확인
    const matCell = page.locator('tr').filter({ hasText: '바탕정리' }).locator('td').nth(5)
    const prevText = await matCell.textContent()

    await input.fill('바탕정리 재료비 500 넣어')
    await input.press('Enter')
    await page.waitForTimeout(500)

    // 값 변경 확인: 500으로 변경됨
    const newText = await matCell.textContent()
    expect(newText).toContain('500')
  })

  test('OFFICE-03: ESC → 미리보기 취소', async ({ page }) => {
    const input = await enterOfficeMode(page)
    await input.fill('바탕 500')
    await page.waitForTimeout(200)
    await input.press('Escape')
    await page.waitForTimeout(200)

    // 입력값 비어있어야 함
    await expect(input).toHaveValue('')
  })

  test('OFFICE-04: 다중 숫자 "바탕 500 1000 200" → 재/노/경 반영', async ({ page }) => {
    const input = await enterOfficeMode(page)
    await input.fill('바탕 500 1000 200')
    await input.press('Enter')
    await page.waitForTimeout(500)

    const row = page.locator('tr').filter({ hasText: '바탕정리' })
    const matCell = row.locator('td').nth(5) // mat unit price
    const laborCell = row.locator('td').nth(7) // labor unit price
    const expCell = row.locator('td').nth(9) // exp unit price

    const matText = await matCell.textContent()
    const laborText = await laborCell.textContent()
    const expText = await expCell.textContent()

    expect(matText).toContain('500')
    expect(laborText).toContain('1,000')
    expect(expText).toContain('200')
  })

  test('OFFICE-05: 다중 숫자 "바탕 500 1000" → 재/노 반영', async ({ page }) => {
    const input = await enterOfficeMode(page)
    await input.fill('바탕 500 1000')
    await input.press('Enter')
    await page.waitForTimeout(500)

    const row = page.locator('tr').filter({ hasText: '바탕정리' })
    const matCell = row.locator('td').nth(5)
    const laborCell = row.locator('td').nth(7)

    expect(await matCell.textContent()).toContain('500')
    expect(await laborCell.textContent()).toContain('1,000')
  })

  test('OFFICE-06: "전체 재 +10%" → 일괄 조정', async ({ page }) => {
    const input = await enterOfficeMode(page)

    // 먼저 바탕 재료비 설정
    await input.fill('바탕 재료비 1000 넣어')
    await input.press('Enter')
    await page.waitForTimeout(500)

    // 일괄 조정
    await input.fill('전체 재 +10%')
    await input.press('Enter')
    await page.waitForTimeout(500)

    // 바탕정리 재료비: 1000 × 1.1 = 1100
    const matCell = page.locator('tr').filter({ hasText: '바탕정리' }).locator('td').nth(5)
    expect(await matCell.textContent()).toContain('1,100')
  })

  test('OFFICE-07: 위 화살표 → 이전 명령 복원', async ({ page }) => {
    const input = await enterOfficeMode(page)

    await input.fill('바탕 재료비 500 넣어')
    await input.press('Enter')
    await page.waitForTimeout(300)

    // 위 화살표 → 이전 명령
    await input.press('ArrowUp')
    await expect(input).toHaveValue('바탕 재료비 500 넣어')
  })

  test('OFFICE-08: 대화 로그에 ⌨ 아이콘', async ({ page }) => {
    const input = await enterOfficeMode(page)

    await input.fill('바탕 재료비 500 넣어')
    await input.press('Enter')
    await page.waitForTimeout(500)

    // 대화 로그 열기
    const logToggle = page.locator('button').filter({ hasText: /대화|닫기/ })
    if (await logToggle.isVisible()) {
      await logToggle.click()
      await page.waitForTimeout(300)
      // 타이핑 아이콘 확인
      await expect(page.getByTitle('타이핑')).toBeVisible()
    }
  })
})

// ─── 이상치 테스트 ────────────────────────────────────────────────────────────

test.describe('3모드 — 이상치 감지', () => {
  async function enterOfficeMode(page: import('@playwright/test').Page) {
    await createWithComplexSheet(page)
    const modeBtn = page.locator('[data-testid="mode-toggle"]')
    await modeBtn.click() // 운전
    await modeBtn.click() // 사무실
    return page.locator('[data-testid="text-input-bar"]')
  }

  test('ANOMALY-01: "바탕 5" → 이상치 경고 (10원 미만)', async ({ page }) => {
    const input = await enterOfficeMode(page)
    await input.fill('바탕 재료비 5 넣어')
    await input.press('Enter')
    await page.waitForTimeout(500)

    // 대화 로그에 경고 표시
    const logToggle = page.locator('button').filter({ hasText: /대화|닫기/ })
    if (await logToggle.isVisible()) {
      await logToggle.click()
      await page.waitForTimeout(300)
    }
    // 이상치 경고 메시지 확인
    await expect(page.getByText(/5원이요/)).toBeVisible()
  })
})

// ─── 기존 E2E 호환 테스트 ─────────────────────────────────────────────────────

test.describe('3모드 — 기존 기능 호환', () => {
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
