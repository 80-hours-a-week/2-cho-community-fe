// js/app/password.js
// 비밀번호 변경 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import PasswordController from '../controllers/PasswordController.js';

document.addEventListener('DOMContentLoaded', () => {
    // 비동기 초기화가 페이지 컨트롤러를 차단하지 않도록 await하지 않음
    const headerController = new HeaderController();
    headerController.init();

    // 비밀번호 변경 초기화
    const passwordController = new PasswordController();
    passwordController.init();
});
