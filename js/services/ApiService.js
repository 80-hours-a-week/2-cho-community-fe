// @ts-check
// js/services/ApiService.js
// HTTP 클라이언트 서비스 - JWT Bearer Token 기반 API 호출

import { API_BASE_URL } from '../config.js';
import Logger from '../utils/Logger.js';
import ErrorBoundary from '../utils/ErrorBoundary.js';

const logger = Logger.createLogger('ApiService');

// FastAPI는 trailing slash 없는 요청을 307 리다이렉트하므로
// POST/PUT/PATCH/DELETE 시 body가 유실됨. 모든 엔드포인트에 trailing slash 보장.
/**
 * @param {string} endpoint
 * @returns {string}
 */
function ensureTrailingSlash(endpoint) {
    const [path, query] = endpoint.split('?');
    const normalized = path.endsWith('/') ? path : path + '/';
    return query ? `${normalized}?${query}` : normalized;
}

// ─── In-memory Access Token Store ───────────────────────────────────────────
// 모듈 스코프 변수 — window/localStorage 사용하지 않아 XSS 노출 방지
/** @type {string|null} */
let _accessToken = null;
/** @type {Promise<boolean>|null} */
let _refreshing = null; // 동시 401 대응 (thundering herd 방지)

/**
 * Access Token을 설정합니다 (로그인 성공 후 호출).
 * @param {string|null} token
 * @returns {void}
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
     * @param {Record<string, string>} [extra={}] - 추가 헤더
     * @returns {Record<string, string>}
     */
    static _buildHeaders(extra = {}) {
        /** @type {Record<string, string>} */
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
            } catch (_e) {
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
     * @param {boolean | {_isRetry?: boolean, signal?: AbortSignal, extraHeaders?: Record<string, string>}} [optionsOrRetry=false] - 옵션 객체 또는 하위 호환용 boolean
     * @param {Record<string, string>} [extraHeadersArg] - 추가 헤더 (하위 호환용)
     * @returns {Promise<ApiResponse>}
     */
    static async get(endpoint, optionsOrRetry = false, extraHeadersArg = undefined) {
        // 하위 호환: 기존 boolean 호출 지원
        /** @type {{_isRetry?: boolean, signal?: AbortSignal, extraHeaders?: Record<string, string>}} */
        const options = typeof optionsOrRetry === 'boolean'
            ? { _isRetry: optionsOrRetry, extraHeaders: extraHeadersArg }
            : (optionsOrRetry || {});
        const { _isRetry = false, signal, extraHeaders } = options;

        logger.debug(`GET 요청: ${endpoint}`);

        try {
            // ErrorBoundary.withRetry를 사용하여 네트워크 에러/5xx/429 시 재시도
            return await ErrorBoundary.withRetry(async () => {
                /** @type {RequestInit} */
                const fetchOptions = {
                    method: 'GET',
                    headers: ApiService._buildHeaders(extraHeaders),
                    credentials: 'include'
                };
                if (signal) fetchOptions.signal = signal;
                const response = await fetch(`${API_BASE_URL}${ensureTrailingSlash(endpoint)}`, fetchOptions);
                // 5xx 서버 에러나 429 Too Many Requests는 재시도 대상
                if (response.status >= 500 || response.status === 429) {
                    const error = new Error(`Request failed with status ${response.status}`);
                    // @ts-ignore -- status 프로퍼티 동적 추가 (ErrorBoundary에서 참조)
                    error.status = response.status;
                    throw error;
                }
                return ApiService._handleResponse(response, 'GET', endpoint, {
                    retryFn: () => ApiService.get(endpoint, { _isRetry: true, signal, extraHeaders }),
                    _isRetry
                });
            }, {
                maxRetries: 2, // GET은 안전하므로 2번 재시도
                delay: 500,
                onRetry: (/** @type {number} */ attempt, /** @type {number} */ max, /** @type {Error} */ error) => {
                    logger.warn(`GET ${endpoint} 재시도 ${attempt}/${max}: ${error.message}`);
                }
            });
        } catch (error) {
            if (/** @type {Error} */ (error).name === 'AbortError') {
                return /** @type {any} */ ({ ok: false, aborted: true, data: null });
            }
            return ApiService._handleNetworkError(/** @type {Error} */ (error), 'GET', endpoint);
        }
    }
    /**
     * POST 요청 (JSON)
     * @param {string} endpoint - API 엔드포인트
     * @param {object} data - 요청 본문 데이터
     * @param {boolean} [_isRetry=false] - 401 refresh 후 재시도 여부 (내부용)
     * @returns {Promise<ApiResponse>}
     */
    static async post(endpoint, data, _isRetry = false) {
        logger.debug(`POST 요청: ${endpoint}`);
        try {
            const response = await fetch(`${API_BASE_URL}${ensureTrailingSlash(endpoint)}`, {
                method: 'POST',
                headers: ApiService._buildHeaders(),
                body: JSON.stringify(data),
                credentials: 'include'
            });
            return ApiService._handleResponse(response, 'POST', endpoint, {
                retryFn: () => ApiService.post(endpoint, data, true),
                _isRetry
            });
        } catch (error) {
            return ApiService._handleNetworkError(/** @type {Error} */ (error), 'POST', endpoint);
        }
    }
    /**
     * POST 요청 (FormData - 파일 업로드용)
     * @param {string} endpoint - API 엔드포인트
     * @param {FormData} formData - FormData 객체
     * @param {boolean} [_isRetry=false] - 401 refresh 후 재시도 여부 (내부용)
     * @returns {Promise<ApiResponse>}
     */
    static async postFormData(endpoint, formData, _isRetry = false) {
        logger.debug(`POST FormData 요청: ${endpoint}`);
        try {
            // FormData는 Content-Type을 브라우저가 자동 설정 (multipart/form-data boundary 포함)
            /** @type {Record<string, string>} */
            const headers = {};
            if (_accessToken) {
                headers['Authorization'] = `Bearer ${_accessToken}`;
            }
            const response = await fetch(`${API_BASE_URL}${ensureTrailingSlash(endpoint)}`, {
                method: 'POST',
                headers: headers,
                body: formData,
                credentials: 'include'
            });
            return ApiService._handleResponse(response, 'POST', endpoint, {
                retryFn: () => ApiService.postFormData(endpoint, formData, true),
                _isRetry
            });
        } catch (error) {
            return ApiService._handleNetworkError(/** @type {Error} */ (error), 'POST', endpoint);
        }
    }
    /**
     * PATCH 요청
     * @param {string} endpoint - API 엔드포인트
     * @param {object} [data={}] - 요청 본문 데이터
     * @param {boolean} [_isRetry=false] - 401 refresh 후 재시도 여부 (내부용)
     * @returns {Promise<ApiResponse>}
     */
    static async patch(endpoint, data = {}, _isRetry = false) {
        logger.debug(`PATCH 요청: ${endpoint}`);
        try {
            const response = await fetch(`${API_BASE_URL}${ensureTrailingSlash(endpoint)}`, {
                method: 'PATCH',
                headers: ApiService._buildHeaders(),
                body: JSON.stringify(data),
                credentials: 'include'
            });
            return ApiService._handleResponse(response, 'PATCH', endpoint, {
                retryFn: () => ApiService.patch(endpoint, data, true),
                _isRetry
            });
        } catch (error) {
            return ApiService._handleNetworkError(/** @type {Error} */ (error), 'PATCH', endpoint);
        }
    }
    /**
     * PUT 요청
     * @param {string} endpoint - API 엔드포인트
     * @param {object} data - 요청 본문 데이터
     * @param {boolean} [_isRetry=false] - 401 refresh 후 재시도 여부 (내부용)
     * @returns {Promise<ApiResponse>}
     */
    static async put(endpoint, data, _isRetry = false) {
        logger.debug(`PUT 요청: ${endpoint}`);
        try {
            const response = await fetch(`${API_BASE_URL}${ensureTrailingSlash(endpoint)}`, {
                method: 'PUT',
                headers: ApiService._buildHeaders(),
                body: JSON.stringify(data),
                credentials: 'include'
            });
            return ApiService._handleResponse(response, 'PUT', endpoint, {
                retryFn: () => ApiService.put(endpoint, data, true),
                _isRetry
            });
        } catch (error) {
            return ApiService._handleNetworkError(/** @type {Error} */ (error), 'PUT', endpoint);
        }
    }
    /**
     * DELETE 요청
     * @param {string} endpoint - API 엔드포인트
     * @param {object | null} [data=null] - 선택적 요청 본문 데이터
     * @param {boolean} [_isRetry=false] - 401 refresh 후 재시도 여부 (내부용)
     * @returns {Promise<ApiResponse>}
     */
    static async delete(endpoint, data = null, _isRetry = false) {
        logger.debug(`DELETE 요청: ${endpoint}`);
        try {
            /** @type {RequestInit} */
            const options = {
                method: 'DELETE',
                headers: ApiService._buildHeaders(),
                credentials: 'include'
            };
            if (data) {
                options.body = JSON.stringify(data);
            }
            const response = await fetch(`${API_BASE_URL}${ensureTrailingSlash(endpoint)}`, options);
            return ApiService._handleResponse(response, 'DELETE', endpoint, {
                retryFn: () => ApiService.delete(endpoint, data, true),
                _isRetry
            });
        } catch (error) {
            return ApiService._handleNetworkError(/** @type {Error} */ (error), 'DELETE', endpoint);
        }
    }
    /**
     * 응답 처리 공통 로직
     * 401 수신 시 silent refresh 시도 후 원래 요청을 재시도합니다.
     * 재시도도 실패하면 auth:session-expired 이벤트를 발생시킵니다.
     * @param {Response} response - fetch 응답 객체
     * @param {string} method - HTTP 메서드
     * @param {string} endpoint - API 엔드포인트
     * @param {{retryFn?: () => Promise<ApiResponse>, _isRetry?: boolean}} [options={}] - 추가 옵션
     * @returns {Promise<ApiResponse>}
     */
    static async _handleResponse(response, method = '', endpoint = '', options = {}) {
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
        // 응답 로깅 (304 Not Modified는 정상 캐시 응답)
        if (response.ok || response.status === 304) {
            logger.info(`${method} ${endpoint} 성공 (${response.status})`);
        } else {
            logger.error(`${method} ${endpoint} 실패 (${response.status})`, data);
        }
        // 401 처리: auth 엔드포인트가 아닌 경우 refresh 후 재시도
        const isAuthEndpoint = endpoint.includes('/auth/');
        if (response.status === 401 && !isAuthEndpoint && !options._isRetry) {
            logger.warn('401 감지 — silent refresh 시도');
            const refreshed = await ApiService._tryRefresh();
            if (refreshed && options.retryFn) {
                logger.info('Refresh 성공 — 원래 요청 재시도');
                return options.retryFn();
            }
            if (!refreshed) {
                logger.warn('Refresh 실패 — 세션 만료 이벤트 발생');
                window.dispatchEvent(new CustomEvent('auth:session-expired'));
            }
        }
        // 403 계정 정지: 본인 세션이 정지된 경우에만 이벤트 전파 (관리자 API 제외)
        const isAdminEndpoint = endpoint.includes('/v1/admin/');
        if (response.status === 403 && data?.detail?.error === 'account_suspended' && !isAdminEndpoint) {
            window.dispatchEvent(new CustomEvent('auth:account-suspended', {
                detail: data.detail
            }));
        }
        // 403 이메일 미인증: 배너 표시를 위한 이벤트 전파
        if (response.status === 403 && data?.detail?.error === 'email_not_verified') {
            window.dispatchEvent(new CustomEvent('auth:email-not-verified'));
        }
        /** @type {ApiResponse & {etag?: string}} */
        const result = {
            ok: response.ok,
            status: response.status,
            data: data
        };
        // ETag 헤더가 있으면 결과에 포함 (폴링 최적화용)
        const etag = response.headers.get('etag');
        if (etag) {
            result.etag = etag;
        }
        return result;
    }
    /**
     * 네트워크 에러 처리
     * @param {Error} error - 에러 객체
     * @param {string} method - HTTP 메서드
     * @param {string} endpoint - API 엔드포인트
     * @returns {ApiResponse<{message: string, _isNetworkError: boolean}>}
     */
    static _handleNetworkError(error, method, endpoint) {
        logger.error(`${method} ${endpoint} 네트워크 에러`, error);
        // 네트워크 에러는 백엔드 응답이 아니므로 ApiSuccessResponse 구조를 따르지 않음
        return /** @type {any} */ ({
            ok: false,
            status: 0,
            data: {
                message: '네트워크 연결을 확인해주세요.',
                _isNetworkError: true
            }
        });
    }
}

export default ApiService;
