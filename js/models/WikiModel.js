// @ts-check
// js/models/WikiModel.js
// 위키 API 모델

import ApiService from '../services/ApiService.js';
import { API_ENDPOINTS } from '../constants.js';

class WikiModel {
    /**
     * 위키 페이지 목록 조회
     * @param {number} offset
     * @param {number} limit
     * @param {string} sort
     * @param {string|null} tag
     * @param {string|null} search
     */
    static async getWikiPages(offset = 0, limit = 10, sort = 'latest', tag = null, search = null) {
        let url = `${API_ENDPOINTS.WIKI.ROOT}/?offset=${offset}&limit=${limit}&sort=${sort}`;
        if (tag) url += `&tag=${encodeURIComponent(tag)}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        return ApiService.get(url);
    }

    /**
     * 위키 인기 태그 조회 (상위 N개)
     * @param {number} limit
     */
    static async getPopularTags(limit = 10) {
        return ApiService.get(`${API_ENDPOINTS.WIKI.ROOT}/tags/popular?limit=${limit}`);
    }

    /**
     * 위키 페이지 상세 조회
     * @param {string} slug
     */
    static async getWikiPage(slug) {
        return ApiService.get(`${API_ENDPOINTS.WIKI.ROOT}/${slug}`);
    }

    /**
     * 위키 페이지 생성
     * @param {object} data
     */
    static async createWikiPage(data) {
        return ApiService.post(`${API_ENDPOINTS.WIKI.ROOT}/`, data);
    }

    /**
     * 위키 페이지 편집
     * @param {string} slug
     * @param {object} data
     */
    static async updateWikiPage(slug, data) {
        return ApiService.put(`${API_ENDPOINTS.WIKI.ROOT}/${slug}`, data);
    }

    /**
     * 위키 페이지 삭제
     * @param {string} slug
     */
    static async deleteWikiPage(slug) {
        return ApiService.delete(`${API_ENDPOINTS.WIKI.ROOT}/${slug}`);
    }

    /**
     * 위키 페이지 편집 히스토리 조회
     * @param {string} slug
     * @param {number} offset
     * @param {number} limit
     */
    static async getHistory(slug, offset = 0, limit = 20) {
        return ApiService.get(
            `${API_ENDPOINTS.WIKI.HISTORY(slug)}?offset=${offset}&limit=${limit}`
        );
    }

    /**
     * 특정 리비전 조회
     * @param {string} slug
     * @param {number} revisionNumber
     */
    static async getRevision(slug, revisionNumber) {
        return ApiService.get(API_ENDPOINTS.WIKI.REVISION(slug, revisionNumber));
    }

    /**
     * 두 리비전 간 diff 조회
     * @param {string} slug
     * @param {number} fromRev
     * @param {number} toRev
     */
    static async getDiff(slug, fromRev, toRev) {
        return ApiService.get(
            `${API_ENDPOINTS.WIKI.DIFF(slug)}?from=${fromRev}&to=${toRev}`
        );
    }

    /**
     * 특정 리비전으로 롤백
     * @param {string} slug
     * @param {number} revisionNumber
     */
    static async rollback(slug, revisionNumber) {
        return ApiService.post(API_ENDPOINTS.WIKI.ROLLBACK(slug, revisionNumber));
    }
}

export default WikiModel;
