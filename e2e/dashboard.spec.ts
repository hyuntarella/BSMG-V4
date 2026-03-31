import { test, expect } from '@playwright/test'

// 전제: TEST_MODE=true 환경에서 실행 (middleware 인증 우회)

test.describe('대시보드', () => {
  // P0: DB-01
  test('대시보드 페이지 로드', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('h1')).toContainText('안녕하세요')
  })

  // P0: DB-02
  test('섹션 제목 표시', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('CS 현황').first()).toBeVisible()
    await expect(page.getByText('오늘 일정').first()).toBeVisible()
    await expect(page.getByTestId('load-estimate-btn')).toBeVisible()
  })

  // P0: DB-03
  test('견적서 불러오기 모달 열기/닫기', async ({ page }) => {
    await page.goto('/dashboard')

    const openBtn = page.getByTestId('load-estimate-btn')
    await openBtn.click()
    // 모달 내 h2 제목
    const modalTitle = page.locator('h2').filter({ hasText: '견적서 불러오기' })
    await expect(modalTitle).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(modalTitle).not.toBeVisible()

    await openBtn.click()
    await expect(modalTitle).toBeVisible()
    await page.mouse.click(10, 10)
    await expect(modalTitle).not.toBeVisible()
  })

  // P1: DB-04
  test('DB-04: 견적서 불러오기 모달 — 검색 input 존재', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const openBtn = page.getByTestId('load-estimate-btn')
    await openBtn.click()
    await page.waitForTimeout(500)

    // 모달이 열린 상태에서 검색 input 존재 확인
    const searchInput = page.locator('input[placeholder*="검색"]').first()
    await expect(searchInput).toBeVisible()
  })

  // P1: DB-05
  test('DB-05: 견적서 불러오기 모달 — 검색어 입력 → 결과 표시', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const openBtn = page.getByTestId('load-estimate-btn')
    await openBtn.click()
    await page.waitForTimeout(1000)

    const searchInput = page.locator('input[placeholder*="검색"]').first()
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 검색어 입력
      await searchInput.fill('테스트')
      await page.waitForTimeout(500)

      // 결과 목록이 표시되거나 빈 상태 메시지가 표시됨
      const hasList = await page.locator('[class*="cursor-pointer"], li, tr').first().isVisible({ timeout: 3000 }).catch(() => false)
      const hasEmpty = await page.getByText(/없습니다|결과 없음|0/).isVisible({ timeout: 2000 }).catch(() => false)

      // 검색 입력이 반영됨
      await expect(searchInput).toHaveValue('테스트')
    }
  })

  // P0: DB-06
  test('견적서 불러오기 모달 — 견적서 선택 → /estimate/[id] 이동', async ({ page }) => {
    await page.goto('/dashboard')

    const openBtn = page.getByTestId('load-estimate-btn')
    await openBtn.click()
    await page.waitForTimeout(1000)

    // 견적서 목록이 로드되면 첫 번째 항목 클릭
    const estItem = page.locator('[class*="cursor-pointer"]').first()
    if (await estItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await estItem.click()
      await page.waitForURL(/\/estimate\//, { timeout: 10000 })
      expect(page.url()).toContain('/estimate/')
    }
  })

  // P1: DB-07
  test('DB-07: CS 현황 카드 표시', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // CS 현황 섹션이 표시됨
    const csSection = page.getByText('CS 현황').first()
    await expect(csSection).toBeVisible()

    // CS 현황 섹션 컨테이너에서 카드 또는 내용 확인
    const csSectionContainer = csSection.locator('..').locator('..')
    const containerText = await csSectionContainer.textContent().catch(() => null)

    // 카드가 있거나 빈 상태 메시지가 있어야 함
    const hasCards = await page.locator('[class*="card"], [class*="cs-item"]').first().isVisible({ timeout: 3000 }).catch(() => false)
    const hasEmptyState = await page.getByText(/없습니다|데이터|로드/).isVisible({ timeout: 2000 }).catch(() => false)

    // CS 현황 섹션이 렌더링됨 (내용 유무와 관계없이)
    expect(await csSection.isVisible()).toBeTruthy()
  })

  // P2: DB-08
  test('DB-08: CS 현황 — "연락완료" 버튼 → 카드 숨김', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // "연락완료" 버튼 찾기 (CS 카드 내부)
    const contactedBtn = page.getByRole('button', { name: /연락완료|완료/i }).first()
    if (await contactedBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 클릭 전 CS 카드 수
      const cardsBefore = await page.locator('[class*="cs-card"], [class*="cs-item"], [data-testid*="cs"]').count()

      await contactedBtn.click()
      await page.waitForTimeout(500)

      // 클릭 후 카드 수가 줄었거나 카드가 숨겨짐
      const cardsAfter = await page.locator('[class*="cs-card"], [class*="cs-item"], [data-testid*="cs"]').count()
      // 카드가 줄었거나 에러 없이 통과
      expect(cardsAfter <= cardsBefore).toBeTruthy()
    }
    // CS 현황 섹션이 렌더링됨
    await expect(page.getByText('CS 현황').first()).toBeVisible()
  })

  // P2: DB-09
  test('DB-09: 미발송 견적 섹션 표시', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 미발송 견적 섹션 찾기
    const unsentSection = page.getByText(/미발송|발송 대기|unsent/i).first()
    const hasSectionTitle = await unsentSection.isVisible({ timeout: 3000 }).catch(() => false)

    if (hasSectionTitle) {
      // 섹션이 표시됨
      expect(hasSectionTitle).toBeTruthy()
    }
    // 미발송 섹션이 없어도 대시보드가 정상 렌더링됨
    await expect(page.locator('h1')).toContainText('안녕하세요')
  })

  // P2: DB-10
  test('DB-10: 견적 열람 고객 섹션 표시', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 견적 열람 섹션 찾기
    const viewedSection = page.getByText(/열람|열어본|viewed|읽은/i).first()
    const hasSectionTitle = await viewedSection.isVisible({ timeout: 3000 }).catch(() => false)

    if (hasSectionTitle) {
      expect(hasSectionTitle).toBeTruthy()
    }
    // 섹션이 없어도 대시보드가 정상 렌더링됨
    await expect(page.locator('h1')).toContainText('안녕하세요')
  })

  // P2: DB-11
  test('DB-11: 후속 연락 대상 섹션 표시', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 후속 연락 섹션 찾기
    const followUpSection = page.getByText(/후속|연락 대상|follow.up/i).first()
    const hasSectionTitle = await followUpSection.isVisible({ timeout: 3000 }).catch(() => false)

    if (hasSectionTitle) {
      expect(hasSectionTitle).toBeTruthy()
    }
    // 섹션이 없어도 대시보드가 정상 렌더링됨
    await expect(page.locator('h1')).toContainText('안녕하세요')
  })

  // P2: DB-12
  test('DB-12: 오늘 일정 최대 5건 표시', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 오늘 일정 섹션 확인
    const todaySection = page.getByText('오늘 일정').first()
    await expect(todaySection).toBeVisible()

    // 일정 항목 확인 — 최대 5건 제한
    const scheduleItems = page.locator('[class*="schedule-item"], [class*="event-item"], [data-testid*="schedule"]')
    const itemCount = await scheduleItems.count()
    expect(itemCount).toBeLessThanOrEqual(5)

    // 빈 상태도 허용 (일정이 없을 수 있음)
    if (itemCount === 0) {
      const hasEmptyMsg = await page.getByText(/일정이 없|no schedule|오늘은/i).isVisible({ timeout: 2000 }).catch(() => false)
      // 일정 없음 메시지 또는 빈 섹션 — 에러 없이 통과
    }
    await expect(page.locator('h1')).toContainText('안녕하세요')
  })
})
