// js/app/tagDetail.js
// 태그 상세 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import TagDetailController from '../controllers/TagDetailController.js';

document.addEventListener('DOMContentLoaded', async () => {
    const headerController = new HeaderController();
    await headerController.init();

    const controller = new TagDetailController();
    controller.init(headerController.getCurrentUser());
});
