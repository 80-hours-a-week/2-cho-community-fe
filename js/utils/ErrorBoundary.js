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
     * 에러 메시지를 안전하게 DOM에 표시 (XSS 방지: textContent 사용)
     * @param {HTMLElement} container - 에러를 표시할 컨테이너
     * @param {string} message - 에러 메시지
     * @param {(() => void)|null} [retryFn=null] - 재시도 콜백
     */
    static showError(container, message, retryFn = null) {
        container.textContent = '';

        const bodyChildren = [
            (() => {
                const p = document.createElement('p');
                const prompt = document.createElement('span');
                prompt.className = 'terminal-state__prompt';
                prompt.textContent = '$';
                p.appendChild(prompt);
                p.appendChild(document.createTextNode(' cat resource'));
                return p;
            })(),
            (() => {
                const span = document.createElement('span');
                span.className = 'terminal-state__error';
                span.textContent = `Error: ${message}`;
                return span;
            })(),
        ];

        if (retryFn) {
            const retryRow = document.createElement('div');
            retryRow.className = 'terminal-state__retry';
            const retryPrompt = document.createElement('span');
            retryPrompt.className = 'terminal-state__prompt';
            retryPrompt.textContent = '$';
            retryRow.appendChild(retryPrompt);
            retryRow.appendChild(document.createTextNode(' retry --verbose '));
            const btn = document.createElement('button');
            btn.className = 'terminal-state__retry-btn';
            btn.textContent = '실행';
            btn.addEventListener('click', retryFn);
            retryRow.appendChild(btn);
            bodyChildren.push(retryRow);
        } else {
            const cursor = document.createElement('span');
            cursor.className = 'terminal-state__cursor';
            cursor.textContent = '_';
            bodyChildren.push(cursor);
        }

        const terminal = document.createElement('div');
        terminal.className = 'terminal-state';

        const bar = document.createElement('div');
        bar.className = 'terminal-state__bar';
        ['red', 'yellow', 'green'].forEach(color => {
            const dot = document.createElement('span');
            dot.className = `terminal-state__dot terminal-state__dot--${color}`;
            bar.appendChild(dot);
        });
        terminal.appendChild(bar);

        const body = document.createElement('div');
        body.className = 'terminal-state__body';
        bodyChildren.forEach(child => body.appendChild(child));
        terminal.appendChild(body);

        container.appendChild(terminal);
    }

    /**
     * 로딩 메시지를 안전하게 DOM에 표시 (XSS 방지: textContent 사용)
     * @param {HTMLElement} container - 로딩을 표시할 컨테이너
     * @param {string} message - 로딩 메시지
     */
    static showLoading(container, message) {
        container.textContent = '';
        const msgEl = document.createElement('div');
        msgEl.className = 'loading-message';
        msgEl.textContent = message;
        container.appendChild(msgEl);
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
