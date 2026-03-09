// @ts-check
// js/models/NotificationModel.js
// 알림 관련 API 호출 관리

import ApiService from '../services/ApiService.js';
import { API_ENDPOINTS } from '../constants.js';

/**
 * 알림 관련 Model
 */
class NotificationModel {
    /**
     * 알림 목록 조회
     * @param {number} [offset=0] - 시작 위치
     * @param {number} [limit=20] - 조회 개수
     * @returns {Promise<ApiResponse<{notifications: Notification[], pagination: Pagination}>>}
     */
    static async getNotifications(offset = 0, limit = 20) {
        return ApiService.get(
            `${API_ENDPOINTS.NOTIFICATIONS.ROOT}?offset=${offset}&limit=${limit}`
        );
    }

    /**
     * 읽지 않은 알림 수 + 최신 알림 조회
     * @param {string|null} [etag=null] - 이전 ETag (변경 없으면 304 반환)
     * @returns {Promise<ApiResponseWithETag<UnreadCountWithLatest>>}
     */
    static async getUnreadCount(etag = null) {
        const result = await ApiService.get(
            API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT,
            false,
            etag ? { 'If-None-Match': etag } : undefined
        );
        return /** @type {ApiResponseWithETag<UnreadCountWithLatest>} */ (result);
    }

    /**
     * 알림 읽음 처리
     * @param {number} id - 알림 ID
     * @returns {Promise<ApiResponse<void>>}
     */
    static async markAsRead(id) {
        return ApiService.patch(API_ENDPOINTS.NOTIFICATIONS.READ(id), {});
    }

    /**
     * 모든 알림 읽음 처리
     * @returns {Promise<ApiResponse<void>>}
     */
    static async markAllAsRead() {
        return ApiService.patch(API_ENDPOINTS.NOTIFICATIONS.READ_ALL, {});
    }

    /**
     * 알림 삭제
     * @param {number} id - 알림 ID
     * @returns {Promise<ApiResponse<void>>}
     */
    static async deleteNotification(id) {
        return ApiService.delete(API_ENDPOINTS.NOTIFICATIONS.DELETE(id));
    }
}

export default NotificationModel;
