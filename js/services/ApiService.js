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
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        return ApiService._handleResponse(response, 'GET', endpoint);
    }

    /**
     * POST 요청 (JSON)
     * @param {string} endpoint - API 엔드포인트
     * @param {object} data - 요청 본문 데이터
     * @returns {Promise<any>} - 응답 데이터
     */
    static async post(endpoint, data) {
        logger.debug(`POST 요청: ${endpoint}`);
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        return ApiService._handleResponse(response, 'POST', endpoint);
    }

    /**
     * POST 요청 (FormData - 파일 업로드용)
     * @param {string} endpoint - API 엔드포인트
     * @param {FormData} formData - FormData 객체
     * @returns {Promise<any>} - 응답 데이터
     */
    static async postFormData(endpoint, formData) {
        logger.debug(`POST FormData 요청: ${endpoint}`);
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        return ApiService._handleResponse(response, 'POST', endpoint);
    }

    /**
     * PATCH 요청
     * @param {string} endpoint - API 엔드포인트
     * @param {object} data - 요청 본문 데이터
     * @returns {Promise<any>} - 응답 데이터
     */
    static async patch(endpoint, data) {
        logger.debug(`PATCH 요청: ${endpoint}`);
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        return ApiService._handleResponse(response, 'PATCH', endpoint);
    }

    /**
     * PUT 요청
     * @param {string} endpoint - API 엔드포인트
     * @param {object} data - 요청 본문 데이터
     * @returns {Promise<any>} - 응답 데이터
     */
    static async put(endpoint, data) {
        logger.debug(`PUT 요청: ${endpoint}`);
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        return ApiService._handleResponse(response, 'PUT', endpoint);
    }

    /**
     * DELETE 요청
     * @param {string} endpoint - API 엔드포인트
     * @param {object} [data] - 선택적 요청 본문 데이터
     * @returns {Promise<any>} - 응답 데이터
     */
    static async delete(endpoint, data = null) {
        logger.debug(`DELETE 요청: ${endpoint}`);
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

        // 응답 본문이 있는 경우에만 JSON 파싱
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch (e) {
                logger.warn(`JSON 파싱 실패: ${method} ${endpoint}`);
                data = null;
            }
        }

        // 응답 로깅
        if (response.ok) {
            logger.info(`${method} ${endpoint} 성공 (${response.status})`);
        } else {
            logger.error(`${method} ${endpoint} 실패 (${response.status})`, data);
        }

        return {
            ok: response.ok,
            status: response.status,
            data: data
        };
    }
}

export default ApiService;
