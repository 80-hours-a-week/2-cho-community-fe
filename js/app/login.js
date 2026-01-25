// js/app/login.js
// 로그인 페이지 진입점

import LoginController from '../controllers/LoginController.js';

document.addEventListener('DOMContentLoaded', () => {
    const controller = new LoginController();
    controller.init();
});
