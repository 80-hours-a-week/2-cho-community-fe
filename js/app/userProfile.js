// js/app/userProfile.js
// 타 사용자 프로필 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import UserProfileController from '../controllers/UserProfileController.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 인증 확인 후 currentUser 설정 (알림 서비스는 내부에서 비동기 시작)
    const headerController = new HeaderController();
    await headerController.init();

    document.getElementById('back-btn')?.addEventListener('click', () => history.back());

    const controller = new UserProfileController();
    await controller.init(headerController.getCurrentUser());
});
