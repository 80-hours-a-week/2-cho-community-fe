// @ts-check
// js/config.js
// API 설정 파일

import { HTML_PATHS } from './constants.js';

// Environment detection
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const IS_K8S = window.location.hostname.includes('k8s.my-community.shop');

// API Base URL
// 같은 오리진 배포 시 (nginx 리버스 프록시): 빈 문자열 사용
export const API_BASE_URL = IS_LOCAL
    ? "http://127.0.0.1:8000"              // 로컬 개발: 백엔드 직접 연결
    : IS_K8S
        ? "https://api.k8s.my-community.shop"  // K8s: 별도 서브도메인
        : "https://api.my-community.shop";      // Lambda 프로덕션

// WebSocket URL
export const WS_BASE_URL = IS_LOCAL
    ? "ws://127.0.0.1:8000/ws"             // 로컬 개발: uvicorn WebSocket
    : IS_K8S
        ? "wss://ws.k8s.my-community.shop/ws"  // K8s: 별도 서브도메인
        : "wss://ws.my-community.shop";

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
