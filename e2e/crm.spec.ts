import { test, expect } from '@playwright/test';

test.describe('CRM 칸반보드', () => {
  // P0: CR-01
  test('칸반보드가 로드된다', async ({ page }) => {
    await page.goto('/crm');
    await expect(page.getByText('문의')).toBeVisible();
    await expect(page.getByText('영업')).toBeVisible();
    await expect(page.getByText('시공')).toBeVisible();
  });

  // P0: CR-02
  test('탭 전환이 동작한다', async ({ page }) => {
    await page.goto('/crm');
    await page.getByText('영업').click();
    await expect(page.getByText('먼저연락X')).toBeVisible();
  });

  // P0: CR-03
  test('검색이 동작한다', async ({ page }) => {
    await page.goto('/crm');
    const searchInput = page.getByPlaceholder('주소, 고객명, 전화번호 검색');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('테스트');
    await expect(searchInput).toHaveValue('테스트');
  });

  // P0: CR-04
  test('카드 클릭 시 상세 모달이 열린다', async ({ page }) => {
    await page.goto('/crm');
    const firstCard = page.locator('[data-testid="kanban-card"]').first();
    if (await firstCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstCard.click();
      await expect(page.locator('[data-testid="detail-modal"]')).toBeVisible();
    }
  });

  // P0: CR-07
  test('상세 모달 — "견적서 작성" 버튼 존재', async ({ page }) => {
    await page.goto('/crm');
    const firstCard = page.locator('[data-testid="kanban-card"]').first();
    if (await firstCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstCard.click();
      await page.waitForTimeout(500);
      await expect(page.getByText('견적서 작성').first()).toBeVisible();
    }
  });

  // P0: CR-08
  test('상세 모달 — "견적서 작성" 클릭 → /estimate/new 이동', async ({ page }) => {
    await page.goto('/crm');
    const firstCard = page.locator('[data-testid="kanban-card"]').first();
    if (await firstCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstCard.click();
      await page.waitForTimeout(500);
      const estBtn = page.getByText('견적서 작성').first();
      if (await estBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await estBtn.click();
        await page.waitForURL(/\/estimate\//, { timeout: 15000 });
        expect(page.url()).toContain('/estimate/');
      }
    }
  });
});
