// @ts-check
// js/models/ReputationModel.js
// 평판 API 모델

import ApiService from '../services/ApiService.js';
import { API_ENDPOINTS } from '../constants.js';

class ReputationModel {
    /**
     * 사용자 평판 조회
     * @param {string|number} userId
     */
    static async getUserReputation(userId) {
        return ApiService.get(`${API_ENDPOINTS.REPUTATION.USER(userId)}/`);
    }

    /**
     * 사용자 평판 히스토리 조회
     * @param {string|number} userId
     * @param {number} offset
     * @param {number} limit
     */
    static async getReputationHistory(userId, offset = 0, limit = 20) {
        return ApiService.get(
            `${API_ENDPOINTS.REPUTATION.HISTORY(userId)}/?offset=${offset}&limit=${limit}`
        );
    }

    /**
     * 사용자 보유 배지 조회
     * @param {string|number} userId
     */
    static async getUserBadges(userId) {
        return ApiService.get(`${API_ENDPOINTS.REPUTATION.USER_BADGES(userId)}/`);
    }

    /**
     * 전체 배지 목록 조회
     */
    static async getAllBadges() {
        return ApiService.get(`${API_ENDPOINTS.REPUTATION.ALL_BADGES}/`);
    }

    /**
     * 신뢰 등급 목록 조회
     */
    static async getTrustLevels() {
        return ApiService.get(`${API_ENDPOINTS.REPUTATION.TRUST_LEVELS}/`);
    }
}

export default ReputationModel;
