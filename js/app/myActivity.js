// js/app/myActivity.js
// 내 활동 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import MyActivityController from '../controllers/MyActivityController.js';

/** @type {MyActivityController | null} */
let _controller = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 인증 필요 페이지: headerController 초기화 완료 후 페이지 컨트롤러 실행
    const headerController = new HeaderController();
    await headerController.init();

    document.getElementById('back-btn')?.addEventListener('click', () => history.back());

    _controller = new MyActivityController();
    await _controller.init();
});

// 페이지 이탈 시 리소스 정리 (스크롤 핸들러)
window.addEventListener('pagehide', () => _controller?.destroy());
