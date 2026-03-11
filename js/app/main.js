// js/app/main.js
// 메인 페이지 진입점

import MainController from '../controllers/MainController.js';
import HeaderController from '../controllers/HeaderController.js';

document.addEventListener('DOMContentLoaded', () => {
    // 헤더 초기화 (인증 체크 및 프로필 렌더링) — await하지 않음
    // WebSocket 연결 등 비동기 작업이 MainController 이벤트 바인딩을 차단하지 않도록 함
    const headerController = new HeaderController();
    headerController.init();

    // 메인 페이지 초기화 (DOM 이벤트 바인딩을 즉시 수행)
    const controller = new MainController();
    controller.init();
});
