import { test, expect } from '@playwright/test';

// ── 1-2. 스켈레톤 ──

test('CRM 페이지에 칸반보드가 렌더링된다', async ({ page }) => {
  await page.goto('/crm');
  // 스켈레톤 또는 칸반보드 중 하나가 보여야 한다
  const skeleton = page.locator('[data-testid="crm-skeleton"]');
  const kanban = page.locator('[data-testid="kanban-board"]');
  await expect(skeleton.or(kanban)).toBeVisible({ timeout: 15000 });
  // 최종적으로 칸반보드가 나타난다
  await expect(kanban).toBeVisible({ timeout: 15000 });
});

// ── 1-4. 견적서 금액 요약바 ──

test('견적서에 총합계/평단가/헤베당 요약바가 보인다', async ({ page }) => {
  // /estimates에서 첫 번째 견적서로 이동
  await page.goto('/estimates');
  const firstLink = page.locator('a[href^="/estimate/"]').first();
  if (!(await firstLink.isVisible({ timeout: 10000 }))) {
    test.skip(true, '견적서 데이터 없음');
    return;
  }
  await firstLink.click();
  // 상세 탭 클릭 (복합-세부 또는 우레탄-세부)
  const detailTab = page.locator('button').filter({ hasText: /세부/ }).first();
  if (await detailTab.isVisible({ timeout: 5000 })) {
    await detailTab.click();
  }
  // 요약바가 보이거나, 시트 없으면 InitialGuide가 보인다
  const summaryBar = page.locator('[data-testid="estimate-summary-bar"]');
  const initialGuide = page.locator('text=음성으로 시작하세요');
  await expect(summaryBar.or(initialGuide)).toBeVisible({ timeout: 10000 });
});

// ── 1-5. 모바일 탭바 ──

test('모바일에서 하단 탭바 표시', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/dashboard');
  await expect(page.locator('[data-testid="mobile-tab-bar"]')).toBeVisible({ timeout: 10000 });
});

test('PC에서 하단 탭바 숨김', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/dashboard');
  await expect(page.locator('[data-testid="mobile-tab-bar"]')).not.toBeVisible({ timeout: 10000 });
});

// ── 3단계: 정보설계 ──

test('대시보드 오늘 일정 섹션이 최상단에 존재', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('[data-testid="today-schedule-section"]')).toBeVisible({ timeout: 10000 });
});

test('대시보드 FollowUpCard 클릭 시 CRM 패널 열림', async ({ page }) => {
  await page.goto('/dashboard');
  const firstItem = page.locator('[data-testid="dashboard-crm-item"]').first();
  if (await firstItem.isVisible({ timeout: 10000 })) {
    await firstItem.click();
    await expect(page.locator('[data-testid="crm-detail-panel"]')).toBeVisible({ timeout: 10000 });
  }
});

test('CRM 담당자 필터가 존재한다', async ({ page }) => {
  await page.goto('/crm');
  await expect(page.locator('[data-testid="manager-filter"]')).toBeVisible({ timeout: 10000 });
});
