import { test, expect } from '@playwright/test'

// 전제: TEST_MODE=true 환경에서 실행 (middleware 인증 우회)
// playwright.config.ts의 webServer 또는 별도로 TEST_MODE=true npm run dev 실행 필요

test.describe('대시보드', () => {
  test('대시보드 페이지 로드', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('h1')).toContainText('안녕하세요')
  })

  test('섹션 제목 표시', async ({ page }) => {
    await page.goto('/dashboard')

    // CS 현황 섹션
    await expect(page.getByText('CS 현황').first()).toBeVisible()

    // 오늘 일정 섹션
    await expect(page.getByText('오늘 일정').first()).toBeVisible()

    // 견적서 불러오기 버튼
    await expect(page.getByTestId('load-estimate-btn')).toBeVisible()
  })

  test('견적서 불러오기 모달 열기/닫기', async ({ page }) => {
    await page.goto('/dashboard')

    // 모달 열기
    const openBtn = page.getByTestId('load-estimate-btn')
    await openBtn.click()

    // 모달이 열림
    await expect(page.getByText('견적서 불러오기').last()).toBeVisible()

    // ESC로 닫기
    await page.keyboard.press('Escape')
    await expect(page.getByText('견적서 불러오기').last()).not.toBeVisible()

    // 다시 열고 오버레이 클릭으로 닫기
    await openBtn.click()
    await expect(page.getByText('견적서 불러오기').last()).toBeVisible()
    await page.mouse.click(10, 10) // 오버레이 영역 클릭
    await expect(page.getByText('견적서 불러오기').last()).not.toBeVisible()
  })
})
