// js/app/packageList.js
// 패키지 목록 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import PackageListController from '../controllers/PackageListController.js';

document.addEventListener('DOMContentLoaded', () => {
    const headerController = new HeaderController();
    headerController.init();

    const controller = new PackageListController();
    controller.init();
});
