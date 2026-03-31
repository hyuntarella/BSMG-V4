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
})
