import { test, expect } from '@playwright/test'

// 전제: TEST_MODE=true 환경에서 실행 (middleware 인증 우회)
// playwright.config.ts의 webServer 또는 별도로 TEST_MODE=true npm run dev 실행 필요

test.describe('설정 페이지', () => {
  test('설정 페이지 로드', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1').filter({ hasText: '설정' })).toBeVisible()

    // 기본 탭 "단가표"가 활성화 — bg-brand text-white 클래스를 가진 버튼
    const activeTab = page.locator('button.bg-brand.text-white')
    await expect(activeTab.first()).toContainText('단가표')
  })

  test('탭 전환 — 7개 탭 순회', async ({ page }) => {
    await page.goto('/settings')

    const tabs = ['단가표', '기본공종', '프리셋', '원가', '계산규칙', '장비단가', '보증']
    for (const tab of tabs) {
      await page.getByRole('button', { name: tab }).click()
      await page.waitForTimeout(300)
      // 탭 클릭 후 해당 탭이 활성 상태
      const activeBtn = page.locator('button.bg-brand.text-white').first()
      await expect(activeBtn).toContainText(tab)
    }
  })

  test('요약 바 표시', async ({ page }) => {
    await page.goto('/settings')

    const summaryBar = page.getByTestId('settings-summary-bar')
    await expect(summaryBar).toBeVisible()
    await expect(summaryBar).toContainText('공과잡비')
    await expect(summaryBar).toContainText('기업이윤')
    await expect(summaryBar).toContainText('절사')
  })

  test('계산규칙 탭 — 편집 UI 표시', async ({ page }) => {
    await page.goto('/settings')
    await page.getByRole('button', { name: '계산규칙' }).click()

    // 공과잡비 input 존재
    await expect(page.getByText('공과잡비').first()).toBeVisible()
    // 기업이윤 input 존재
    await expect(page.getByText('기업이윤').first()).toBeVisible()
    // 절사 단위 select 존재
    await expect(page.getByText('절사 단위').first()).toBeVisible()
    // 저장 버튼 존재
    await expect(page.getByRole('button', { name: '저장' })).toBeVisible()
  })

  test('장비단가 탭 — 3종 단가 표시', async ({ page }) => {
    await page.goto('/settings')
    await page.getByRole('button', { name: '장비단가' }).click()

    await expect(page.getByText('사다리차', { exact: true })).toBeVisible()
    await expect(page.getByText('스카이차', { exact: true })).toBeVisible()
    await expect(page.getByText('폐기물처리', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '저장' })).toBeVisible()
  })

  test('보증 탭 — 년수 편집 UI 표시', async ({ page }) => {
    await page.goto('/settings')
    await page.getByRole('button', { name: '보증' }).click()

    await expect(page.getByText('하자보수년수')).toBeVisible()
    await expect(page.getByText('이행증권년수')).toBeVisible()
    await expect(page.getByRole('button', { name: '저장' })).toBeVisible()
  })
})
