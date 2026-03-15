// tests/e2e/security/xss.spec.js
// XSS 취약점 테스트 - ErrorBoundary가 악의적 스크립트를 차단하는지 확인

import { test, expect } from '@playwright/test';
import { API_BASE } from '../fixtures/test-helpers.js';

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

test.describe('XSS 방어 테스트', () => {
    test.beforeEach(async ({ page }) => {
        // 모든 dialog (alert, confirm, prompt) 감지
        page.on('dialog', dialog => {
            throw new Error(`Unexpected dialog: ${dialog.type()} - ${dialog.message()}`);
        });

        // 먼저 페이지로 이동 (컨텍스트 설정)
        await page.goto('/html/post_list.html');

        // ErrorBoundary를 동적 import로 로드하여 window에 노출
        await page.evaluate(async () => {
            const module = await import('/js/utils/ErrorBoundary.js');
            window.ErrorBoundary = module.default;
        });
    });

    test('ErrorBoundary.showError()는 XSS 공격을 차단해야 함', async ({ page }) => {
        // ErrorBoundary.showError()를 악의적 스크립트와 함께 호출
        await page.evaluate(() => {
            const container = document.createElement('div');
            container.id = 'test-container';
            document.body.appendChild(container);

            // XSS 공격 시도
            const maliciousMessage = '<script>alert("XSS")</script><img src=x onerror=alert("XSS2")>';
            window.ErrorBoundary.showError(container, maliciousMessage);
        });

        // 1. 컨테이너에 에러 메시지가 표시되어야 함
        const errorMessage = await page.locator('#test-container .error-message').textContent();

        // 2. 스크립트 태그가 텍스트로 표시되어야 함 (실행되지 않음)
        expect(errorMessage).toBe('<script>alert("XSS")</script><img src=x onerror=alert("XSS2")>');

        // 3. 실제 script 요소가 생성되지 않았는지 확인
        const scriptTags = await page.locator('#test-container script').count();
        expect(scriptTags).toBe(0);

        // 4. img 요소가 생성되지 않았는지 확인
        const imgTags = await page.locator('#test-container img').count();
        expect(imgTags).toBe(0);

        // 5. alert가 실행되지 않았음 (beforeEach의 dialog 핸들러가 에러를 던지지 않음)
    });

    test('ErrorBoundary.showLoading()은 XSS 공격을 차단해야 함', async ({ page }) => {
        await page.evaluate(() => {
            const container = document.createElement('div');
            container.id = 'test-loading-container';
            document.body.appendChild(container);

            // XSS 공격 시도
            const maliciousMessage = '<script>alert("Loading XSS")</script>';
            window.ErrorBoundary.showLoading(container, maliciousMessage);
        });

        // 로딩 메시지가 텍스트로 표시되어야 함
        const loadingMessage = await page.locator('#test-loading-container .loading-message').textContent();
        expect(loadingMessage).toBe('<script>alert("Loading XSS")</script>');

        // script 태그가 실행되지 않았는지 확인
        const scriptTags = await page.locator('#test-loading-container script').count();
        expect(scriptTags).toBe(0);
    });

    test('백엔드 validation 에러가 XSS를 유발하지 않아야 함', async ({ page }) => {
        const XSS_PAYLOAD = '<script>alert("XSS")</script><img src=x onerror=alert("XSS2")>';

        await page.goto('/signup');

        // 백엔드 API를 인터셉트하여 XSS 페이로드가 포함된 에러 응답 반환
        await page.route(/\/v1\/users\/?$/, async (route) => {
            if (route.request().method() === 'POST') {
                await route.fulfill({
                    status: 400,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        detail: {
                            error: 'validation_error',
                            message: XSS_PAYLOAD,
                        },
                    }),
                });
            } else {
                await route.continue();
            }
        });

        // 프로필 이미지 업로드 (필수 필드)
        await page.setInputFiles('#profile-upload', {
            name: 'profile.jpg',
            mimeType: 'image/jpeg',
            buffer: DUMMY_PROFILE_IMAGE,
        });

        // 폼 입력
        await page.fill('#email', 'xss-test@example.com');
        await page.dispatchEvent('#email', 'input');
        await page.fill('#password', 'Test1234!@');
        await page.dispatchEvent('#password', 'input');
        await page.fill('#password-confirm', 'Test1234!@');
        await page.dispatchEvent('#password-confirm', 'input');
        await page.fill('#nickname', 'xsstest');
        await page.dispatchEvent('#nickname', 'input');

        // 이용약관 동의 체크
        await page.check('#terms-checkbox');

        // 가입 버튼 활성화 대기 후 클릭
        const signupBtn = page.locator('.signup-btn');
        await expect(signupBtn).toBeEnabled({ timeout: 10000 });
        await signupBtn.click();

        // 토스트에 에러 메시지가 표시될 때까지 대기
        const toast = page.locator('#toast.show');
        await expect(toast).toBeVisible({ timeout: 5000 });

        // 토스트에 XSS 페이로드가 텍스트로 표시됨 (실행되지 않음)
        await expect(toast).toContainText('<script>', { timeout: 3000 });

        // script 요소가 생성되지 않았는지 확인
        const scriptTags = await page.locator('script:has-text("alert")').count();
        expect(scriptTags).toBe(0);

        // img[onerror] 요소가 생성되지 않았는지 확인
        const maliciousImgs = await page.locator('img[src="x"]').count();
        expect(maliciousImgs).toBe(0);
    });

    test('다양한 XSS 벡터가 모두 차단되어야 함', async ({ page }) => {
        const xssVectors = [
            '<script>alert(1)</script>',
            '<img src=x onerror=alert(1)>',
            '<svg onload=alert(1)>',
            '<iframe src="javascript:alert(1)">',
            '<body onload=alert(1)>',
            '<input onfocus=alert(1) autofocus>',
            '<marquee onstart=alert(1)>',
            '<div onclick=alert(1)>Click</div>',
            'javascript:alert(1)',
            '<a href="javascript:alert(1)">link</a>',
        ];

        for (const xssPayload of xssVectors) {
            await page.evaluate((payload) => {
                const container = document.createElement('div');
                container.id = `xss-test-${Math.random()}`;
                document.body.appendChild(container);

                window.ErrorBoundary.showError(container, payload);
            }, xssPayload);
        }

        // XSS 페이로드가 실행되지 않았는지 확인 (alert 포함 스크립트만 검사)
        const xssScriptTags = await page.locator('script:has-text("alert")').count();
        const allImgTags = await page.locator('img[src="x"]').count();
        const allIframeTags = await page.locator('iframe[src^="javascript:"]').count();

        expect(xssScriptTags).toBe(0);
        expect(allImgTags).toBe(0);
        expect(allIframeTags).toBe(0);
    });

    test('재시도 버튼이 안전하게 생성되어야 함', async ({ page }) => {
        let retryClicked = false;

        await page.evaluate(() => {
            const container = document.createElement('div');
            container.id = 'retry-test-container';
            document.body.appendChild(container);

            const retryFn = () => {
                window.retryClicked = true;
            };

            window.ErrorBoundary.showError(
                container,
                '<script>alert("Retry XSS")</script>',
                retryFn
            );
        });

        // 재시도 버튼이 생성되었는지 확인
        const retryBtn = page.locator('#retry-test-container .error-retry-btn');
        await expect(retryBtn).toBeVisible();
        expect(await retryBtn.textContent()).toBe('다시 시도');

        // 버튼 클릭 시 콜백이 호출되는지 확인
        await retryBtn.click();
        retryClicked = await page.evaluate(() => window.retryClicked);
        expect(retryClicked).toBe(true);

        // 스크립트가 실행되지 않았는지 확인
        const scriptTags = await page.locator('#retry-test-container script').count();
        expect(scriptTags).toBe(0);
    });
});
