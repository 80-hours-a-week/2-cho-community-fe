// js/app/badges.js
// 배지 목록 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import BadgeController from '../controllers/BadgeController.js';

document.addEventListener('DOMContentLoaded', async () => {
    const headerController = new HeaderController();
    await headerController.init();

    const controller = new BadgeController();
    await controller.init(headerController.getCurrentUser());
});
