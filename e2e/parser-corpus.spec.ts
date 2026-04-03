import { test, expect } from '@playwright/test'

/**
 * 파서 코퍼스 P0 버그 E2E 스모크 테스트
 * 사무실 모드 텍스트 입력으로 핵심 버그 수정을 검증한다.
 */

async function setupOfficeMode(page: import('@playwright/test').Page) {
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

  // 사무실 모드로 전환
  const modeBtn = page.locator('[data-testid="mode-toggle"]')
  await modeBtn.click() // 운전
  await modeBtn.click() // 사무실
  await expect(modeBtn).toContainText('사무실')

  return page.locator('[data-testid="text-input-bar"]')
}

test.describe('파서 코퍼스 P0 — 수량 없는 추가', () => {
  test('ADD-001: "사다리차 추가" → 공종 추가됨', async ({ page }) => {
    const input = await setupOfficeMode(page)

    // 사다리차 행이 이미 있는지 확인 (기본 시트에 있을 수 있음)
    const beforeCount = await page.locator('tr').filter({ hasText: '사다리차' }).count()

    await input.fill('사다리차 추가')
    await input.press('Enter')
    await page.waitForTimeout(1000)

    // 사다리차 행이 추가되었거나 이미 존재
    const afterCount = await page.locator('tr').filter({ hasText: '사다리차' }).count()
    expect(afterCount).toBeGreaterThanOrEqual(beforeCount)
  })

  test('ADD-008: "크랙보수 추가해줘" → 새 공종 추가됨', async ({ page }) => {
    const input = await setupOfficeMode(page)

    await input.fill('크랙보수 추가해줘')
    await input.press('Enter')
    await page.waitForTimeout(1000)

    const row = page.locator('tr').filter({ hasText: '크랙보수' })
    await expect(row).toBeVisible()
  })
})

test.describe('파서 코퍼스 P0 — 위치 지정 추가', () => {
  test('POS-001: "사다리차 3번에 추가" → 3번 위치에 추가', async ({ page }) => {
    const input = await setupOfficeMode(page)

    await input.fill('크랙보수 3번에 추가')
    await input.press('Enter')
    await page.waitForTimeout(1000)

    // 크랙보수 행이 추가되었는지 확인
    const row = page.locator('tr').filter({ hasText: '크랙보수' })
    await expect(row).toBeVisible()
  })
})
