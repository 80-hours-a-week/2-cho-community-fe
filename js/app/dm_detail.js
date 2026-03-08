// js/app/dm_detail.js
// DM 대화 상세 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import { DMDetailController } from '../controllers/DMDetailController.js';

document.addEventListener('DOMContentLoaded', async () => {
    const headerController = new HeaderController();
    await headerController.init();

    DMDetailController.init();
});
