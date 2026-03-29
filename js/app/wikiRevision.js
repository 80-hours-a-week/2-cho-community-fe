// js/app/wikiRevision.js
// 위키 리비전 상세 보기 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import WikiRevisionController from '../controllers/WikiRevisionController.js';

document.addEventListener('DOMContentLoaded', async () => {
    const headerController = new HeaderController();
    await headerController.init();

    const controller = new WikiRevisionController();
    controller.init(headerController.getCurrentUser());
});
