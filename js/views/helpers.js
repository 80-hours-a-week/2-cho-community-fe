// js/views/helpers.js
// DOM 조작 관련 헬퍼 함수 (View 전용)

import { API_BASE_URL, resolveNavPath } from '../config.js';

/**
 * 이미지 URL 처리 (상대 경로인 경우 API_BASE_URL 추가)
 * XSS 방어: 안전한 프로토콜만 허용 (http, https, data:image, 상대경로)
 * @param {string|null} url - 이미지 URL
 * @returns {string} - 처리된 URL
 */
export function getImageUrl(url) {
    if (!url) return '';

    // 위험한 프로토콜 차단 (javascript:, vbscript:, data:text/html 등)
    const urlLower = url.toLowerCase().trim();

    // javascript:, vbscript:, file: 등 위험한 프로토콜 명시적 차단
    const dangerousProtocols = ['javascript:', 'vbscript:', 'file:', 'about:'];
    for (const protocol of dangerousProtocols) {
        if (urlLower.startsWith(protocol)) {
            // 보안: 프로덕션에서 상세 정보 노출 방지
            return ''; // 빈 문자열 반환으로 이미지 로드 차단
        }
    }

    // data: URL은 이미지 MIME type만 허용
    if (urlLower.startsWith('data:')) {
        // data:image/png, data:image/jpeg 등만 허용
        if (urlLower.startsWith('data:image/')) {
            return url;
        }
        // 보안: 프로덕션에서 상세 정보 노출 방지
        return '';
    }

    // http:, https: 허용
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    // 상대 경로: API_BASE_URL 추가
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
export function showToast(message, toastId = 'toast', duration = 3000) {
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }
}

/**
 * 토스트 알림 표시 후 리다이렉트
 * @param {string} message - 표시할 메시지
 * @param {string} url - 이동할 URL
 * @param {number} [delay=1000] - 지연 시간 (ms)
 */
export function showToastAndRedirect(message, url, delay = 1000) {
    showToast(message);
    setTimeout(() => {
        location.href = resolveNavPath(url);
    }, delay);
}

/**
 * 업로드 응답에서 이미지 URL 추출
 * 백엔드 응답 구조가 다양할 수 있어 여러 케이스 처리
 * @param {object} uploadResult - API 응답 객체
 * @returns {string|null} - 추출된 URL 또는 null
 */
export function extractUploadedImageUrl(uploadResult) {
    if (!uploadResult?.ok) return null;

    const data = uploadResult.data?.data;
    if (!data) return null;

    // data가 객체이고 url 프로퍼티가 있는 경우
    if (typeof data === 'object' && data.url) {
        return data.url;
    }
    // data가 문자열인 경우 (URL 자체)
    if (typeof data === 'string') {
        return data;
    }
    return null;
}

/**
 * 파일을 DataURL로 읽어서 콜백 호출 (이미지 미리보기용)
 * @param {File} file - 파일 객체
 * @param {Function} onLoad - 로드 완료 시 콜백 (dataUrl을 인자로 받음)
 * @param {Function} [onError] - 에러 발생 시 콜백
 */
export function readFileAsDataURL(file, onLoad, onError) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => onLoad(e.target.result);
    reader.onerror = (e) => onError?.(e);
    reader.readAsDataURL(file);
}

/**
 * 버튼 상태 업데이트 (활성/비활성)
 * @param {HTMLButtonElement} button - 버튼 요소
 * @param {boolean} isValid - 유효 여부
 * @param {string} [activeColor='#7F6AEE'] - 활성 색상
 * @param {string} [inactiveColor='#ACA0EB'] - 비활성 색상
 */
export function updateButtonState(button, isValid, activeColor = '#7F6AEE', inactiveColor = '#ACA0EB') {
    if (!button) return;

    button.disabled = !isValid;
    button.style.backgroundColor = isValid ? activeColor : inactiveColor;

    if (isValid) {
        button.classList.add('active');
    } else {
        button.classList.remove('active');
    }
}
