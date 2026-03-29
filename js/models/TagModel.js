// @ts-check
// js/models/TagModel.js
// 태그 API 모델

import ApiService from '../services/ApiService.js';
import { API_ENDPOINTS } from '../constants.js';

class TagModel {
    /**
     * 태그 상세 조회
     * @param {string} tagName - 태그 이름
     */
    static async getTagDetail(tagName) {
        return ApiService.get(API_ENDPOINTS.TAGS.DETAIL(tagName));
    }

    /**
     * 태그 설명 수정
     * @param {string} tagName - 태그 이름
     * @param {object} data - { description, body }
     */
    static async updateTag(tagName, data) {
        return ApiService.put(API_ENDPOINTS.TAGS.DETAIL(tagName), data);
    }

    /**
     * 태그 검색
     * @param {string} search - 검색어
     * @param {number} limit - 최대 결과 수
     */
    static async searchTags(search, limit = 10) {
        let url = `${API_ENDPOINTS.TAGS.ROOT}/?limit=${limit}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        return ApiService.get(url);
    }
}

export default TagModel;
