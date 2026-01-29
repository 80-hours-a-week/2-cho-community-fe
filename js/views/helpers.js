// js/views/helpers.js
// DOM 조작 관련 헬퍼 함수 (View 전용)

import { API_BASE_URL } from '../config.js';

/**
 * 이미지 URL 처리 (상대 경로인 경우 API_BASE_URL 추가)
 * @param {string|null} url - 이미지 URL
 * @returns {string} - 처리된 URL
 */
export function getImageUrl(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    return `${API_BASE_URL}${url}`;
}

/**
 * 헬퍼 텍스트에 에러 메시지 표시
 * @param {HTMLElement} helperEl - 헬퍼 텍스트 요소
 * @param {string} message - 에러 메시지
 */
export function showError(helperEl, message) {
    if (helperEl) {
        helperEl.textContent = message;
        helperEl.style.display = 'block';
        helperEl.style.color = '#FF3333';
    }
}

/**
 * 헬퍼 텍스트 숨기기
 * @param {HTMLElement} helperEl - 헬퍼 텍스트 요소
 */
export function hideError(helperEl) {
    if (helperEl) {
        helperEl.textContent = '';
        helperEl.style.display = 'none';
    }
}

/**
 * 토스트 알림 표시
 * @param {string} [toastId='toast'] - 토스트 요소 ID
 * @param {number} [duration=3000] - 표시 지속 시간 (ms)
 */
export function showToast(toastId = 'toast', duration = 3000) {
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }
}
