// js/app/login.js
// 로그인 페이지 진입점

import LoginController from '../controllers/LoginController.js';
import { API_BASE_URL } from '../config.js';

document.addEventListener('DOMContentLoaded', () => {
    const controller = new LoginController();
    controller.init();

    // 소셜 로그인 버튼 URL 설정
    const kakaoBtn = document.getElementById('kakao-login-btn');
    const naverBtn = document.getElementById('naver-login-btn');
    if (kakaoBtn) kakaoBtn.href = `${API_BASE_URL}/v1/auth/social/kakao/authorize`;
    if (naverBtn) naverBtn.href = `${API_BASE_URL}/v1/auth/social/naver/authorize`;
});
