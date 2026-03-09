// @ts-check
/**
 * 디바운스 유틸리티
 * @param {(...args: any[]) => void} func - 실행할 함수
 * @param {number} wait - 지연 시간 (ms)
 * @returns {(...args: any[]) => void} 디바운스된 함수
 */
export function debounce(func, wait) {
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let timeout;
    return function (/** @type {any} */ ...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func(...args);
        }, wait);
    };
}
