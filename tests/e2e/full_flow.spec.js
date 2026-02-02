// @ts-check
const { test, expect } = require('@playwright/test');

// 랜덤 닉네임 생성
const randomSuffix = Math.floor(Math.random() * 10000);
const TEST_USER = {
  email: `e2e_user_${randomSuffix}@test.com`,
  password: 'Password123!',
  nickname: `e2e_${randomSuffix}`,
  newNickname: `new_${randomSuffix}`
};

const TEST_POST = {
  title: `E2E Test Post ${randomSuffix}`,
  content: 'This is an automated E2E test post content.',
  updatedContent: 'This content has been updated by E2E test.',
};

const TEST_COMMENT = 'This is an E2E test comment.';

test('Full User Journey', async ({ page }) => {
  test.setTimeout(120000); 

  // ------------------------------------------------
  // E2E-01: Sign up and Login
  // ------------------------------------------------
  console.log('Step 1: Sign up and Login');
  
  await page.goto('/signup');
  await expect(page).toHaveURL(/.*signup/);

  // 프로필 이미지 업로드
  const dummyImageBuffer = Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9sAQwAFAAAFAAAFAAAFAAAFAAAFAAAFAAAFAAAFAAAFAAAFAAAFAAAFAAAFAAAFAAAFAAAFAAAFAAAFAAAFAAAFAAAA/9oADAMBAAIRAxEAPwD3+iiigD//2Q==', 'base64');
  
  await page.setInputFiles('#profile-upload', {
      name: 'profile.jpg',
      mimeType: 'image/jpeg',
      buffer: dummyImageBuffer
  });

  await page.fill('#email', TEST_USER.email);
  await page.dispatchEvent('#email', 'input');
  
  await page.fill('#password', TEST_USER.password);
  await page.dispatchEvent('#password', 'input');
  
  await page.fill('#password-confirm', TEST_USER.password);
  await page.dispatchEvent('#password-confirm', 'input');
  
  await page.fill('#nickname', TEST_USER.nickname);
  await page.dispatchEvent('#nickname', 'input');
  
  const signupBtn = page.locator('.signup-btn');
  await expect(signupBtn).toBeEnabled({ timeout: 10000 });
  await signupBtn.click();

  await expect(page).toHaveURL(/.*login/);

  await page.fill('#email', TEST_USER.email);
  await page.dispatchEvent('#email', 'input');
  
  await page.fill('#password', TEST_USER.password);
  await page.dispatchEvent('#password', 'input');
  
  const loginBtn = page.locator('.login-btn');
  await expect(loginBtn).toBeEnabled({ timeout: 10000 });
  await loginBtn.click();

  await expect(page).toHaveURL(/.*main/);
  await expect(page.locator('#header-profile')).toBeVisible();


  // ------------------------------------------------
  // E2E-02: Create Post
  // ------------------------------------------------
  console.log('Step 2: Create Post');

  await page.click('#write-btn');
  await expect(page).toHaveURL(/.*write/);

  await page.fill('#post-title', TEST_POST.title);
  await page.dispatchEvent('#post-title', 'input');

  await page.fill('#post-content', TEST_POST.content);
  await page.dispatchEvent('#post-content', 'input');
  
  const submitBtn = page.locator('#submit-btn');
  await expect(submitBtn).toBeEnabled({ timeout: 10000 });
  await submitBtn.click();

  await expect(page).toHaveURL(/.*main/);
  
  await page.waitForSelector('.post-card');
  const firstPost = page.locator('.post-card').first();
  await expect(firstPost.locator('.post-title')).toHaveText(TEST_POST.title);
  
  await firstPost.click();
  await expect(page).toHaveURL(/.*detail/);
  
  await expect(page.locator('#post-title')).toHaveText(TEST_POST.title);
  await expect(page.locator('#post-content')).toHaveText(TEST_POST.content);
  await expect(page.locator('#post-author-nickname')).toContainText(TEST_USER.nickname);


  // ------------------------------------------------
  // E2E-03: Write Comment
  // ------------------------------------------------
  console.log('Step 3: Write Comment');

  await page.fill('#comment-input', TEST_COMMENT);
  await page.dispatchEvent('#comment-input', 'input');
  
  const commentBtn = page.locator('#comment-submit-btn');
  await expect(commentBtn).toBeEnabled({ timeout: 5000 });
  await commentBtn.click();

  await expect(page.locator('.comment-text').filter({ hasText: TEST_COMMENT })).toBeVisible();
  const commentItem = page.locator('.comment-item').filter({ hasText: TEST_COMMENT }).first();
  await expect(commentItem.locator('.comment-author-name')).toContainText(TEST_USER.nickname);


  // ------------------------------------------------
  // E2E-04: Toggle Like
  // ------------------------------------------------
  console.log('Step 4: Toggle Like');

  const likeBtn = page.locator('#like-box');
  await likeBtn.click();
  await expect(likeBtn).toHaveClass(/active/);
  
  await likeBtn.click();
  await expect(likeBtn).not.toHaveClass(/active/);


  // ------------------------------------------------
  // E2E-05: Update Post
  // ------------------------------------------------
  console.log('Step 5: Update Post');

  await page.click('#edit-post-btn');
  await expect(page).toHaveURL(/.*edit/);

  await expect(page.locator('#post-title')).toHaveValue(TEST_POST.title);

  await page.fill('#post-content', TEST_POST.updatedContent);
  await page.dispatchEvent('#post-content', 'input');
  
  const editSubmitBtn = page.locator('#submit-btn');
  await expect(editSubmitBtn).toBeEnabled({ timeout: 10000 });
  await editSubmitBtn.click();

  await expect(page).toHaveURL(/.*detail/);
  await expect(page.locator('#post-content')).toHaveText(TEST_POST.updatedContent);


  // ------------------------------------------------
  // E2E-06: Edit Profile
  // ------------------------------------------------
  console.log('Step 6: Edit Profile');

  await page.click('#header-profile');
  await page.click('#menu-edit-info');
  
  await expect(page).toHaveURL(/.*edit-profile/);
  
  // 데이터 로드 대기 (기존 닉네임이 채워질 때까지)
  await expect(page.locator('#nickname-input')).toHaveValue(TEST_USER.nickname, { timeout: 10000 });

  await page.fill('#nickname-input', TEST_USER.newNickname);
  await page.dispatchEvent('#nickname-input', 'input'); // 강제 이벤트 트리거 추가
  
  const saveBtn = page.locator('#submit-btn');
  await expect(saveBtn).toBeEnabled({ timeout: 10000 }); // 대기 시간 및 검증 보강
  await saveBtn.click();

  await expect(page.locator('#toast')).toBeVisible();
  await expect(page.locator('#toast')).toContainText('수정');
  
  await expect(page.locator('#nickname-input')).toHaveValue(TEST_USER.newNickname);


  // ------------------------------------------------
  // E2E-07: Delete Post
  // ------------------------------------------------
  console.log('Step 7: Delete Post');

  await page.goto('/main');
  await page.waitForSelector('.post-card');
  
  const myPost = page.locator('.post-card').filter({ hasText: TEST_POST.title }).first();
  await myPost.click();
  
  await page.click('#delete-post-btn');
  await expect(page.locator('#confirm-modal')).toBeVisible();
  await page.click('#modal-confirm-btn');

  await expect(page).toHaveURL(/.*main/);
  await expect(page.locator('.post-card').filter({ hasText: TEST_POST.title })).not.toBeVisible();


  // ------------------------------------------------
  // E2E-08: Withdraw
  // ------------------------------------------------
  console.log('Step 8: Withdraw');

  await page.goto('/edit-profile');
  
  await page.click('#withdraw-btn');
  await expect(page.locator('#withdraw-modal')).toBeVisible();
  
  await page.fill('#withdraw-password', TEST_USER.password);
  await page.dispatchEvent('#withdraw-password', 'input');
  
  await page.click('#withdraw-modal #modal-confirm-btn');

  await expect(page).toHaveURL(/.*login/);
  
  // 재로그인 시도 (이미 탈퇴했으므로 실패해야 함)
  await page.fill('#email', TEST_USER.email);
  await page.fill('#password', TEST_USER.password);
  await page.locator('.login-btn').click();
  
  await expect(page).not.toHaveURL(/.*main/);
});