// js/app/packageDetail.js
// 패키지 상세 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import PackageDetailController from '../controllers/PackageDetailController.js';

document.addEventListener('DOMContentLoaded', async () => {
    const headerController = new HeaderController();
    await headerController.init(); // 리뷰 작성에 인증 필요

    const controller = new PackageDetailController();
    controller.init(headerController.getCurrentUser());
});
