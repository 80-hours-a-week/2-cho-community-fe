// @ts-check
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
     * @param {number|null} [categoryId=null] - 카테고리 ID 필터
     * @param {string|null} [tag=null] - 태그 필터
     * @param {boolean} [following=false] - 팔로잉 피드 필터
     * @param {{signal?: AbortSignal}} [options={}] - 추가 옵션 (AbortSignal 등)
     * @returns {Promise<ApiResponse<{posts: PostSummary[], pagination: Pagination}>>}
     */
    static async getPosts(offset = 0, limit = 10, search = null, sort = 'latest', authorId = null, categoryId = null, tag = null, following = false, options = {}) {
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
        if (tag) {
            url += `&tag=${encodeURIComponent(tag)}`;
        }
        if (following) {
            url += `&following=true`;
        }
        return ApiService.get(url, options);
    }

    /**
     * 게시글 상세 조회
     * @param {string|number} postId - 게시글 ID
     * @param {string} [commentSort='oldest'] - 댓글 정렬 기준
     * @returns {Promise<ApiResponse<PostDetail>>}
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
     * @param {{title: string, content: string, category_id: number, image_urls?: string[], tags?: string[], poll?: {question: string, options: string[], expires_in_hours?: number}}} data - 게시글 데이터
     * @returns {Promise<ApiResponse<CreatePostResponse>>}
     */
    static async createPost(data) {
        return ApiService.post(`${API_ENDPOINTS.POSTS.ROOT}/`, data);
    }

    /**
     * 게시글 수정
     * @param {string|number} postId - 게시글 ID
     * @param {{title?: string, content?: string, category_id?: number, image_urls?: string[], tags?: string[]}} data - 수정할 데이터
     * @returns {Promise<ApiResponse<UpdatePostResponse>>}
     */
    static async updatePost(postId, data) {
        return ApiService.patch(`${API_ENDPOINTS.POSTS.ROOT}/${postId}`, data);
    }

    /**
     * 게시글 삭제
     * @param {string|number} postId - 게시글 ID
     * @returns {Promise<ApiResponse<void>>}
     */
    static async deletePost(postId) {
        return ApiService.delete(`${API_ENDPOINTS.POSTS.ROOT}/${postId}`);
    }

    /**
     * 게시글 좋아요
     * @param {string|number} postId - 게시글 ID
     * @returns {Promise<ApiResponse<void>>}
     */
    static async likePost(postId) {
        return ApiService.post(`${API_ENDPOINTS.POSTS.ROOT}/${postId}/likes`, {});
    }

    /**
     * 게시글 좋아요 취소
     * @param {string|number} postId - 게시글 ID
     * @returns {Promise<ApiResponse<void>>}
     */
    static async unlikePost(postId) {
        return ApiService.delete(`${API_ENDPOINTS.POSTS.ROOT}/${postId}/likes`);
    }

    /**
     * 게시글 북마크
     * @param {string|number} postId - 게시글 ID
     * @returns {Promise<ApiResponse<void>>}
     */
    static async bookmarkPost(postId) {
        return ApiService.post(API_ENDPOINTS.BOOKMARKS.ROOT(postId), {});
    }

    /**
     * 게시글 북마크 해제
     * @param {string|number} postId - 게시글 ID
     * @returns {Promise<ApiResponse<void>>}
     */
    static async unbookmarkPost(postId) {
        return ApiService.delete(API_ENDPOINTS.BOOKMARKS.ROOT(postId));
    }

    /**
     * 게시글 고정
     * @param {string|number} postId - 게시글 ID
     * @returns {Promise<ApiResponse<void>>}
     */
    static async pinPost(postId) {
        return ApiService.patch(API_ENDPOINTS.POSTS.PIN(postId), {});
    }

    /**
     * 게시글 고정 해제
     * @param {string|number} postId - 게시글 ID
     * @returns {Promise<ApiResponse<void>>}
     */
    static async unpinPost(postId) {
        return ApiService.delete(API_ENDPOINTS.POSTS.PIN(postId));
    }

    /**
     * 태그 자동완성 검색
     * @param {string} search - 검색어
     * @returns {Promise<ApiResponse<TagSearchResult[]>>}
     */
    static async searchTags(search) {
        return ApiService.get(`${API_ENDPOINTS.TAGS.ROOT}?search=${encodeURIComponent(search)}`);
    }

    /**
     * 투표 참여
     * @param {string|number} postId - 게시글 ID
     * @param {number} optionId - 선택한 옵션 ID
     * @returns {Promise<ApiResponse<void>>}
     */
    static async votePoll(postId, optionId) {
        return ApiService.post(API_ENDPOINTS.POSTS.VOTE_POLL(postId), { option_id: optionId });
    }

    /**
     * 투표 취소
     * @param {string|number} postId - 게시글 ID
     * @returns {Promise<ApiResponse<void>>}
     */
    static async cancelPollVote(postId) {
        return ApiService.delete(API_ENDPOINTS.POSTS.VOTE_POLL(postId));
    }

    /**
     * 투표 변경
     * @param {string|number} postId - 게시글 ID
     * @param {number} optionId - 변경할 옵션 ID
     * @returns {Promise<ApiResponse<void>>}
     */
    static async changePollVote(postId, optionId) {
        return ApiService.put(API_ENDPOINTS.POSTS.VOTE_POLL(postId), { option_id: optionId });
    }

    /**
     * 연관 게시글 조회
     * @param {string|number} postId - 게시글 ID
     * @param {number} [limit=5] - 조회 개수
     * @returns {Promise<ApiResponse<RelatedPost[]>>}
     */
    static async getRelatedPosts(postId, limit = 5) {
        return ApiService.get(`${API_ENDPOINTS.POSTS.RELATED(postId)}?limit=${limit}`);
    }

    /**
     * 답변 채택
     * @param {string|number} postId - 게시글 ID
     * @param {string|number} commentId - 채택할 댓글 ID
     * @returns {Promise<ApiResponse<void>>}
     */
    static async setAcceptedAnswer(postId, commentId) {
        return ApiService.patch(API_ENDPOINTS.POSTS.ACCEPTED_ANSWER(postId), { comment_id: commentId });
    }

    /**
     * 답변 채택 해제
     * @param {string|number} postId - 게시글 ID
     * @returns {Promise<ApiResponse<void>>}
     */
    static async unsetAcceptedAnswer(postId) {
        return ApiService.delete(API_ENDPOINTS.POSTS.ACCEPTED_ANSWER(postId));
    }

    /**
     * 이미지 업로드
     * @param {File} file - 이미지 파일
     * @returns {Promise<ApiResponse<ImageUploadResponse>>}
     */
    static async uploadImage(file) {
        const formData = new FormData();
        formData.append('file', file);
        return ApiService.postFormData(API_ENDPOINTS.POSTS.IMAGE, formData);
    }

    /**
     * 게시글 구독 상태 조회
     * @param {string|number} postId - 게시글 ID
     * @returns {Promise<ApiResponse<{level: string}>>}
     */
    static async getSubscription(postId) {
        return ApiService.get(API_ENDPOINTS.POSTS.SUBSCRIPTION(postId));
    }

    /**
     * 게시글 구독 설정
     * @param {string|number} postId - 게시글 ID
     * @param {string} level - 구독 레벨 (watching, muted)
     * @returns {Promise<ApiResponse<void>>}
     */
    static async setSubscription(postId, level) {
        return ApiService.put(API_ENDPOINTS.POSTS.SUBSCRIPTION(postId), { level });
    }

    /**
     * 게시글 구독 해제
     * @param {string|number} postId - 게시글 ID
     * @returns {Promise<ApiResponse<void>>}
     */
    static async deleteSubscription(postId) {
        return ApiService.delete(API_ENDPOINTS.POSTS.SUBSCRIPTION(postId));
    }
}

export default PostModel;
