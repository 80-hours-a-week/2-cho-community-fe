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

// K8s 환경: hostname에서 API/WS 도메인 도출
// - staging.my-community.shop → api-staging.my-community.shop
// - my-community.shop → api.my-community.shop
// - k8s.my-community.shop → api.k8s.my-community.shop
function deriveApiDomain() {
    const host = window.location.hostname;
    if (host === 'my-community.shop') return 'api.my-community.shop';
    // staging.xxx, k8s.xxx 등 서브도메인 → api-{subdomain}.xxx
    const parts = host.split('.');
    const subdomain = parts[0];
    const baseDomain = parts.slice(1).join('.');
    return `api-${subdomain}.${baseDomain}`;
}

function deriveWsDomain() {
    const host = window.location.hostname;
    if (host === 'my-community.shop') return 'ws.my-community.shop';
    const parts = host.split('.');
    const subdomain = parts[0];
    const baseDomain = parts.slice(1).join('.');
    return `ws-${subdomain}.${baseDomain}`;
}

// API Base URL
export const API_BASE_URL = IS_VITE_DEV
    ? "http://127.0.0.1:8000"              // Vite dev server: BE 직접 연결
    : IS_LOCAL
        ? ""                                // Docker Compose: nginx 프록시 (같은 origin)
        : `https://${deriveApiDomain()}`;   // K8s: hostname에서 자동 도출

// WebSocket URL
export const WS_BASE_URL = IS_VITE_DEV
    ? "ws://127.0.0.1:8000/ws"             // Vite dev server: uvicorn 직접
    : IS_LOCAL
        ? `ws://${window.location.host}/ws` // Docker Compose: nginx 프록시
        : `wss://${deriveWsDomain()}/ws`;   // K8s: hostname에서 자동 도출

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
