// js/app/edit_profile.js
// 프로필 수정 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import ProfileController from '../controllers/ProfileController.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 인증 필요 페이지: headerController 초기화 완료 후 페이지 컨트롤러 실행
    const headerController = new HeaderController();
    await headerController.init();

    // 프로필 수정 초기화
    const profileController = new ProfileController();
    await profileController.init();
});
