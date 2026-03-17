// js/app/wikiDetail.js
// 위키 상세 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import WikiDetailController from '../controllers/WikiDetailController.js';

document.addEventListener('DOMContentLoaded', () => {
    const headerController = new HeaderController();
    headerController.init();

    const controller = new WikiDetailController();
    controller.init(headerController.getCurrentUser());
});
