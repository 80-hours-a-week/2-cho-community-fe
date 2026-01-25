// js/models/CommentModel.js
// 댓글 관련 API 호출 관리

import Api from './api.js';

/**
 * 댓글 관련 Model
 */
class CommentModel {
    /**
     * 댓글 작성
     * @param {string|number} postId - 게시글 ID
     * @param {string} content - 댓글 내용
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async createComment(postId, content) {
        return Api.post(`/v1/posts/${postId}/comments`, { content });
    }

    /**
     * 댓글 수정
     * @param {string|number} postId - 게시글 ID
     * @param {string|number} commentId - 댓글 ID
     * @param {string} content - 수정할 댓글 내용
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async updateComment(postId, commentId, content) {
        return Api.put(`/v1/posts/${postId}/comments/${commentId}`, { content });
    }

    /**
     * 댓글 삭제
     * @param {string|number} postId - 게시글 ID
     * @param {string|number} commentId - 댓글 ID
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async deleteComment(postId, commentId) {
        return Api.delete(`/v1/posts/${postId}/comments/${commentId}`);
    }
}

export default CommentModel;
