// js/utils/ErrorBoundary.js
// 에러 바운더리 유틸리티 - 네트워크 에러 처리 및 재시도 로직

import Logger from './Logger.js';
import { clearElement } from './dom.js';

const logger = Logger.createLogger('ErrorBoundary');

/**
 * 에러 바운더리 유틸리티
 * 네트워크 에러 처리, 재시도 로직, 폴백 UI 관리
 */
class ErrorBoundary {
    /**
     * 재시도 가능한 함수 실행
     * @param {Function} fn - 실행할 비동기 함수
     * @param {Object} options - 재시도 옵션
     * @param {number} options.maxRetries - 최대 재시도 횟수 (기본: 3)
     * @param {number} options.delay - 재시도 간격 ms (기본: 1000)
     * @param {number} options.backoff - 지수 백오프 배수 (기본: 2)
     * @param {Function} options.onRetry - 재시도 시 콜백
     * @returns {Promise} 함수 실행 결과
     */
    static async withRetry(fn, options = {}) {
        const {
            maxRetries = 3,
            delay = 1000,
            backoff = 2,
            onRetry = null
        } = options;

        let lastError;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;

                // 재시도 불가능한 에러 (4xx 클라이언트 에러)
                if (error.status >= 400 && error.status < 500) {
                    throw error;
                }

                // 마지막 시도면 에러 던지기
                if (attempt === maxRetries) {
                    logger.error(`모든 재시도 실패 (${maxRetries}회): ${error.message}`);
                    throw error;
                }

                const waitTime = delay * Math.pow(backoff, attempt);
                logger.warn(`재시도 ${attempt + 1}/${maxRetries} - ${waitTime}ms 후 재시도`);

                if (onRetry) {
                    onRetry(attempt + 1, maxRetries, error);
                }

                await this.sleep(waitTime);
            }
        }

        throw lastError;
    }

    /**
     * 네트워크 에러 여부 확인
     * @param {Error} error - 에러 객체
     * @returns {boolean} 네트워크 에러 여부
     */
    static isNetworkError(error) {
        return (
            error.name === 'TypeError' && error.message === 'Failed to fetch' ||
            error.name === 'NetworkError' ||
            error.status === 0 ||
            error.status >= 500
        );
    }

    /**
     * Rate Limit 에러 여부 확인
     * @param {Error} error - 에러 객체
     * @returns {boolean} Rate Limit 에러 여부
     */
    static isRateLimitError(error) {
        return error.status === 429;
    }

    /**
     * 인증 에러 여부 확인
     * @param {Error} error - 에러 객체
     * @returns {boolean} 인증 에러 여부
     */
    static isAuthError(error) {
        return error.status === 401;
    }

    /**
     * 에러 메시지 추출
     * @param {Error} error - 에러 객체
     * @returns {string} 사용자 친화적 에러 메시지
     */
    static getErrorMessage(error) {
        // Rate Limit
        if (this.isRateLimitError(error)) {
            return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
        }

        // 네트워크 에러
        if (this.isNetworkError(error)) {
            return '네트워크 연결을 확인해주세요.';
        }

        // 인증 에러
        if (this.isAuthError(error)) {
            return '로그인이 필요합니다.';
        }

        // 서버 에러
        if (error.status >= 500) {
            return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        }

        // 기타
        return error.message || '오류가 발생했습니다.';
    }

    /**
     * 폴백 UI 표시
     * @param {HTMLElement} container - 에러 표시할 컨테이너
     * @param {string} message - 에러 메시지
     * @param {Function} retryFn - 재시도 함수 (선택)
     */
    static showError(container, message, retryFn = null) {
        // XSS 방지: innerHTML 대신 DOM API 사용
        const errorBoundary = document.createElement('div');
        errorBoundary.className = 'error-boundary';

        const errorIcon = document.createElement('div');
        errorIcon.className = 'error-icon';
        errorIcon.textContent = '⚠️';

        const errorMessage = document.createElement('p');
        errorMessage.className = 'error-message';
        errorMessage.textContent = message;  // XSS 안전: textContent 사용

        errorBoundary.appendChild(errorIcon);
        errorBoundary.appendChild(errorMessage);

        if (retryFn) {
            const retryBtn = document.createElement('button');
            retryBtn.className = 'error-retry-btn btn btn-secondary';
            retryBtn.textContent = '다시 시도';
            retryBtn.addEventListener('click', retryFn);
            errorBoundary.appendChild(retryBtn);
        }

        // 기존 내용 제거 후 새 에러 UI 추가 (XSS 안전)
        clearElement(container);
        container.appendChild(errorBoundary);
    }

    /**
     * 로딩 상태 표시
     * @param {HTMLElement} container - 로딩 표시할 컨테이너
     * @param {string} message - 로딩 메시지 (선택)
     */
    static showLoading(container, message = '로딩 중...') {
        // XSS 방지: innerHTML 대신 DOM API 사용
        const loadingBoundary = document.createElement('div');
        loadingBoundary.className = 'loading-boundary';

        const spinner = document.createElement('div');
        spinner.className = 'spinner';

        const loadingMessage = document.createElement('p');
        loadingMessage.className = 'loading-message';
        loadingMessage.textContent = message;  // XSS 안전: textContent 사용

        loadingBoundary.appendChild(spinner);
        loadingBoundary.appendChild(loadingMessage);

        // 기존 내용 제거 후 새 로딩 UI 추가 (XSS 안전)
        clearElement(container);
        container.appendChild(loadingBoundary);
    }

    /**
     * 지정된 시간만큼 대기
     * @param {number} ms - 대기 시간 (밀리초)
     * @returns {Promise} 대기 완료 Promise
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 안전하게 비동기 함수 실행 (에러 시 null 반환)
     * @param {Function} fn - 실행할 함수
     * @param {*} fallback - 에러 시 반환할 값 (기본: null)
     * @returns {Promise} 실행 결과 또는 fallback
     */
    static async safeExecute(fn, fallback = null) {
        try {
            return await fn();
        } catch (error) {
            logger.error('Safe execute failed:', error);
            return fallback;
        }
    }
}

export default ErrorBoundary;
