// tests/e2e/fixtures/test-helpers.js
// E2E 테스트 공통 헬퍼 함수
const API_BASE = 'http://127.0.0.1:8000';

/**
 * API로 테스트 사용자 생성
 * 기본적으로 이메일 인증까지 자동 처리 (overrides.verified = false로 비활성화 가능)
 */
export async function createTestUser(request, overrides = {}) {
  const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const email = overrides.email || `e2e_${suffix}@test.com`;
  const password = overrides.password || 'Test1234!@#$';
  const nickname = overrides.nickname || `e2e${suffix.slice(-8)}`;

  const res = await request.post(`${API_BASE}/v1/users/`, {
    multipart: { email, password, nickname },
  });

  let userId = null;
  try {
    const body = await res.json();
    userId = body?.data?.user_id;
  } catch {}

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
 * UI를 통해 로그인
 */
export async function loginViaUI(page, email, password) {
  await page.goto('/login');
  await page.fill('input[name="email"], #email', email);
  await page.fill('input[name="password"], #password', password);
  await page.click('button[type="submit"], #login-btn');
  await page.waitForURL('**/main', { timeout: 10000 });
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
 */
export async function loginAndNavigate(page, url, email, password) {
  await loginViaUI(page, email, password);
  if (url && url !== '/main') {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
  }
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
 * 테스트 API: DB 정리
 * @param {import('@playwright/test').APIRequestContext} request
 */
export async function cleanupDatabase(request) {
  const res = await request.post(`${API_BASE}/v1/test/cleanup`);
  return res;
}

export { API_BASE };
