// js/app/dm.js
// 데스크톱 DM 통합 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import { DMPageController } from '../controllers/DMPageController.js';

document.addEventListener('DOMContentLoaded', async () => {
    const headerController = new HeaderController();
    await headerController.init();
    DMPageController.init();
});

window.addEventListener('pagehide', () => DMPageController.destroy());
