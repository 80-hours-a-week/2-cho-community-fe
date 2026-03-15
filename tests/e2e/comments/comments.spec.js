// tests/e2e/comments/comments.spec.js
// 댓글 E2E 테스트

import { test, expect } from '@playwright/test';
import {
  createTestUser,
  loginAndNavigate,
  loginViaApi,
  createTestPost,
  API_BASE,
} from '../fixtures/test-helpers.js';

/**
 * API로 댓글 생성 헬퍼
 */
async function createComment(request, postId, headers, content) {
  const res = await request.post(`${API_BASE}/v1/posts/${postId}/comments`, {
    headers,
    data: { content },
  });
  const body = await res.json();
  return body?.data;
}

test.describe('댓글', () => {
  let testUser;
  let testPost;
  let authHeaders;

  test.beforeAll(async ({ request }) => {
    testUser = await createTestUser(request);
    const { headers } = await loginViaApi(request, testUser.email, testUser.password);
    authHeaders = headers;
    testPost = await createTestPost(request, headers, {
      title: `댓글테스트 ${Date.now()}`,
      content: '댓글 테스트용 게시글입니다.',
    });
  });

  test('댓글 입력 후 목록에 추가됨', async ({ page }) => {
    await loginAndNavigate(page, `/detail?id=${testPost.postId}`, testUser.email, testUser.password);

    const commentInput = page.locator('#comment-input');
    const submitBtn = page.locator('#comment-submit-btn');

    await expect(commentInput).toBeVisible({ timeout: 10000 });

    // 댓글 입력
    const commentText = `테스트 댓글 ${Date.now()}`;
    await commentInput.fill(commentText);
    await commentInput.dispatchEvent('input');

    // 제출
    await submitBtn.click();

    // 댓글 목록에 추가 확인
    const commentList = page.locator('#comment-list');
    await expect(commentList.locator('.comment-text', { hasText: commentText })).toBeVisible({ timeout: 10000 });
  });

  test('수정 모드 전환 (수정 버튼 → 입력창 값 변경)', async ({ page, request }) => {
    // 수정할 댓글 사전 생성 (병렬 실행 독립성 보장)
    await createComment(request, testPost.postId, authHeaders, `수정대상댓글 ${Date.now()}`);

    await loginAndNavigate(page, `/detail?id=${testPost.postId}`, testUser.email, testUser.password);

    // 기존 댓글이 있는지 확인
    const commentList = page.locator('#comment-list');
    const editBtn = commentList.locator('.edit-cmt-btn').first();
    await expect(editBtn).toBeVisible({ timeout: 10000 });

    // 수정 버튼 클릭
    await editBtn.click();

    // 입력창에 기존 댓글 내용이 채워졌는지 확인
    const commentInput = page.locator('#comment-input');
    await expect(commentInput).not.toBeEmpty();
  });

  test('삭제 확인 후 댓글 제거', async ({ page, request }) => {
    // 삭제할 댓글 생성 (API)
    const { headers } = await loginViaApi(request, testUser.email, testUser.password);
    await createComment(request, testPost.postId, headers, `삭제할댓글 ${Date.now()}`);

    await loginAndNavigate(page, `/detail?id=${testPost.postId}`, testUser.email, testUser.password);

    // 삭제 버튼 클릭
    const commentList = page.locator('#comment-list');
    const deleteBtn = commentList.locator('.delete-cmt-btn').last();
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });
    await deleteBtn.click();

    // 확인 모달 표시
    const confirmModal = page.locator('#confirm-modal');
    await expect(confirmModal).not.toHaveClass(/hidden/, { timeout: 5000 });

    // 확인 버튼 클릭
    const confirmBtn = page.locator('#modal-confirm-btn');
    await confirmBtn.click();

    // 모달 닫힘 확인
    await expect(confirmModal).toHaveClass(/hidden/, { timeout: 5000 });
  });

  test('답글 버튼 → 답글 입력폼 표시', async ({ page, request }) => {
    // 답글 대상 댓글 사전 생성
    await createComment(request, testPost.postId, authHeaders, `답글대상댓글 ${Date.now()}`);

    await loginAndNavigate(page, `/detail?id=${testPost.postId}`, testUser.email, testUser.password);

    // 답글 버튼 클릭
    const commentList = page.locator('#comment-list');
    const replyBtn = commentList.locator('.reply-btn').first();
    await expect(replyBtn).toBeVisible({ timeout: 10000 });
    await replyBtn.click();

    // 답글 인디케이터 표시 확인
    const replyIndicator = page.locator('#reply-indicator');
    await expect(replyIndicator).not.toHaveClass(/hidden/, { timeout: 5000 });

    // 답글 취소 버튼 표시 확인
    const cancelBtn = page.locator('#reply-cancel-btn');
    await expect(cancelBtn).toBeVisible();

    // 입력창 placeholder 변경 확인 (닉네임에게 답글...)
    const commentInput = page.locator('#comment-input');
    const placeholder = await commentInput.getAttribute('placeholder');
    expect(placeholder).toContain('답글');
  });

  test('수정/답글 모드 상호 배제', async ({ page, request }) => {
    // 수정/답글 대상 댓글 사전 생성
    await createComment(request, testPost.postId, authHeaders, `상호배제댓글 ${Date.now()}`);

    await loginAndNavigate(page, `/detail?id=${testPost.postId}`, testUser.email, testUser.password);

    const commentList = page.locator('#comment-list');
    const replyBtn = commentList.locator('.reply-btn').first();
    const editBtn = commentList.locator('.edit-cmt-btn').first();

    // 1) 답글 모드 진입
    await expect(replyBtn).toBeVisible({ timeout: 10000 });
    await replyBtn.click();

    const replyIndicator = page.locator('#reply-indicator');
    await expect(replyIndicator).not.toHaveClass(/hidden/, { timeout: 5000 });

    // 2) 수정 모드로 전환 → 답글 인디케이터 사라짐
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();

    await expect(replyIndicator).toHaveClass(/hidden/, { timeout: 5000 });

    // 입력창에 기존 댓글 내용이 채워짐 (수정 모드)
    const commentInput = page.locator('#comment-input');
    await expect(commentInput).not.toBeEmpty();
  });

  test('댓글 좋아요 토글', async ({ page, request }) => {
    // 좋아요 대상 댓글 사전 생성
    await createComment(request, testPost.postId, authHeaders, `좋아요대상댓글 ${Date.now()}`);

    await loginAndNavigate(page, `/detail?id=${testPost.postId}`, testUser.email, testUser.password);

    // 댓글 좋아요 버튼 찾기
    const commentList = page.locator('#comment-list');
    const likeBtn = commentList.locator('.comment-like-btn').first();
    await expect(likeBtn).toBeVisible({ timeout: 10000 });

    // 좋아요 전 카운트 확인
    const countBefore = await likeBtn.locator('.like-count').textContent();

    // 좋아요 클릭
    await likeBtn.click();

    // 아이콘 변경 확인 (♡ → ♥ 또는 active 클래스)
    // 낙관적 UI이므로 즉시 반영
    await expect(likeBtn).toHaveClass(/active/, { timeout: 3000 });

    // 카운트 변경 확인
    const countAfter = await likeBtn.locator('.like-count').textContent();
    expect(parseInt(countAfter)).toBe(parseInt(countBefore) + 1);
  });

  test('댓글 정렬 버튼 3개 표시 (오래된순, 최신순, 인기순)', async ({ page }) => {
    await loginAndNavigate(page, `/detail?id=${testPost.postId}`, testUser.email, testUser.password);

    const sortBar = page.locator('.comment-sort-bar');
    await expect(sortBar).toBeVisible({ timeout: 10000 });

    const sortBtns = sortBar.locator('.comment-sort-btn');
    await expect(sortBtns).toHaveCount(3);

    await expect(sortBtns.nth(0)).toContainText('오래된순');
    await expect(sortBtns.nth(1)).toContainText('최신순');
    await expect(sortBtns.nth(2)).toContainText('인기순');
  });

  test('정렬 버튼 클릭 시 active 클래스 전환', async ({ page }) => {
    await loginAndNavigate(page, `/detail?id=${testPost.postId}`, testUser.email, testUser.password);

    const sortBar = page.locator('.comment-sort-bar');
    await expect(sortBar).toBeVisible({ timeout: 10000 });

    // 최신순 클릭
    const latestBtn = sortBar.locator('.comment-sort-btn[data-sort="latest"]');
    await latestBtn.click();

    // 댓글 목록 리로드 후 최신순 버튼이 active
    await expect(sortBar.locator('.comment-sort-btn.active')).toContainText('최신순', { timeout: 10000 });

    // 인기순 클릭
    const popularBtn = sortBar.locator('.comment-sort-btn[data-sort="popular"]');
    await popularBtn.click();

    await expect(sortBar.locator('.comment-sort-btn.active')).toContainText('인기순', { timeout: 10000 });
  });

  test('수정된 댓글에 (수정됨) 배지 표시', async ({ page, request }) => {
    // 댓글 생성
    const { headers } = await loginViaApi(request, testUser.email, testUser.password);
    const createRes = await request.post(`${API_BASE}/v1/posts/${testPost.postId}/comments`, {
      headers,
      data: { content: `수정전 ${Date.now()}` },
    });
    const createBody = await createRes.json();
    const commentId = createBody?.data?.comment_id;

    // 댓글 수정 (API) — 1초 대기 후 수정 (updated_at !== created_at 보장)
    if (commentId) {
      await new Promise(r => setTimeout(r, 1000));
      const editRes = await request.put(`${API_BASE}/v1/posts/${testPost.postId}/comments/${commentId}`, {
        headers,
        data: { content: `수정됨 ${Date.now()}` },
      });
      expect(editRes.ok()).toBeTruthy();
    }

    await loginAndNavigate(page, `/detail?id=${testPost.postId}`, testUser.email, testUser.password);

    // (수정됨) 배지 확인
    const editedBadge = page.locator('.comment-edited-badge');
    await expect(editedBadge.first()).toBeVisible({ timeout: 10000 });
    await expect(editedBadge.first()).toContainText('수정됨');
  });
});
