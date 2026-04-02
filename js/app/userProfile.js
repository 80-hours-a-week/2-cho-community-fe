// js/app/userProfile.js
// 타 사용자 프로필 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import UserProfileController from '../controllers/UserProfileController.js';

/** @type {UserProfileController | null} */
let _controller = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 인증 확인 후 currentUser 설정 (알림 서비스는 내부에서 비동기 시작)
    const headerController = new HeaderController();
    await headerController.init();

    document.getElementById('back-btn')?.addEventListener('click', () => history.back());

    _controller = new UserProfileController();
    await _controller.init(headerController.getCurrentUser());
});

// 페이지 이탈 시 리소스 정리 (스크롤 핸들러)
window.addEventListener('pagehide', () => _controller?.destroy());
