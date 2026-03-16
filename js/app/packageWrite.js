// js/app/packageWrite.js
// 패키지 등록 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import PackageWriteController from '../controllers/PackageWriteController.js';

document.addEventListener('DOMContentLoaded', async () => {
    const headerController = new HeaderController();
    await headerController.init(); // 인증 필수

    const controller = new PackageWriteController();
    controller.init(headerController.getCurrentUser());
});
