// @ts-check
// js/models/AdminModel.js
// 관리자 대시보드 API 호출 관리

import ApiService from '../services/ApiService.js';
import { API_ENDPOINTS } from '../constants.js';

/**
 * 관리자 대시보드 Model
 */
class AdminModel {
    /**
     * 대시보드 요약 통계 조회
     * @returns {Promise<ApiResponse<{summary: DashboardSummary, daily_stats: DailyStats[]}>>}
     */
    static async getDashboard() {
        return ApiService.get(API_ENDPOINTS.ADMIN.DASHBOARD);
    }

    /**
     * 사용자 목록 조회 (관리자)
     * @param {number} [offset=0] - 시작 위치
     * @param {number} [limit=20] - 조회 개수
     * @param {string} [search=''] - 검색어 (닉네임/이메일)
     * @returns {Promise<ApiResponse<{users: AdminUserItem[], pagination: Pagination}>>}
     */
    static async getUsers(offset = 0, limit = 20, search = '') {
        let url = `${API_ENDPOINTS.ADMIN.USERS}?offset=${offset}&limit=${limit}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        return ApiService.get(url);
    }

    /**
     * 사용자 정지 (관리자)
     * @param {number} userId - 사용자 ID
     * @param {number} durationDays - 정지 기간 (일)
     * @param {string} reason - 정지 사유
     * @returns {Promise<ApiResponse<void>>}
     */
    static async suspendUser(userId, durationDays, reason) {
        return ApiService.post(API_ENDPOINTS.ADMIN.SUSPEND_USER(userId), {
            duration_days: durationDays,
            reason,
        });
    }

    /**
     * 사용자 정지 해제 (관리자)
     * @param {number} userId - 사용자 ID
     * @returns {Promise<ApiResponse<void>>}
     */
    static async unsuspendUser(userId) {
        return ApiService.delete(API_ENDPOINTS.ADMIN.UNSUSPEND_USER(userId));
    }
}

export default AdminModel;
