// js/app/edit_profile.js
// 프로필 수정 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import ProfileController from '../controllers/ProfileController.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 비동기 초기화가 페이지 컨트롤러를 차단하지 않도록 await하지 않음
    const headerController = new HeaderController();
    headerController.init();

    // 프로필 수정 초기화
    const profileController = new ProfileController();
    await profileController.init();
});
