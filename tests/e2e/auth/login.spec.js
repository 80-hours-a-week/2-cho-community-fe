// tests/e2e/auth/login.spec.js
// 로그인 E2E 테스트

import { test, expect } from '@playwright/test';
import { createTestUser, loginViaUI } from '../fixtures/test-helpers.js';

test.describe('로그인', () => {
  let testUser;

  test.beforeAll(async ({ request }) => {
    testUser = await createTestUser(request);
  });

  test('정상 로그인 시 메인 페이지로 이동', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/.*login/);

    // 이메일 입력
    await page.fill('#email', testUser.email);
    await page.dispatchEvent('#email', 'input');

    // 비밀번호 입력
    await page.fill('#password', testUser.password);
    await page.dispatchEvent('#password', 'input');

    // 버튼 활성화 대기 후 클릭
    const loginBtn = page.locator('.login-btn');
    await expect(loginBtn).toBeEnabled({ timeout: 10000 });
    await loginBtn.click();

    // 메인 페이지로 이동 확인
    await expect(page).toHaveURL(/.*main/, { timeout: 10000 });
  });

  test('잘못된 비밀번호 시 에러 메시지 표시', async ({ page }) => {
    await page.goto('/login');

    await page.fill('#email', testUser.email);
    await page.dispatchEvent('#email', 'input');

    await page.fill('#password', 'WrongPass1!@#');
    await page.dispatchEvent('#password', 'input');

    const loginBtn = page.locator('.login-btn');
    await expect(loginBtn).toBeEnabled({ timeout: 10000 });
    await loginBtn.click();

    // 에러 메시지 표시 확인 (password-helper 영역에 에러 텍스트)
    const passwordHelper = page.locator('#password-helper');
    await expect(passwordHelper).toBeVisible({ timeout: 10000 });
    await expect(passwordHelper).toContainText('확인해주세요');

    // 로그인 페이지에 머무름
    await expect(page).toHaveURL(/.*login/);
  });

  test('빈 필드 제출 시 페이지 유지', async ({ page }) => {
    await page.goto('/login');

    // 로그인 버튼이 비활성화 상태인지 확인
    const loginBtn = page.locator('.login-btn');
    await expect(loginBtn).toBeDisabled();

    // 빈 상태에서 폼 제출 시도 (Enter 키)
    await page.press('#email', 'Enter');

    // 로그인 페이지에 머무름
    await expect(page).toHaveURL(/.*login/);
  });

  test('로그아웃 시 로그인 페이지로 이동', async ({ page }) => {
    // 로그인
    await loginViaUI(page, testUser.email, testUser.password);
    await expect(page).toHaveURL(/.*main/, { timeout: 10000 });

    // 프로필 드롭다운 열기
    const profileBtn = page.locator('#header-profile');
    await expect(profileBtn).toBeVisible({ timeout: 10000 });
    await profileBtn.click();

    // 로그아웃 클릭
    const logoutMenu = page.locator('#menu-logout');
    await expect(logoutMenu).toBeVisible({ timeout: 5000 });
    await logoutMenu.click();

    // 로그인 페이지로 이동 확인
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });
});
