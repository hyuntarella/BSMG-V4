import { test, expect } from '@playwright/test';

test.describe('CRM 칸반보드', () => {
  test('칸반보드가 로드된다', async ({ page }) => {
    await page.goto('/crm');
    // 탭이 표시되는지 확인
    await expect(page.getByText('문의')).toBeVisible();
    await expect(page.getByText('영업')).toBeVisible();
    await expect(page.getByText('시공')).toBeVisible();
  });

  test('탭 전환이 동작한다', async ({ page }) => {
    await page.goto('/crm');
    await page.getByText('영업').click();
    // 영업 탭의 파이프라인 컬럼이 보이는지
    await expect(page.getByText('먼저연락X')).toBeVisible();
  });

  test('검색이 동작한다', async ({ page }) => {
    await page.goto('/crm');
    const searchInput = page.getByPlaceholder('주소, 고객명, 전화번호 검색');
    await expect(searchInput).toBeVisible();
    // 검색 입력 후 카드 필터링 확인 (데이터 의존적이므로 검색 input 존재만 확인)
    await searchInput.fill('테스트');
    // 입력이 반영되는지 확인
    await expect(searchInput).toHaveValue('테스트');
  });

  test('카드 클릭 시 상세 모달이 열린다', async ({ page }) => {
    await page.goto('/crm');
    // 첫 번째 카드 클릭 (카드가 있는 경우)
    const firstCard = page.locator('[data-testid="kanban-card"]').first();
    if (await firstCard.isVisible()) {
      await firstCard.click();
      // 모달이 열리는지 확인
      await expect(page.locator('[data-testid="detail-modal"]')).toBeVisible();
    }
  });
});
