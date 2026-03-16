// @ts-check
// js/models/PackageModel.js
// 패키지 API 모델

import ApiService from '../services/ApiService.js';
import { API_ENDPOINTS } from '../constants.js';

class PackageModel {
    /**
     * 패키지 목록 조회
     * @param {number} offset
     * @param {number} limit
     * @param {string} sort
     * @param {string|null} category
     * @param {string|null} search
     */
    static async getPackages(offset = 0, limit = 10, sort = 'latest', category = null, search = null) {
        let url = `${API_ENDPOINTS.PACKAGES.ROOT}/?offset=${offset}&limit=${limit}&sort=${sort}`;
        if (category) url += `&category=${encodeURIComponent(category)}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        return ApiService.get(url);
    }

    /**
     * 패키지 상세 조회
     * @param {string|number} packageId
     */
    static async getPackage(packageId) {
        return ApiService.get(`${API_ENDPOINTS.PACKAGES.ROOT}/${packageId}`);
    }

    /**
     * 패키지 등록
     * @param {object} data
     */
    static async createPackage(data) {
        return ApiService.post(`${API_ENDPOINTS.PACKAGES.ROOT}/`, data);
    }

    /**
     * 패키지 수정
     * @param {string|number} packageId
     * @param {object} data
     */
    static async updatePackage(packageId, data) {
        return ApiService.put(`${API_ENDPOINTS.PACKAGES.ROOT}/${packageId}`, data);
    }

    /**
     * 리뷰 목록 조회
     * @param {string|number} packageId
     * @param {number} offset
     * @param {number} limit
     * @param {string} sort
     */
    static async getReviews(packageId, offset = 0, limit = 10, sort = 'latest') {
        return ApiService.get(
            `${API_ENDPOINTS.PACKAGES.ROOT}/${packageId}/reviews/?offset=${offset}&limit=${limit}&sort=${sort}`
        );
    }

    /**
     * 리뷰 작성
     * @param {string|number} packageId
     * @param {object} data
     */
    static async createReview(packageId, data) {
        return ApiService.post(`${API_ENDPOINTS.PACKAGES.ROOT}/${packageId}/reviews/`, data);
    }

    /**
     * 리뷰 수정
     * @param {string|number} packageId
     * @param {string|number} reviewId
     * @param {object} data
     */
    static async updateReview(packageId, reviewId, data) {
        return ApiService.put(`${API_ENDPOINTS.PACKAGES.ROOT}/${packageId}/reviews/${reviewId}`, data);
    }

    /**
     * 리뷰 삭제
     * @param {string|number} packageId
     * @param {string|number} reviewId
     */
    static async deleteReview(packageId, reviewId) {
        return ApiService.delete(`${API_ENDPOINTS.PACKAGES.ROOT}/${packageId}/reviews/${reviewId}`);
    }
}

export default PackageModel;
