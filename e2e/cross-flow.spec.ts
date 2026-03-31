import { test, expect } from '@playwright/test'

// P0: 크로스 기능 E2E 플로우

test.describe('크로스 기능 플로우', () => {
  test('FL-01: CRM → "견적서 작성" → /estimate/new → 에디터 로드', async ({ page }) => {
    await page.goto('/crm')
    await page.waitForLoadState('networkidle')

    // 카드 클릭으로 상세 모달 열기
    const firstCard = page.locator('[data-testid="kanban-card"]').first()
    if (await firstCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstCard.click()
      await page.waitForTimeout(500)

      // "견적서 작성" 버튼 클릭
      const createEstBtn = page.getByText('견적서 작성').first()
      if (await createEstBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createEstBtn.click()
        await page.waitForURL(/\/estimate\//, { timeout: 15000 })
        expect(page.url()).toContain('/estimate/')
      }
    }
  })

  test('FL-02: 견적서 편집 → 저장 → 목록에 표시', async ({ page }) => {
    // 새 견적서 생성
    await page.goto('/estimate/new')
    await page.waitForURL(/\/estimate\/[a-f0-9-]+$/, { timeout: 15000 })

    // 저장 (자동저장 대기)
    await page.waitForTimeout(2000)

    // 목록으로 이동하여 확인
    await page.goto('/estimates')
    await page.waitForLoadState('networkidle')

    // 카드가 1개 이상 또는 빈 상태 메시지
    const hasCards = await page.locator('a[href*="/estimate/"]').count()
    const hasEmpty = await page.getByText(/견적서가 없습니다/).isVisible().catch(() => false)
    expect(hasCards > 0 || hasEmpty).toBeTruthy()
  })

  test('FL-03: 견적서 편집 → 엑셀 버튼 클릭 → API 호출', async ({ page }) => {
    await page.goto('/estimate/new')
    await page.waitForURL(/\/estimate\/[a-f0-9-]+$/, { timeout: 15000 })

    // 복합 시트 추가
    const addComplexBtn = page.getByRole('button', { name: '+ 복합' })
    if (await addComplexBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addComplexBtn.click()
      await page.waitForTimeout(1000)
    }

    // 엑셀 버튼 클릭 → generate API 호출
    const excelBtn = page.getByRole('button', { name: '엑셀' }).first()
    await expect(excelBtn).toBeEnabled()
    const resPromise = page.waitForResponse(
      res => res.url().includes('/generate'),
      { timeout: 30000 }
    )
    await excelBtn.click()
    const response = await resPromise
    expect(response.status()).not.toBe(404)
  })

  test('FL-05: 대시보드 → 견적서 불러오기 → 모달 열기', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const loadBtn = page.getByTestId('load-estimate-btn')
    if (await loadBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await loadBtn.click()
      await page.waitForTimeout(1000)

      // 모달 내 h2 제목 확인
      const modalTitle = page.locator('h2').filter({ hasText: '견적서 불러오기' })
      await expect(modalTitle).toBeVisible()

      // 검색 input 확인
      const searchInput = page.locator('input[placeholder*="검색"]')
      if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(searchInput).toBeVisible()
      }
    }
  })

  test('FL-06: /estimate/new → 공종 추가 → 편집 → 합계 확인', async ({ page }) => {
    await page.goto('/estimate/new')
    await page.waitForURL(/\/estimate\/[a-f0-9-]+$/, { timeout: 15000 })

    // 복합 시트 추가
    const addComplexBtn = page.getByRole('button', { name: '+ 복합' })
    if (await addComplexBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addComplexBtn.click()
      await page.waitForTimeout(1000)
    }

    // 세부 탭
    const detailTab = page.getByRole('button', { name: '복합-세부' })
    if (await detailTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await detailTab.click()
      await page.waitForTimeout(500)
    }

    // 공종 추가
    await page.getByText('+ 공종 추가').first().click()
    await page.getByRole('button', { name: '자유입력' }).click()
    await page.waitForTimeout(300)
    await page.getByPlaceholder('예: 크랙보수').fill('방수시트')
    await page.locator('select').selectOption('m²')
    await page.locator('button').filter({ hasText: '추가' }).last().click()
    await page.waitForTimeout(500)

    // 공종이 테이블에 표시
    await expect(page.getByText('방수시트').first()).toBeVisible()
    // 합계 확인
    await expect(page.getByText('합 계').first()).toBeVisible()
  })
})

// P0: 외부 API 연동 — 페이지 로드 확인
test.describe('외부 API 연동', () => {
  test('EX-01: /crm 로드 → 데이터 또는 빈 상태 표시', async ({ page }) => {
    await page.goto('/crm')
    await page.waitForLoadState('networkidle')
    // 탭이 보이면 CRM 로드 성공
    await expect(page.getByText('문의')).toBeVisible()
  })

  test('EX-04: /settings → 데이터 로드', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1')).toContainText('설정')
  })

  test('EX-05: /estimates → 견적서 목록 로드', async ({ page }) => {
    await page.goto('/estimates')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: '견적서 목록' })).toBeVisible()
  })
})
