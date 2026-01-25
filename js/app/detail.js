// js/app/detail.js
// 게시글 상세 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import DetailController from '../controllers/DetailController.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 헤더 초기화
    const headerController = new HeaderController();
    await headerController.init();

    // 상세 페이지 초기화
    const detailController = new DetailController();
    await detailController.init();
});
