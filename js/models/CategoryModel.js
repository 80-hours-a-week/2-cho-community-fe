// @ts-check
// js/models/CategoryModel.js
// 카테고리 관련 API 호출 관리

import ApiService from '../services/ApiService.js';
import { API_ENDPOINTS } from '../constants.js';

/**
 * 카테고리 관련 Model
 */
class CategoryModel {
    /**
     * 카테고리 목록 조회
     * @returns {Promise<ApiResponse<Category[]>>}
     */
    static async getCategories() {
        return ApiService.get(`${API_ENDPOINTS.CATEGORIES.ROOT}/`);
    }
}

export default CategoryModel;
