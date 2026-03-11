// js/app/dm_detail.js
// DM 대화 상세 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import { DMDetailController } from '../controllers/DMDetailController.js';

document.addEventListener('DOMContentLoaded', () => {
    // 비동기 초기화가 페이지 컨트롤러를 차단하지 않도록 await하지 않음
    const headerController = new HeaderController();
    headerController.init();

    // 재초기화 시 이전 상태 정리 (HMR, 페이지 캐시 대비)
    DMDetailController.destroy();
    DMDetailController.init();
});

// 페이지 이탈 시 이벤트 리스너 정리
window.addEventListener('pagehide', () => DMDetailController.destroy());
