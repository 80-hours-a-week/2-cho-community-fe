// js/app/dm.js
// 데스크톱 DM 통합 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import { DMPageController } from '../controllers/DMPageController.js';

document.addEventListener('DOMContentLoaded', () => {
    // 비동기 초기화가 페이지 컨트롤러를 차단하지 않도록 await하지 않음
    const headerController = new HeaderController();
    headerController.init();
    DMPageController.init();
});

window.addEventListener('pagehide', () => DMPageController.destroy());
