// js/models/api.js
// HTTP 클라이언트 추상화 - 공통 API 호출 로직

import { API_BASE_URL } from '../config.js';

/**
 * HTTP 요청을 처리하는 API 클래스
 */
class Api {
    /**
     * GET 요청
     * @param {string} endpoint - API 엔드포인트 (예: '/v1/users/me')
     * @returns {Promise<any>} - 응답 데이터
     */
    static async get(endpoint) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        return Api._handleResponse(response);
    }

    /**
     * POST 요청 (JSON)
     * @param {string} endpoint - API 엔드포인트
     * @param {object} data - 요청 본문 데이터
     * @returns {Promise<any>} - 응답 데이터
     */
    static async post(endpoint, data) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        return Api._handleResponse(response);
    }

    /**
     * POST 요청 (FormData - 파일 업로드용)
     * @param {string} endpoint - API 엔드포인트
     * @param {FormData} formData - FormData 객체
     * @returns {Promise<any>} - 응답 데이터
     */
    static async postFormData(endpoint, formData) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        return Api._handleResponse(response);
    }

    /**
     * PATCH 요청
     * @param {string} endpoint - API 엔드포인트
     * @param {object} data - 요청 본문 데이터
     * @returns {Promise<any>} - 응답 데이터
     */
    static async patch(endpoint, data) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        return Api._handleResponse(response);
    }

    /**
     * PUT 요청
     * @param {string} endpoint - API 엔드포인트
     * @param {object} data - 요청 본문 데이터
     * @returns {Promise<any>} - 응답 데이터
     */
    static async put(endpoint, data) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        return Api._handleResponse(response);
    }

    /**
     * DELETE 요청
     * @param {string} endpoint - API 엔드포인트
     * @param {object} [data] - 선택적 요청 본문 데이터
     * @returns {Promise<any>} - 응답 데이터
     */
    static async delete(endpoint, data = null) {
        const options = {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        };
        if (data) {
            options.body = JSON.stringify(data);
        }
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        return Api._handleResponse(response);
    }

    /**
     * 응답 처리 공통 로직
     * @param {Response} response - fetch 응답 객체
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async _handleResponse(response) {
        let data = null;

        // 응답 본문이 있는 경우에만 JSON 파싱
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch (e) {
                data = null;
            }
        }

        return {
            ok: response.ok,
            status: response.status,
            data: data
        };
    }
}

export default Api;
