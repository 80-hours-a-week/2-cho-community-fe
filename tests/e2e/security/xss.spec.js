// tests/e2e/security/xss.spec.js
// XSS 취약점 테스트 - ErrorBoundary가 악의적 스크립트를 차단하는지 확인

import { test, expect } from '@playwright/test';

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

    // 통합 테스트 - 전체 회원가입 플로우가 필요하므로 별도로 실행
    test.skip('백엔드 validation 에러가 XSS를 유발하지 않아야 함', async ({ page }) => {
        // 실제 사용 시나리오: 백엔드에서 에러 메시지에 사용자 입력 포함
        await page.goto('/html/user_signup.html');

        // ErrorBoundary를 새 페이지에서 다시 로드
        await page.evaluate(async () => {
            const module = await import('/js/utils/ErrorBoundary.js');
            window.ErrorBoundary = module.default;
        });

        // 악의적 닉네임으로 회원가입 시도
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'ValidPass123!');
        await page.fill('input[name="password_confirm"]', 'ValidPass123!');
        await page.fill('input[name="nickname"]', '<script>alert("XSS")</script>');

        // 이용약관 동의
        await page.check('input#terms-agree');
        await page.check('input#privacy-agree');

        // 회원가입 버튼 클릭
        await page.click('button[type="submit"]');

        // 에러 메시지가 표시될 때까지 대기
        await page.waitForSelector('.toast.error, .error-message', { timeout: 5000 });

        // 에러 메시지에 스크립트가 텍스트로 표시되는지 확인
        const hasScriptText = await page.evaluate(() => {
            const errorElements = document.querySelectorAll('.toast.error, .error-message');
            for (const el of errorElements) {
                if (el.textContent.includes('<script>')) {
                    return true;
                }
            }
            return false;
        });

        // 스크립트 태그가 텍스트로 표시되었는지 확인
        if (hasScriptText) {
            // script 태그가 실행되지 않았는지 확인
            const scriptTags = await page.locator('script:has-text("alert")').count();
            expect(scriptTags).toBe(0);
        }
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

        // 모든 XSS 페이로드가 텍스트로만 표시되고 실행되지 않았는지 확인
        const allScriptTags = await page.locator('script:not([src])').count();
        const allImgTags = await page.locator('img[src="x"]').count();
        const allIframeTags = await page.locator('iframe[src^="javascript:"]').count();

        expect(allScriptTags).toBe(0);
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
