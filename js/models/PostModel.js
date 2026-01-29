// js/models/PostModel.js
// 게시글 관련 API 호출 관리

import ApiService from '../services/ApiService.js';
import { API_ENDPOINTS } from '../constants.js';

/**
 * 게시글 관련 Model
 */
class PostModel {
    /**
     * 게시글 목록 조회
     * @param {number} [offset=0] - 시작 위치
     * @param {number} [limit=10] - 조회 개수
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async getPosts(offset = 0, limit = 10) {
        return ApiService.get(`${API_ENDPOINTS.POSTS.ROOT}/?offset=${offset}&limit=${limit}`);
    }

    /**
     * 게시글 상세 조회
     * @param {string|number} postId - 게시글 ID
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async getPost(postId) {
        return ApiService.get(`${API_ENDPOINTS.POSTS.ROOT}/${postId}`);
    }

    /**
     * 게시글 작성
     * @param {object} data - 게시글 데이터 (title, content, image_urls)
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async createPost(data) {
        return ApiService.post(`${API_ENDPOINTS.POSTS.ROOT}/`, data);
    }

    /**
     * 게시글 수정
     * @param {string|number} postId - 게시글 ID
     * @param {object} data - 수정할 데이터 (title, content)
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async updatePost(postId, data) {
        return ApiService.patch(`${API_ENDPOINTS.POSTS.ROOT}/${postId}`, data);
    }

    /**
     * 게시글 삭제
     * @param {string|number} postId - 게시글 ID
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async deletePost(postId) {
        return ApiService.delete(`${API_ENDPOINTS.POSTS.ROOT}/${postId}`);
    }

    /**
     * 게시글 좋아요
     * @param {string|number} postId - 게시글 ID
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async likePost(postId) {
        return ApiService.post(`${API_ENDPOINTS.POSTS.ROOT}/${postId}/likes`, {});
    }

    /**
     * 게시글 좋아요 취소
     * @param {string|number} postId - 게시글 ID
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async unlikePost(postId) {
        return ApiService.delete(`${API_ENDPOINTS.POSTS.ROOT}/${postId}/likes`);
    }

    /**
     * 이미지 업로드
     * @param {File} file - 이미지 파일
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async uploadImage(file) {
        const formData = new FormData();
        formData.append('file', file);
        return ApiService.postFormData(API_ENDPOINTS.POSTS.IMAGE, formData);
    }
}

export default PostModel;
