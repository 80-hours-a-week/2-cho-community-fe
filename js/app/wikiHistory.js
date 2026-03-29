// js/app/wikiHistory.js
// 위키 편집 기록 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import WikiHistoryController from '../controllers/WikiHistoryController.js';

document.addEventListener('DOMContentLoaded', async () => {
    const headerController = new HeaderController();
    await headerController.init();

    const controller = new WikiHistoryController();
    controller.init(headerController.getCurrentUser());
});
