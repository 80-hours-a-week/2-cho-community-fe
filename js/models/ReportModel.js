// @ts-check
// js/models/ReportModel.js
// 신고 관련 API 호출 관리

import ApiService from '../services/ApiService.js';
import { API_ENDPOINTS } from '../constants.js';

/**
 * 신고 관련 Model
 */
class ReportModel {
    /**
     * 신고 생성
     * @param {{target_type: 'post' | 'comment', target_id: number, reason: 'spam' | 'abuse' | 'inappropriate' | 'other', description?: string}} data - 신고 데이터
     * @returns {Promise<ApiResponse<{report_id: number}>>}
     */
    static async createReport(data) {
        return ApiService.post(API_ENDPOINTS.REPORTS.ROOT, data);
    }

    /**
     * 신고 목록 조회 (관리자)
     * @param {'pending' | 'resolved' | 'dismissed'} [status='pending'] - 신고 상태 필터
     * @param {number} [offset=0] - 시작 위치
     * @param {number} [limit=20] - 조회 개수
     * @returns {Promise<ApiResponse<{reports: Report[], pagination: Pagination}>>}
     */
    static async getReports(status = 'pending', offset = 0, limit = 20) {
        return ApiService.get(
            `${API_ENDPOINTS.ADMIN.REPORTS}?status=${status}&offset=${offset}&limit=${limit}`
        );
    }

    /**
     * 신고 처리 (관리자)
     * @param {number} reportId - 신고 ID
     * @param {'resolved' | 'dismissed'} status - 처리 상태
     * @param {number | null} [suspendDays=null] - 작성자 정지 기간 (일)
     * @returns {Promise<ApiResponse<void>>}
     */
    static async resolveReport(reportId, status, suspendDays = null) {
        /** @type {{status: 'resolved' | 'dismissed', suspend_days?: number}} */
        const body = { status };
        if (suspendDays !== null) body.suspend_days = suspendDays;
        return ApiService.patch(API_ENDPOINTS.ADMIN.RESOLVE_REPORT(reportId), body);
    }

    /**
     * 처리된 신고를 다시 열기 (관리자)
     * @param {number} reportId - 신고 ID
     * @returns {Promise<ApiResponse<void>>}
     */
    static async reopenReport(reportId) {
        return ApiService.patch(`${API_ENDPOINTS.ADMIN.RESOLVE_REPORT(reportId)}/reopen`, {});
    }
}

export default ReportModel;
