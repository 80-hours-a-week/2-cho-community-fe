// js/app/signup.js
// 회원가입 페이지 진입점

import SignupController from '../controllers/SignupController.js';
import { API_BASE_URL } from '../config.js';

document.addEventListener('DOMContentLoaded', () => {
    const controller = new SignupController();
    controller.init();

    // 소셜 로그인 버튼 URL 설정
    const kakaoBtn = document.getElementById('kakao-login-btn');
    const naverBtn = document.getElementById('naver-login-btn');
    if (kakaoBtn) kakaoBtn.href = `${API_BASE_URL}/v1/auth/social/kakao/authorize`;
    if (naverBtn) naverBtn.href = `${API_BASE_URL}/v1/auth/social/naver/authorize`;
});
