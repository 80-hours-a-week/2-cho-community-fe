// js/app/signup.js
// 회원가입 페이지 진입점

import SignupController from '../controllers/SignupController.js';
import { API_BASE_URL } from '../config.js';

document.addEventListener('DOMContentLoaded', () => {
    const controller = new SignupController();
    controller.init();

    // 소셜 로그인 버튼 URL 설정
    const githubBtn = document.getElementById('github-login-btn');
    if (githubBtn) githubBtn.href = `${API_BASE_URL}/v1/auth/social/github/authorize`;
});
