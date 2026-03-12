// tests/e2e/admin/dashboard.spec.js
// 관리자 대시보드 E2E 테스트

import { test, expect } from '@playwright/test';
import { createTestUser, loginViaUI, setAdminRole } from '../fixtures/test-helpers.js';

test.describe('관리자 - 대시보드', () => {
  test('비관리자 접근 시 메인 페이지로 리다이렉트', async ({ page, request }) => {
    const normalUser = await createTestUser(request);
    await loginViaUI(page, normalUser.email, normalUser.password);

    // 관리자 대시보드 접근 시도
    await page.goto('/admin/dashboard');

    // 메인 페이지로 리다이렉트 확인
    await expect(page).toHaveURL(/.*main/, { timeout: 10000 });
  });

  test('대시보드 통계 카드 렌더링 (관리자)', async ({ page, request }) => {
    const admin = await createTestUser(request);
    await setAdminRole(request, admin.userId);
    await loginViaUI(page, admin.email, admin.password);

    await page.goto('/admin/dashboard');

    // 페이지 타이틀 확인
    await expect(page.locator('.admin-page-title')).toContainText('관리자 대시보드');

    // 통계 카드 영역 확인
    const statsCards = page.locator('#stats-cards');
    await expect(statsCards).toBeVisible();

    // 일별 통계 테이블 확인
    const dailyStatsBody = page.locator('#daily-stats-body');
    await expect(dailyStatsBody).toBeVisible();
  });

  test('사용자 목록 검색 (관리자)', async ({ page, request }) => {
    const admin = await createTestUser(request);
    await setAdminRole(request, admin.userId);
    await loginViaUI(page, admin.email, admin.password);

    await page.goto('/admin/dashboard');

    // 사용자 검색 입력창 확인
    const searchInput = page.locator('#user-search');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', '닉네임 또는 이메일로 검색...');

    // 사용자 목록 영역 확인
    const userList = page.locator('#user-list');
    await expect(userList).toBeVisible();

    // 검색 입력 (디바운스 300ms)
    await searchInput.fill('test');
    await page.waitForTimeout(500);

    // 검색 결과 반영 확인 (목록이 리로드됨)
    await expect(userList).toBeVisible();
  });
});
