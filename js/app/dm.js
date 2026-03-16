// js/app/dm.js
// 데스크톱 DM 통합 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import { DMPageController } from '../controllers/DMPageController.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 인증 필요 페이지: headerController 초기화 완료 후 페이지 컨트롤러 실행
    const headerController = new HeaderController();
    await headerController.init();
    DMPageController.init();
});

window.addEventListener('pagehide', () => DMPageController.destroy());
