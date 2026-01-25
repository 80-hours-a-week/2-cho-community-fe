// js/views/helpers.js
// 공통 유틸리티 함수 모음

/**
 * 날짜를 'yyyy-mm-dd hh:mm:ss' 형식으로 포맷팅
 * @param {Date} date - Date 객체
 * @returns {string} - 포맷팅된 날짜 문자열
 */
export function formatDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

/**
 * 숫자를 k 단위로 포맷팅 (예: 1000 -> 1k)
 * @param {number} num - 숫자
 * @returns {string|number} - 포맷팅된 문자열 또는 원본 숫자
 */
export function formatCount(num) {
    if (!num) return 0;
    if (num >= 100000) return Math.floor(num / 1000) + 'k';
    if (num >= 10000) return Math.floor(num / 1000) + 'k';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num;
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

/**
 * 제목 문자열 자르기 (최대 길이 초과 시 ... 추가)
 * @param {string} title - 원본 제목
 * @param {number} [maxLength=26] - 최대 길이
 * @returns {string} - 잘린 제목
 */
export function truncateTitle(title, maxLength = 26) {
    if (title.length > maxLength) {
        return title.substring(0, maxLength) + '...';
    }
    return title;
}
