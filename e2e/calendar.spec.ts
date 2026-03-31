import { test, expect } from '@playwright/test'

// 전제: TEST_MODE=true 환경에서 실행 (middleware 인증 우회)

test.describe('캘린더', () => {
  test('캘린더 페이지 로드', async ({ page }) => {
    await page.goto('/calendar')

    // 월간 그리드 표시 (요일 헤더 확인)
    await expect(page.getByText('일').first()).toBeVisible()
    await expect(page.getByText('월').first()).toBeVisible()
    await expect(page.getByText('화').first()).toBeVisible()
  })

  test('뷰 전환 — 주간', async ({ page }) => {
    await page.goto('/calendar')

    // 주간 탭 클릭
    await page.getByText('주간').click()

    // 시간 그리드 표시 (시간 라벨 확인)
    await expect(page.getByText('08:00').first()).toBeVisible()
  })

  test('뷰 전환 — 일간', async ({ page }) => {
    await page.goto('/calendar')

    // 일간 탭 클릭
    await page.getByText('일간').click()

    // 시간 그리드 표시
    await expect(page.getByText('08:00').first()).toBeVisible()
  })

  test('뷰 전환 — 월간 복귀', async ({ page }) => {
    await page.goto('/calendar')

    // 주간으로 전환 후 다시 월간으로
    await page.getByText('주간').click()
    await page.getByText('월간').click()

    // 요일 헤더 다시 표시
    await expect(page.getByText('일').first()).toBeVisible()
    await expect(page.getByText('토').first()).toBeVisible()
  })

  test('이벤트 생성 모달 열기/닫기', async ({ page }) => {
    await page.goto('/calendar')

    // + 새 일정 버튼 클릭
    await page.getByText('새 일정').click()

    // 모달이 열림
    await expect(page.getByText('새 일정').last()).toBeVisible()

    // 취소 버튼으로 닫기
    await page.getByText('취소').click()

    // 모달이 닫힘 — 폼 필드가 사라짐
    await expect(page.getByPlaceholder('일정 제목')).not.toBeVisible()
  })

  test('이벤트 생성 모달 — 제목 입력', async ({ page }) => {
    await page.goto('/calendar')

    // 모달 열기
    await page.getByText('새 일정').click()

    // 제목 입력
    await page.getByPlaceholder('일정 제목').fill('테스트 일정')
    await expect(page.getByPlaceholder('일정 제목')).toHaveValue('테스트 일정')

    // 취소
    await page.getByText('취소').click()
  })

  test('설정 모달 열기/닫기', async ({ page }) => {
    await page.goto('/calendar')

    // 설정 버튼 클릭 (기어 아이콘)
    await page.locator('[aria-label="설정"]').click()

    // 설정 모달 표시
    await expect(page.getByText('캘린더 설정')).toBeVisible()

    // 팀원 관리 탭이 기본 표시
    await expect(page.getByText('팀원 관리')).toBeVisible()

    // 닫기 버튼
    await page.getByText('닫기').click()
    await expect(page.getByText('캘린더 설정')).not.toBeVisible()
  })
})
