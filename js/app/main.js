// js/app/main.js
// 메인 페이지 진입점

import MainController from '../controllers/MainController.js';
import HeaderController from '../controllers/HeaderController.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 헤더 초기화 (인증 체크 및 프로필 렌더링)
    const headerController = new HeaderController();
    await headerController.init();

    // 메인 페이지 초기화
    const controller = new MainController();
    controller.init();
});
