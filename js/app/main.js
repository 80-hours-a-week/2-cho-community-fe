// js/app/main.js
// 메인 페이지 진입점

import MainController from '../controllers/MainController.js';
import HeaderController from '../controllers/HeaderController.js';
import { setAccessToken } from '../services/ApiService.js';

// 소셜 로그인 콜백에서 전달된 access_token 처리
const _urlParams = new URLSearchParams(window.location.search);
const _socialToken = _urlParams.get('access_token');
if (_socialToken) {
    setAccessToken(_socialToken);
    // URL에서 토큰 제거 (보안)
    _urlParams.delete('access_token');
    const cleanUrl = _urlParams.toString()
        ? `${window.location.pathname}?${_urlParams.toString()}`
        : window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);
}

/** @type {MainController | null} */
let _controller = null;

document.addEventListener('DOMContentLoaded', () => {
    // 헤더 초기화 (인증 체크 및 프로필 렌더링) — await하지 않음
    // WebSocket 연결 등 비동기 작업이 MainController 이벤트 바인딩을 차단하지 않도록 함
    const headerController = new HeaderController();
    headerController.init();

    // 메인 페이지 초기화 (DOM 이벤트 바인딩을 즉시 수행)
    _controller = new MainController();
    _controller.init();
});

// 페이지 이탈 시 리소스 정리 (스크롤 옵저버, AbortController 등)
window.addEventListener('pagehide', () => _controller?.destroy());
