// @ts-check
// js/config.js
// API 설정 파일

import { HTML_PATHS } from './constants.js';

// Environment detection
// - Vite dev server: hostname이 127.0.0.1, port가 8080이 아닌 경우 (Vite 기본 포트)
// - Docker Compose: nginx가 :8080에서 API를 /v1/로 프록시 → 같은 origin 사용
// - K8s/프로덕션: 전용 API 도메인 사용
// Vite dev server: 8080도 3000도 아닌 포트 (Vite 기본 5173 등)
const IS_VITE_DEV = window.location.hostname === '127.0.0.1'
    && window.location.port !== '8080' && window.location.port !== '3000';
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// API Base URL
export const API_BASE_URL = IS_VITE_DEV
    ? "http://127.0.0.1:8000"              // Vite dev server: BE 직접 연결
    : IS_LOCAL
        ? ""                                // Docker Compose: nginx 프록시 (같은 origin)
        : "https://api.my-community.shop";  // K8s 프로덕션

// WebSocket URL
export const WS_BASE_URL = IS_VITE_DEV
    ? "ws://127.0.0.1:8000/ws"             // Vite dev server: uvicorn 직접
    : IS_LOCAL
        ? `ws://${window.location.host}/ws` // Docker Compose: nginx 프록시
        : "wss://ws.my-community.shop/ws";  // K8s 프로덕션

/**
 * 네비게이션 경로를 실제 HTML 파일 경로로 변환합니다.
 * @param {string} path - 클린 URL 경로 (예: '/login')
 * @returns {string} - 실제 HTML 파일 경로 (예: '/user_login.html')
 */
export function resolveNavPath(path) {
    if (IS_LOCAL) {
        return path;
    }

    const basePath = path.split('?')[0];
    const queryString = path.includes('?') ? path.substring(path.indexOf('?')) : '';

    return (HTML_PATHS[basePath] || path) + queryString;
}
