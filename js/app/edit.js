// js/app/edit.js
// 게시글 수정 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import EditController from '../controllers/EditController.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 인증 확인 후 currentUser 설정 (알림 서비스는 내부에서 비동기 시작)
    const headerController = new HeaderController();
    await headerController.init();

    // 수정 페이지 초기화 (카테고리 로드를 위해 사용자 정보 전달)
    const editController = new EditController();
    await editController.init(headerController.getCurrentUser());
});
