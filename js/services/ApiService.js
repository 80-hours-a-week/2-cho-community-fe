// js/services/ApiService.js
// HTTP 클라이언트 서비스 - JWT Bearer Token 기반 API 호출

import { API_BASE_URL } from '../config.js';
import Logger from '../utils/Logger.js';
import ErrorBoundary from '../utils/ErrorBoundary.js';

const logger = Logger.createLogger('ApiService');

// ─── In-memory Access Token Store ───────────────────────────────────────────
// 모듈 스코프 변수 — window/localStorage 사용하지 않아 XSS 노출 방지
let _accessToken = null;
let _refreshing = null; // Promise | null — 동시 401 대응 (thundering herd 방지)

/**
 * Access Token을 설정합니다 (로그인 성공 후 호출).
 * @param {string|null} token
 */
export function setAccessToken(token) {
    _accessToken = token;
}

/**
 * Access Token을 반환합니다.
 * @returns {string|null}
 */
export function getAccessToken() {
    return _accessToken;
}

/**
 * HTTP 요청을 처리하는 API 서비스 클래스
 */
class ApiService {
    /**
     * Authorization 헤더를 포함한 공통 헤더를 반환합니다.
     * @param {object} extra - 추가 헤더
     * @returns {object}
     */
    static _buildHeaders(extra = {}) {
        const headers = { 'Content-Type': 'application/json', ...extra };
        if (_accessToken) {
            headers['Authorization'] = `Bearer ${_accessToken}`;
        }
        return headers;
    }

    /**
     * Refresh Token 쿠키로 새 Access Token을 요청합니다.
     * 동시에 여러 요청이 401을 받아도 refresh는 1번만 실행됩니다.
     * @returns {Promise<boolean>} 성공 여부
     */
    static async _tryRefresh() {
        if (_refreshing) {
            return _refreshing;
        }

        _refreshing = (async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/v1/auth/token/refresh`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                });

                if (response.ok) {
                    const data = await response.json();
                    const newToken = data?.data?.access_token;
                    if (newToken) {
                        _accessToken = newToken;
                        logger.info('Access Token 갱신 성공');
                        return true;
                    }
                }

                _accessToken = null;
                return false;
            } catch (e) {
                _accessToken = null;
                return false;
            } finally {
                _refreshing = null;
            }
        })();

        return _refreshing;
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
                    headers: ApiService._buildHeaders(),
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
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: ApiService._buildHeaders(),
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
            // FormData는 Content-Type을 브라우저가 자동 설정 (multipart/form-data boundary 포함)
            const headers = {};
            if (_accessToken) {
                headers['Authorization'] = `Bearer ${_accessToken}`;
            }

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
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'PATCH',
                headers: ApiService._buildHeaders(),
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
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'PUT',
                headers: ApiService._buildHeaders(),
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
            const options = {
                method: 'DELETE',
                headers: ApiService._buildHeaders(),
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
     * 401 수신 시 silent refresh 시도 후 auth:session-expired 이벤트 발생.
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

        // 401 처리: auth 엔드포인트가 아닌 경우 refresh 시도
        const isAuthEndpoint = endpoint.includes('/auth/');
        if (response.status === 401 && !isAuthEndpoint) {
            logger.warn('401 감지 — silent refresh 시도');
            const refreshed = await ApiService._tryRefresh();
            if (!refreshed) {
                logger.warn('Refresh 실패 — 세션 만료 이벤트 발생');
                window.dispatchEvent(new CustomEvent('auth:session-expired'));
            }
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
