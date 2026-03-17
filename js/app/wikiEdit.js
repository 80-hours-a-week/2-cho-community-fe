// js/app/wikiEdit.js
// 위키 편집 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import WikiEditController from '../controllers/WikiEditController.js';

document.addEventListener('DOMContentLoaded', async () => {
    const headerController = new HeaderController();
    await headerController.init(); // 인증 필수

    const controller = new WikiEditController();
    controller.init(headerController.getCurrentUser());
});
