// js/services/ApiService.js
// HTTP 클라이언트 서비스 - 공통 API 호출 로직

import { API_BASE_URL } from '../config.js';
import Logger from '../utils/Logger.js';

const logger = Logger.createLogger('ApiService');

/**
 * HTTP 요청을 처리하는 API 서비스 클래스
 */
class ApiService {
    /**
     * GET 요청
     * @param {string} endpoint - API 엔드포인트 (예: '/v1/users/me')
     * @returns {Promise<any>} - 응답 데이터
     */
    static async get(endpoint) {
        logger.debug(`GET 요청: ${endpoint}`);
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            return ApiService._handleResponse(response, 'GET', endpoint);
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
                headers: { 'Content-Type': 'application/json' },
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
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
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
                headers: { 'Content-Type': 'application/json' },
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
                headers: { 'Content-Type': 'application/json' },
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
                headers: { 'Content-Type': 'application/json' },
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
            // 사용자에게 알림을 줄 수 있다면 좋겠지만, Service 레벨에서 View를 건드리는 것은 의존성 위반.
            // 일단 로그인 페이지로 리다이렉트 ( SPA가 아니므로 location.href 사용 )
            // 무한 루프 방지를 위해 현재 페이지가 login이 아닐 때만
            if (!location.pathname.includes('/login')) {
                // 토스트 표시를 위해 URL 파라미터 전달?
                // location.href = '/login?expired=true';
                // 로거로 남기고 리다이렉트
                logger.warn('세션 만료 감지 - 로그인 페이지로 이동');
                location.href = '/login?session=expired';
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
