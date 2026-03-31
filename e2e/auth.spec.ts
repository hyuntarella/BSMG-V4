import { test, expect } from '@playwright/test'

// P0: 인증/미들웨어 — TEST_MODE=true 환경에서 직접 접근 가능

test.describe('인증 — TEST_MODE 우회', () => {
  test('A-01: /crm 직접 접근 가능', async ({ page }) => {
    const res = await page.goto('/crm')
    expect(res?.status()).toBeLessThan(400)
    await expect(page.locator('body')).not.toHaveText(/login/i)
    expect(page.url()).toContain('/crm')
  })

  test('A-02: /dashboard 직접 접근 가능', async ({ page }) => {
    const res = await page.goto('/dashboard')
    expect(res?.status()).toBeLessThan(400)
    expect(page.url()).toContain('/dashboard')
  })

  test('A-03: /estimates 직접 접근 가능', async ({ page }) => {
    const res = await page.goto('/estimates')
    expect(res?.status()).toBeLessThan(400)
    expect(page.url()).toContain('/estimates')
  })

  test('A-04: /estimate/new 직접 접근 가능', async ({ page }) => {
    const res = await page.goto('/estimate/new')
    expect(res?.status()).toBeLessThan(400)
    // new는 자동 리다이렉트하므로 /estimate/ 포함 확인
    await page.waitForURL(/\/estimate\//)
  })

  test('A-05: /settings 직접 접근 가능', async ({ page }) => {
    const res = await page.goto('/settings')
    expect(res?.status()).toBeLessThan(400)
    expect(page.url()).toContain('/settings')
  })

  test('A-06: /calendar 직접 접근 가능', async ({ page }) => {
    const res = await page.goto('/calendar')
    expect(res?.status()).toBeLessThan(400)
    expect(page.url()).toContain('/calendar')
  })

  test('A-07: /proposal 직접 접근 가능', async ({ page }) => {
    const res = await page.goto('/proposal')
    expect(res?.status()).toBeLessThan(400)
    expect(page.url()).toContain('/proposal')
  })
})
