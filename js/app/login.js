// js/app/login.js
// 로그인 페이지 진입점

import LoginController from '../controllers/LoginController.js';
import { API_BASE_URL } from '../config.js';
import { showToast } from '../views/helpers.js';

// 소셜 로그인 에러 처리
const _params = new URLSearchParams(window.location.search);
const _socialError = _params.get('error');
if (_socialError) {
    const messages = {
        cancelled: '소셜 로그인이 취소되었습니다.',
        suspended: '정지된 계정입니다.',
        social_failed: '소셜 로그인에 실패했습니다. 다시 시도해주세요.',
    };
    showToast(messages[_socialError] || '로그인 중 오류가 발생했습니다.');
}

document.addEventListener('DOMContentLoaded', () => {
    const controller = new LoginController();
    controller.init();

    // 소셜 로그인 버튼 URL 설정
    const githubBtn = document.getElementById('github-login-btn');
    if (githubBtn) githubBtn.href = `${API_BASE_URL}/v1/auth/social/github/authorize`;
});
