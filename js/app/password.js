// js/app/password.js
// 비밀번호 변경 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import PasswordController from '../controllers/PasswordController.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 헤더 초기화
    const headerController = new HeaderController();
    await headerController.init();

    // 비밀번호 변경 초기화
    const passwordController = new PasswordController();
    passwordController.init();
});
