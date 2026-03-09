// @ts-check
// js/models/DMModel.js
// DM(쪽지) 관련 API 호출 관리

import ApiService from '../services/ApiService.js';
import { API_ENDPOINTS } from '../constants.js';

/**
 * DM 관련 Model
 */
class DMModel {
    /**
     * 대화 목록 조회
     * @param {number} [offset=0] - 시작 위치
     * @param {number} [limit=20] - 조회 개수
     * @returns {Promise<ApiResponse<{conversations: DMConversation[], pagination: Pagination}>>}
     */
    static async getConversations(offset = 0, limit = 20) {
        return ApiService.get(
            `${API_ENDPOINTS.DMS.ROOT}?offset=${offset}&limit=${limit}`
        );
    }

    /**
     * 새 대화 생성
     * @param {number} recipientId - 상대방 사용자 ID
     * @returns {Promise<ApiResponse<CreateConversationResponse>>}
     */
    static async createConversation(recipientId) {
        return ApiService.post(API_ENDPOINTS.DMS.ROOT, { recipient_id: recipientId });
    }

    /**
     * 대화 메시지 목록 조회
     * @param {number} conversationId - 대화 ID
     * @param {number} [offset=0] - 시작 위치
     * @param {number} [limit=50] - 조회 개수
     * @returns {Promise<ApiResponse<DMConversationDetail>>}
     */
    static async getMessages(conversationId, offset = 0, limit = 50) {
        return ApiService.get(
            `${API_ENDPOINTS.DMS.DETAIL(conversationId)}?offset=${offset}&limit=${limit}`
        );
    }

    /**
     * 메시지 전송
     * @param {number} conversationId - 대화 ID
     * @param {string} content - 메시지 내용
     * @returns {Promise<ApiResponse<DMMessage>>}
     */
    static async sendMessage(conversationId, content) {
        return ApiService.post(
            API_ENDPOINTS.DMS.MESSAGES(conversationId),
            { content }
        );
    }

    /**
     * 대화 읽음 처리
     * @param {number} conversationId - 대화 ID
     * @returns {Promise<ApiResponse<void>>}
     */
    static async markRead(conversationId) {
        return ApiService.patch(API_ENDPOINTS.DMS.READ(conversationId), {});
    }

    /**
     * 대화 삭제
     * @param {number} conversationId - 대화 ID
     * @returns {Promise<ApiResponse<void>>}
     */
    static async deleteConversation(conversationId) {
        return ApiService.delete(API_ENDPOINTS.DMS.DETAIL(conversationId));
    }

    /**
     * 메시지 삭제
     * @param {number} conversationId - 대화 ID
     * @param {number} messageId - 메시지 ID
     * @returns {Promise<ApiResponse<void>>}
     */
    static async deleteMessage(conversationId, messageId) {
        return ApiService.delete(
            API_ENDPOINTS.DMS.DELETE_MESSAGE(conversationId, messageId)
        );
    }

    /**
     * 읽지 않은 메시지 수 조회
     * @returns {Promise<ApiResponse<UnreadCountResponse>>}
     */
    static async getUnreadCount() {
        return ApiService.get(API_ENDPOINTS.DMS.UNREAD_COUNT);
    }
}

export default DMModel;
