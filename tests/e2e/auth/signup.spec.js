// tests/e2e/auth/signup.spec.js
// 회원가입 E2E 테스트

import { test, expect } from '@playwright/test';
import { createTestUser } from '../fixtures/test-helpers.js';

// 1x1 JPEG 최소 이미지 (프로필 업로드 필수)
const DUMMY_PROFILE_IMAGE = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof' +
  'Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwh' +
  'MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAAR' +
  'CAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgED' +
  'AwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGR' +
  'olJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKT' +
  'lJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8v' +
  'P09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBA' +
  'QAAAJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygp' +
  'KjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJ' +
  'maoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6' +
  '/9oADAMBAAIRAxEAPwD3+iiigD//2Q==',
  'base64'
);

/**
 * 회원가입 폼 입력 헬퍼
 * 프로필 업로드 + 이메일/비밀번호/비밀번호확인/닉네임 입력
 */
async function fillSignupForm(page, { email, password, passwordConfirm, nickname }) {
  // 프로필 이미지 업로드 (필수 필드)
  await page.setInputFiles('#profile-upload', {
    name: 'profile.jpg',
    mimeType: 'image/jpeg',
    buffer: DUMMY_PROFILE_IMAGE,
  });

  if (email) {
    await page.fill('#email', email);
    await page.dispatchEvent('#email', 'input');
  }
  if (password) {
    await page.fill('#password', password);
    await page.dispatchEvent('#password', 'input');
  }
  if (passwordConfirm) {
    await page.fill('#password-confirm', passwordConfirm);
    await page.dispatchEvent('#password-confirm', 'input');
  }
  if (nickname) {
    await page.fill('#nickname', nickname);
    await page.dispatchEvent('#nickname', 'input');
  }
}

test.describe('회원가입', () => {
  test('정상 가입 후 로그인 페이지로 이동', async ({ page }) => {
    const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    await page.goto('/signup');
    await expect(page).toHaveURL(/.*signup/);

    await fillSignupForm(page, {
      email: `e2e_signup_${suffix}@test.com`,
      password: 'Test1234!@#$',
      passwordConfirm: 'Test1234!@#$',
      nickname: `su${suffix.slice(-8)}`,
    });

    // 가입 버튼 활성화 대기 후 클릭
    const signupBtn = page.locator('.signup-btn');
    await expect(signupBtn).toBeEnabled({ timeout: 10000 });
    await signupBtn.click();

    // 로그인 페이지로 이동 확인
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });

  test('중복 이메일 시 에러 표시', async ({ page, request }) => {
    // API로 사용자 생성
    const existing = await createTestUser(request);

    await page.goto('/signup');

    await fillSignupForm(page, {
      email: existing.email,
      password: 'Test1234!@#$',
      passwordConfirm: 'Test1234!@#$',
      nickname: `dup${Date.now().toString(36).slice(-6)}`,
    });

    const signupBtn = page.locator('.signup-btn');
    await expect(signupBtn).toBeEnabled({ timeout: 10000 });
    await signupBtn.click();

    // 이메일 중복 에러 메시지 확인
    const emailHelper = page.locator('#email-helper');
    await expect(emailHelper).toBeVisible({ timeout: 10000 });
    await expect(emailHelper).toContainText('중복된 이메일');
  });

  test('짧은 비밀번호 시 유효성 검증', async ({ page }) => {
    await page.goto('/signup');

    // 비밀번호 규칙 미달 입력 (8자 미만)
    await page.fill('#password', 'Ab1!');
    await page.dispatchEvent('#password', 'input');

    // 비밀번호 에러 메시지 확인
    const passwordHelper = page.locator('#password-helper');
    await expect(passwordHelper).toBeVisible({ timeout: 5000 });
    await expect(passwordHelper).toContainText('8자 이상');

    // 가입 버튼 비활성화 상태 유지
    const signupBtn = page.locator('.signup-btn');
    await expect(signupBtn).toBeDisabled();
  });

  test('필수 필드 미입력 시 제출 차단', async ({ page }) => {
    await page.goto('/signup');

    // 아무것도 입력하지 않은 상태
    const signupBtn = page.locator('.signup-btn');
    await expect(signupBtn).toBeDisabled();

    // Enter 키로 제출 시도
    await page.press('#email', 'Enter');

    // 가입 페이지에 머무름
    await expect(page).toHaveURL(/.*signup/);
  });
});
