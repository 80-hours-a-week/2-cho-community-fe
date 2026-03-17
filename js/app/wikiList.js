// js/app/wikiList.js
// 위키 목록 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import WikiListController from '../controllers/WikiListController.js';

document.addEventListener('DOMContentLoaded', () => {
    const headerController = new HeaderController();
    headerController.init();

    const controller = new WikiListController();
    controller.init();
});
