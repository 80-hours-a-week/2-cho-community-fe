// js/app/wikiDiff.js
// 위키 리비전 diff 비교 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import WikiDiffController from '../controllers/WikiDiffController.js';

document.addEventListener('DOMContentLoaded', async () => {
    const headerController = new HeaderController();
    await headerController.init();

    const controller = new WikiDiffController();
    controller.init(headerController.getCurrentUser());
});
