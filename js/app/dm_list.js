// js/app/dm_list.js
// DM 목록 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import { DMListController } from '../controllers/DMListController.js';

document.addEventListener('DOMContentLoaded', async () => {
    const headerController = new HeaderController();
    await headerController.init();

    document.getElementById('back-btn')?.addEventListener('click', () => history.back());

    DMListController.init();
});
