// tests/e2e/admin/reports.spec.js
// 관리자 신고 관리 E2E 테스트

import { test, expect } from '@playwright/test';
import { createTestUser, loginViaUI, setAdminRole } from '../fixtures/test-helpers.js';

test.describe('관리자 - 신고 관리', () => {
  test('비관리자 접근 시 메인 페이지로 리다이렉트', async ({ page, request }) => {
    const normalUser = await createTestUser(request);
    await loginViaUI(page, normalUser.email, normalUser.password);

    // 관리자 페이지 접근 시도
    await page.goto('/admin/reports');

    // 메인 페이지로 리다이렉트 확인
    await expect(page).toHaveURL(/.*main/, { timeout: 10000 });
  });

  test('신고 목록 렌더링 (관리자)', async ({ page, request }) => {
    const admin = await createTestUser(request);
    await setAdminRole(request, admin.userId);
    await loginViaUI(page, admin.email, admin.password);

    await page.goto('/admin/reports');

    // 필터 탭 확인
    const tabs = page.locator('#report-filter-tabs .report-filter-tab');
    await expect(tabs).toHaveCount(3);
    await expect(tabs.nth(0)).toContainText('대기중');
    await expect(tabs.nth(1)).toContainText('처리완료');
    await expect(tabs.nth(2)).toContainText('기각');

    // 신고 목록 영역 확인
    const reportList = page.locator('#report-list');
    await expect(reportList).toBeVisible();
  });

  test('신고 처리/기각 모달 동작 (관리자)', async ({ page, request }) => {
    const admin = await createTestUser(request);
    await setAdminRole(request, admin.userId);
    await loginViaUI(page, admin.email, admin.password);

    await page.goto('/admin/reports');

    // 처리 확인 모달의 DOM 요소 존재 확인
    const confirmModal = page.locator('#confirm-modal');
    await expect(confirmModal).toHaveClass(/hidden/);

    // 정지 옵션 영역 확인
    const suspendOption = page.locator('#suspend-option');
    await expect(suspendOption).toHaveClass(/hidden/);

    // 모달 버튼 확인
    await expect(page.locator('#modal-cancel-btn')).toBeVisible();
    await expect(page.locator('#modal-confirm-btn')).toBeVisible();
  });
});
