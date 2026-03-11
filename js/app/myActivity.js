// js/app/myActivity.js
// 내 활동 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import MyActivityController from '../controllers/MyActivityController.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 비동기 초기화가 페이지 컨트롤러를 차단하지 않도록 await하지 않음
    const headerController = new HeaderController();
    headerController.init();

    document.getElementById('back-btn')?.addEventListener('click', () => history.back());

    const controller = new MyActivityController();
    await controller.init();
});
