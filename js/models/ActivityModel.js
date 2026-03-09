// @ts-check
// js/models/ActivityModel.js
// 내 활동 관련 API 호출 관리

import ApiService from '../services/ApiService.js';
import { API_ENDPOINTS } from '../constants.js';

/**
 * 내 활동 관련 Model
 */
class ActivityModel {
    /**
     * 내가 쓴 게시글 목록 조회
     * @param {number} [offset=0] - 시작 위치
     * @param {number} [limit=10] - 조회 개수
     * @returns {Promise<ApiResponse<{posts: PostSummary[], pagination: Pagination}>>}
     */
    static async getMyPosts(offset = 0, limit = 10) {
        return ApiService.get(
            `${API_ENDPOINTS.ACTIVITY.MY_POSTS}?offset=${offset}&limit=${limit}`
        );
    }

    /**
     * 내가 쓴 댓글 목록 조회
     * @param {number} [offset=0] - 시작 위치
     * @param {number} [limit=10] - 조회 개수
     * @returns {Promise<ApiResponse<{comments: MyComment[], pagination: Pagination}>>}
     */
    static async getMyComments(offset = 0, limit = 10) {
        return ApiService.get(
            `${API_ENDPOINTS.ACTIVITY.MY_COMMENTS}?offset=${offset}&limit=${limit}`
        );
    }

    /**
     * 좋아요한 게시글 목록 조회
     * @param {number} [offset=0] - 시작 위치
     * @param {number} [limit=10] - 조회 개수
     * @returns {Promise<ApiResponse<{posts: PostSummary[], pagination: Pagination}>>}
     */
    static async getMyLikes(offset = 0, limit = 10) {
        return ApiService.get(
            `${API_ENDPOINTS.ACTIVITY.MY_LIKES}?offset=${offset}&limit=${limit}`
        );
    }

    /**
     * 북마크한 게시글 목록 조회
     * @param {number} [offset=0] - 시작 위치
     * @param {number} [limit=10] - 조회 개수
     * @returns {Promise<ApiResponse<{posts: PostSummary[], pagination: Pagination}>>}
     */
    static async getMyBookmarks(offset = 0, limit = 10) {
        return ApiService.get(
            `${API_ENDPOINTS.ACTIVITY.MY_BOOKMARKS}?offset=${offset}&limit=${limit}`
        );
    }
}

export default ActivityModel;
