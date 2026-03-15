// tests/e2e/fixtures/test-helpers.js
// E2E 테스트 공통 헬퍼 함수
import { expect } from '@playwright/test';

const API_BASE = 'http://127.0.0.1:8000';

/**
 * API로 테스트 사용자 생성
 * 기본적으로 이메일 인증까지 자동 처리 (overrides.verified = false로 비활성화 가능)
 */
export async function createTestUser(request, overrides = {}) {
  const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const email = overrides.email || `e2e_${suffix}@test.com`;
  const password = overrides.password || 'Test1234!@';
  const nickname = overrides.nickname || `e2e${suffix.slice(-7)}`;

  const res = await request.post(`${API_BASE}/v1/users/`, {
    multipart: { email, password, nickname, terms_agreed: 'true' },
  });

  let userId = null;
  try {
    const body = await res.json();
    userId = body?.data?.user_id;
  } catch {}

  // 회원가입 응답에 user_id가 없으면 테스트 API로 조회
  if (!userId && res.status() < 400) {
    const findRes = await request.post(`${API_BASE}/v1/test/users/find`, {
      data: { email },
    });
    try {
      const findBody = await findRes.json();
      userId = findBody?.data?.user_id;
    } catch {}
  }

  // 이메일 인증 자동 처리 (기본 true)
  if (userId && overrides.verified !== false) {
    await verifyEmail(request, userId);
  }

  return { email, password, nickname, userId, statusCode: res.status() };
}

/**
 * API로 로그인하여 토큰 반환
 */
export async function loginViaApi(request, email, password) {
  const res = await request.post(`${API_BASE}/v1/auth/session`, {
    data: { email, password },
  });
  const body = await res.json();
  return {
    accessToken: body?.data?.access_token,
    headers: { Authorization: `Bearer ${body?.data?.access_token}` },
  };
}

/**
 * 페이지에 인증 라우트 인터셉터 설정
 * page.route()는 페이지 내 모든 fetch/XHR 요청에 Authorization 헤더를 주입하며,
 * page.goto()로 다른 페이지로 이동해도 인터셉터가 유지됨
 */
async function setupAuthRoute(page, accessToken) {
  await page.route(`${API_BASE}/**`, async (route) => {
    const headers = {
      ...route.request().headers(),
      'authorization': `Bearer ${accessToken}`,
    };
    await route.continue({ headers });
  });
}

/**
 * UI를 통해 로그인 (브라우저 로그인 플로우)
 * _accessToken이 정상적으로 설정되므로 getAccessToken() 기반 UI 렌더링이 동작함
 * /main에서 추가 페이지 이동이 필요한 경우 loginAndNavigate 사용 권장
 */
export async function loginViaUI(page, email, password) {
  await page.goto('/login');

  // 입력 필드가 준비될 때까지 대기
  const emailInput = page.locator('input[name="email"], #email');
  const passwordInput = page.locator('input[name="password"], #password');
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });

  await emailInput.fill(email);
  await passwordInput.fill(password);

  // 버튼이 활성화될 때까지 대기 (JS input 핸들러가 반응해야 함)
  const submitBtn = page.locator('button[type="submit"], #login-btn');
  await expect(submitBtn).toBeEnabled({ timeout: 10000 });

  await submitBtn.click();
  await page.waitForURL('**/main', { timeout: 15000 });
}

/**
 * API로 게시글 생성
 */
export async function createTestPost(request, headers, overrides = {}) {
  const title = overrides.title || `E2E 게시글 ${Date.now()}`;
  const res = await request.post(`${API_BASE}/v1/posts/`, {
    headers,
    data: {
      title,
      content: overrides.content || '테스트 본문입니다.',
      category_id: overrides.categoryId || 1,
    },
  });
  const body = await res.json();
  return { postId: body?.data?.post_id, title };
}

/**
 * 로그인 후 특정 페이지로 이동
 * API 로그인 + 라우트 인터셉터로 대상 페이지에 직접 이동 (중간 /main 경유 없음)
 */
export async function loginAndNavigate(page, url, email, password) {
  // API 로그인
  const res = await page.request.post(`${API_BASE}/v1/auth/session`, {
    data: { email, password },
  });
  const body = await res.json();
  const accessToken = body?.data?.access_token;

  if (!accessToken) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(body)}`);
  }

  await setupAuthRoute(page, accessToken);

  // 대상 페이지로 직접 이동
  await page.goto(url || '/main');
  await page.waitForLoadState('networkidle');
}

/**
 * 테스트 API: 이메일 인증 바이패스
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {number} userId
 */
export async function verifyEmail(request, userId) {
  const res = await request.post(`${API_BASE}/v1/test/users/verify-email`, {
    data: { user_id: userId },
  });
  return res;
}

/**
 * 테스트 API: 관리자 역할 부여
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {number} userId
 */
export async function setAdminRole(request, userId) {
  const res = await request.post(`${API_BASE}/v1/test/users/set-role`, {
    data: { user_id: userId, role: 'admin' },
  });
  return res;
}

/**
 * 테스트 API: 사용자 정지
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {number} userId
 * @param {number} days
 * @param {string} reason
 */
export async function suspendUser(request, userId, days = 7, reason = '테스트 정지') {
  const res = await request.post(`${API_BASE}/v1/test/users/suspend`, {
    data: { user_id: userId, duration_days: days, reason },
  });
  return res;
}

/**
 * 테스트 API: 사용자 정지 해제
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {number} userId
 */
export async function unsuspendUser(request, userId) {
  const res = await request.delete(`${API_BASE}/v1/test/users/suspend`, {
    data: { user_id: userId },
  });
  return res;
}

/**
 * 테스트 API: DB 정리
 * @param {import('@playwright/test').APIRequestContext} request
 */
export async function cleanupDatabase(request) {
  const res = await request.post(`${API_BASE}/v1/test/cleanup`);
  return res;
}

export { API_BASE };
