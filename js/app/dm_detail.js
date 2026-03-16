// js/app/dm_detail.js
// DM 대화 상세 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import { DMDetailController } from '../controllers/DMDetailController.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 인증 필요 페이지: headerController 초기화 완료 후 페이지 컨트롤러 실행
    const headerController = new HeaderController();
    await headerController.init();

    // 재초기화 시 이전 상태 정리 (HMR, 페이지 캐시 대비)
    DMDetailController.destroy();
    DMDetailController.init();
});

// 페이지 이탈 시 이벤트 리스너 정리
window.addEventListener('pagehide', () => DMDetailController.destroy());
