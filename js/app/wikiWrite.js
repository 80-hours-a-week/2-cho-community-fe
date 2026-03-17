// js/app/wikiWrite.js
// 위키 작성 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import WikiWriteController from '../controllers/WikiWriteController.js';

document.addEventListener('DOMContentLoaded', async () => {
    const headerController = new HeaderController();
    await headerController.init(); // 인증 필수

    const controller = new WikiWriteController();
    controller.init(headerController.getCurrentUser());
});
