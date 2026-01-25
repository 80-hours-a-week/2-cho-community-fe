// js/app/signup.js
// 회원가입 페이지 진입점

import SignupController from '../controllers/SignupController.js';

document.addEventListener('DOMContentLoaded', () => {
    const controller = new SignupController();
    controller.init();
});
