// js/app/detail.js
// 게시글 상세 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import DetailController from '../controllers/DetailController.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 인증 확인 후 currentUser 설정 (알림 서비스는 내부에서 비동기 시작)
    const headerController = new HeaderController();
    await headerController.init();

    // 상세 페이지 초기화 (헤더에서 확인한 사용자 정보 재활용)
    const detailController = new DetailController();
    await detailController.init(headerController.getCurrentUser());
});
