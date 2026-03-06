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
     * @param {string|null} [search=null] - 검색어
     * @param {string} [sort='latest'] - 정렬 기준
     * @param {number|null} [authorId=null] - 작성자 ID 필터
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async getPosts(offset = 0, limit = 10, search = null, sort = 'latest', authorId = null, categoryId = null) {
        let url = `${API_ENDPOINTS.POSTS.ROOT}/?offset=${offset}&limit=${limit}&sort=${sort}`;
        if (search) {
            url += `&search=${encodeURIComponent(search)}`;
        }
        if (authorId) {
            url += `&author_id=${authorId}`;
        }
        if (categoryId) {
            url += `&category_id=${categoryId}`;
        }
        return ApiService.get(url);
    }

    /**
     * 게시글 상세 조회
     * @param {string|number} postId - 게시글 ID
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async getPost(postId, commentSort = 'oldest') {
        let url = `${API_ENDPOINTS.POSTS.ROOT}/${postId}`;
        if (commentSort !== 'oldest') {
            url += `?comment_sort=${commentSort}`;
        }
        return ApiService.get(url);
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
     * 게시글 북마크
     * @param {string|number} postId - 게시글 ID
     */
    static async bookmarkPost(postId) {
        return ApiService.post(API_ENDPOINTS.BOOKMARKS.ROOT(postId), {});
    }

    /**
     * 게시글 북마크 해제
     * @param {string|number} postId - 게시글 ID
     */
    static async unbookmarkPost(postId) {
        return ApiService.delete(API_ENDPOINTS.BOOKMARKS.ROOT(postId));
    }

    /**
     * 게시글 고정
     * @param {string|number} postId - 게시글 ID
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async pinPost(postId) {
        return ApiService.patch(API_ENDPOINTS.POSTS.PIN(postId), {});
    }

    /**
     * 게시글 고정 해제
     * @param {string|number} postId - 게시글 ID
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async unpinPost(postId) {
        return ApiService.delete(API_ENDPOINTS.POSTS.PIN(postId));
    }

    /**
     * 태그 자동완성 검색
     * @param {string} search - 검색어
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async searchTags(search) {
        return ApiService.get(`${API_ENDPOINTS.TAGS.ROOT}?search=${encodeURIComponent(search)}`);
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
