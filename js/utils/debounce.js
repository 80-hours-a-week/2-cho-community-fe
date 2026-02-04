/**
 * 디바운스 유틸리티
 * @param {Function} func - 실행할 함수
 * @param {number} wait - 지연 시간 (ms)
 * @returns {Function} - 디바운스된 함수
 */
export function debounce(func, wait) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}
