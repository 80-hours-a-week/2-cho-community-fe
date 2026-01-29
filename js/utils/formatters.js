// js/utils/formatters.js
// 데이터 포맷팅 유틸리티 함수 (DOM과 무관)

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
