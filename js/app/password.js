// js/app/password.js
// 비밀번호 변경 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import PasswordController from '../controllers/PasswordController.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 인증 필요 페이지: headerController 초기화 완료 후 페이지 컨트롤러 실행
    const headerController = new HeaderController();
    await headerController.init();

    // 비밀번호 변경 초기화
    const passwordController = new PasswordController();
    passwordController.init();
});
