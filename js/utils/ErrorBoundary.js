// @ts-check
// js/utils/ErrorBoundary.js
// 에러 바운더리 유틸리티 - 네트워크 에러 재시도 로직

import Logger from './Logger.js';

const logger = Logger.createLogger('ErrorBoundary');

/**
 * 에러 바운더리 유틸리티
 * GET 요청의 지수 백오프 재시도 로직 제공
 */
class ErrorBoundary {
    /**
     * 재시도 가능한 함수 실행
     * @param {() => Promise<any>} fn - 실행할 비동기 함수
     * @param {Object} [options={}] - 재시도 옵션
     * @param {number} [options.maxRetries=3] - 최대 재시도 횟수
     * @param {number} [options.delay=1000] - 재시도 간격 ms
     * @param {number} [options.backoff=2] - 지수 백오프 배수
     * @param {(attempt: number, max: number, error: Error) => void} [options.onRetry] - 재시도 시 콜백
     * @returns {Promise<any>} 함수 실행 결과
     */
    static async withRetry(fn, options = {}) {
        const {
            maxRetries = 3,
            delay = 1000,
            backoff = 2,
            onRetry = null
        } = options;

        /** @type {any} */
        let lastError;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (/** @type {any} */ error) {
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
     * 지정된 시간만큼 대기
     * @param {number} ms - 대기 시간 (밀리초)
     * @returns {Promise<void>} 대기 완료 Promise
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

}

export default ErrorBoundary;
