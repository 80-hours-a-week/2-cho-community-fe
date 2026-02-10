// js/services/ApiService.js
// HTTP 클라이언트 서비스 - 공통 API 호출 로직

import { API_BASE_URL } from '../config.js';
import Logger from '../utils/Logger.js';
import ErrorBoundary from '../utils/ErrorBoundary.js';

const logger = Logger.createLogger('ApiService');

/**
 * HTTP 요청을 처리하는 API 서비스 클래스
 */
class ApiService {
    /**
     * CSRF 토큰 쿠키에서 읽기
     * @returns {string|null} - CSRF 토큰 또는 null
     */
    static getCsrfToken() {
        const match = document.cookie.match(/csrf_token=([^;]+)/);
        return match ? match[1] : null;
    }

    /**
     * GET 요청 (자동 재시도 적용)
     * @param {string} endpoint - API 엔드포인트 (예: '/v1/users/me')
     * @returns {Promise<any>} - 응답 데이터
     */
    static async get(endpoint) {
        logger.debug(`GET 요청: ${endpoint}`);

        try {
            // ErrorBoundary.withRetry를 사용하여 네트워크 에러/5xx/429 시 재시도
            return await ErrorBoundary.withRetry(async () => {
                const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                });

                // 5xx 서버 에러나 429 Too Many Requests는 재시도 대상
                if (response.status >= 500 || response.status === 429) {
                    const error = new Error(`Request failed with status ${response.status}`);
                    error.status = response.status;
                    throw error;
                }

                return ApiService._handleResponse(response, 'GET', endpoint);
            }, {
                maxRetries: 2, // GET은 안전하므로 2번 재시도
                delay: 500,
                onRetry: (attempt, max, error) => {
                    logger.warn(`GET ${endpoint} 재시도 ${attempt}/${max}: ${error.message}`);
                }
            });
        } catch (error) {
            return ApiService._handleNetworkError(error, 'GET', endpoint);
        }
    }

    /**
     * POST 요청 (JSON)
     * @param {string} endpoint - API 엔드포인트
     * @param {object} data - 요청 본문 데이터
     * @returns {Promise<any>} - 응답 데이터
     */
    static async post(endpoint, data) {
        logger.debug(`POST 요청: ${endpoint}`);
        try {
            const headers = { 'Content-Type': 'application/json' };
            const csrfToken = ApiService.getCsrfToken();
            if (csrfToken) {
                headers['X-CSRF-Token'] = csrfToken;
            }

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data),
                credentials: 'include'
            });
            return ApiService._handleResponse(response, 'POST', endpoint);
        } catch (error) {
            return ApiService._handleNetworkError(error, 'POST', endpoint);
        }
    }

    /**
     * POST 요청 (FormData - 파일 업로드용)
     * @param {string} endpoint - API 엔드포인트
     * @param {FormData} formData - FormData 객체
     * @returns {Promise<any>} - 응답 데이터
     */
    static async postFormData(endpoint, formData) {
        logger.debug(`POST FormData 요청: ${endpoint}`);
        try {
            const headers = {};
            const csrfToken = ApiService.getCsrfToken();
            if (csrfToken) {
                headers['X-CSRF-Token'] = csrfToken;
            }
            // Content-Type은 브라우저가 자동 설정 (multipart/form-data boundary 포함)

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: headers,
                body: formData,
                credentials: 'include'
            });
            return ApiService._handleResponse(response, 'POST', endpoint);
        } catch (error) {
            return ApiService._handleNetworkError(error, 'POST', endpoint);
        }
    }

    /**
     * PATCH 요청
     * @param {string} endpoint - API 엔드포인트
     * @param {object} data - 요청 본문 데이터
     * @returns {Promise<any>} - 응답 데이터
     */
    static async patch(endpoint, data) {
        logger.debug(`PATCH 요청: ${endpoint}`);
        try {
            const headers = { 'Content-Type': 'application/json' };
            const csrfToken = ApiService.getCsrfToken();
            if (csrfToken) {
                headers['X-CSRF-Token'] = csrfToken;
            }

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'PATCH',
                headers: headers,
                body: JSON.stringify(data),
                credentials: 'include'
            });
            return ApiService._handleResponse(response, 'PATCH', endpoint);
        } catch (error) {
            return ApiService._handleNetworkError(error, 'PATCH', endpoint);
        }
    }

    /**
     * PUT 요청
     * @param {string} endpoint - API 엔드포인트
     * @param {object} data - 요청 본문 데이터
     * @returns {Promise<any>} - 응답 데이터
     */
    static async put(endpoint, data) {
        logger.debug(`PUT 요청: ${endpoint}`);
        try {
            const headers = { 'Content-Type': 'application/json' };
            const csrfToken = ApiService.getCsrfToken();
            if (csrfToken) {
                headers['X-CSRF-Token'] = csrfToken;
            }

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(data),
                credentials: 'include'
            });
            return ApiService._handleResponse(response, 'PUT', endpoint);
        } catch (error) {
            return ApiService._handleNetworkError(error, 'PUT', endpoint);
        }
    }

    /**
     * DELETE 요청
     * @param {string} endpoint - API 엔드포인트
     * @param {object} [data] - 선택적 요청 본문 데이터
     * @returns {Promise<any>} - 응답 데이터
     */
    static async delete(endpoint, data = null) {
        logger.debug(`DELETE 요청: ${endpoint}`);
        try {
            const headers = { 'Content-Type': 'application/json' };
            const csrfToken = ApiService.getCsrfToken();
            if (csrfToken) {
                headers['X-CSRF-Token'] = csrfToken;
            }

            const options = {
                method: 'DELETE',
                headers: headers,
                credentials: 'include'
            };
            if (data) {
                options.body = JSON.stringify(data);
            }
            const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
            return ApiService._handleResponse(response, 'DELETE', endpoint);
        } catch (error) {
            return ApiService._handleNetworkError(error, 'DELETE', endpoint);
        }
    }

    /**
     * 응답 처리 공통 로직
     * @param {Response} response - fetch 응답 객체
     * @param {string} method - HTTP 메서드
     * @param {string} endpoint - API 엔드포인트
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async _handleResponse(response, method = '', endpoint = '') {
        let data = null;

        // 응답 본문이 있는 경우에만 처리
        const contentType = response.headers.get('content-type');
        try {
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                // JSON이 아닌 경우 (예: 500 HTML 에러 페이지) 텍스트로 읽음
                // 백엔드 프레임워크나 프록시(Nginx 등)가 JSON이 아닌 HTML 에러 페이지를 반환하는 경우가 많으므로
                // 무조건 JSON 파싱을 시도하면 SyntaxError가 발생하여 에러 내용을 확인할 수 없게 됨.
                // 따라서 Content-Type을 확인하여 유연하게 처리함.
                const text = await response.text();
                if (text) {
                    data = { message: text, _isText: true };
                }
            }
        } catch (e) {
            logger.warn(`응답 처리 실패: ${method} ${endpoint}`, e);
            data = { message: '응답을 처리할 수 없습니다.' };
        }

        // 응답 로깅
        if (response.ok) {
            logger.info(`${method} ${endpoint} 성공 (${response.status})`);
        } else {
            logger.error(`${method} ${endpoint} 실패 (${response.status})`, data);
        }

        // 인증 만료 (401) 전역 처리
        // 로그인/조회 등 일부 API는 제외해야 할 수 있으나, 일반적으로 브라우저 세션 기반이므로
        // 401은 세션 만료를 의미함.
        if (response.status === 401 && !endpoint.includes('check-email') && !endpoint.includes('check-nickname') && !endpoint.includes('login')) {
            // Service 레벨에서 View를 직접 제어하지 않고 이벤트 발생
            logger.warn('세션 만료 감지 - 이벤트 발생');
            window.dispatchEvent(new CustomEvent('auth:session-expired'));
        }

        return {
            ok: response.ok,
            status: response.status,
            data: data
        };
    }

    /**
     * 네트워크 에러 처리
     * @param {Error} error - 에러 객체
     * @param {string} method - HTTP 메서드
     * @param {string} endpoint - API 엔드포인트
     * @returns {{ok: boolean, status: number, data: {message: string, _isNetworkError: boolean}}}
     */
    static _handleNetworkError(error, method, endpoint) {
        logger.error(`${method} ${endpoint} 네트워크 에러`, error);
        return {
            ok: false,
            status: 0,
            data: {
                message: '네트워크 연결을 확인해주세요.',
                _isNetworkError: true
            }
        };
    }
}

export default ApiService;
