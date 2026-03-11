// js/app/verifyEmail.js
// 이메일 인증 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import VerifyEmailController from '../controllers/VerifyEmailController.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 비동기 초기화가 페이지 컨트롤러를 차단하지 않도록 await하지 않음
    const headerController = new HeaderController();
    headerController.init();

    document.getElementById('back-btn')?.addEventListener('click', () => history.back());

    const controller = new VerifyEmailController();
    await controller.init();
});
