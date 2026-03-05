// js/models/UserModel.js
// 사용자 관련 API 호출 관리

import ApiService from '../services/ApiService.js';
import { API_ENDPOINTS } from '../constants.js';

/**
 * 사용자 관련 Model
 */
class UserModel {
    /**
     * 회원가입
     * @param {FormData} formData - 회원가입 폼 데이터 (email, password, nickname, profile_image)
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async signup(formData) {
        return ApiService.postFormData(API_ENDPOINTS.USERS.ROOT, formData);
    }

    /**
     * 사용자 프로필 수정
     * @param {object} data - 수정할 데이터 (nickname, profileImageUrl 등)
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async updateProfile(data) {
        return ApiService.patch(API_ENDPOINTS.USERS.ME, data);
    }

    /**
     * 비밀번호 변경
     * @param {string} currentPassword - 현재 비밀번호
     * @param {string} newPassword - 새 비밀번호
     * @param {string} newPasswordConfirm - 새 비밀번호 확인
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async changePassword(currentPassword, newPassword, newPasswordConfirm) {
        return ApiService.put(API_ENDPOINTS.USERS.PASSWORD, {
            current_password: currentPassword,
            new_password: newPassword,
            new_password_confirm: newPasswordConfirm
        });
    }

    /**
     * 회원 탈퇴
     * @param {string} password - 비밀번호 확인
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async withdraw(password) {
        return ApiService.delete(API_ENDPOINTS.USERS.ME, {
            password: password,
            agree: true
        });
    }

    /**
     * 프로필 이미지 업로드 (게시글 이미지 업로드 엔드포인트 사용)
     * @param {File} file - 이미지 파일
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async uploadProfileImage(file) {
        const formData = new FormData();
        formData.append('file', file);
        return ApiService.postFormData(API_ENDPOINTS.USERS.PROFILE_IMAGE, formData);
    }

    /**
     * 닉네임으로 이메일 찾기
     * @param {string} nickname - 닉네임
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async findEmail(nickname) {
        return ApiService.post(API_ENDPOINTS.USERS.FIND_EMAIL, { nickname });
    }

    /**
     * 임시 비밀번호 요청
     * @param {string} email - 이메일 주소
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async resetPassword(email) {
        return ApiService.post(API_ENDPOINTS.USERS.RESET_PASSWORD, { email });
    }

    /**
     * 닉네임 검색 (멘션 자동완성용)
     * @param {string} query - 닉네임 접두어
     * @param {number} [limit=10] - 최대 결과 수
     * @returns {Promise<Array>} - 검색 결과 배열
     */
    static async searchUsers(query, limit = 10) {
        const params = new URLSearchParams({ q: query, limit: String(limit) });
        const response = await ApiService.get(
            `${API_ENDPOINTS.USERS.SEARCH}?${params.toString()}`
        );
        return response.data || [];
    }

    /**
     * 사용자 공개 프로필 조회
     * @param {number} userId - 사용자 ID
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async getUserById(userId) {
        return ApiService.get(`${API_ENDPOINTS.USERS.ROOT}/${userId}`);
    }

    /**
     * 사용자 차단
     * @param {number} userId - 차단할 사용자 ID
     */
    static async blockUser(userId) {
        return ApiService.post(API_ENDPOINTS.BLOCKS.BLOCK(userId), {});
    }

    /**
     * 사용자 차단 해제
     * @param {number} userId - 차단 해제할 사용자 ID
     */
    static async unblockUser(userId) {
        return ApiService.delete(API_ENDPOINTS.BLOCKS.BLOCK(userId));
    }

    /**
     * 내 차단 목록 조회
     * @param {number} offset
     * @param {number} limit
     */
    static async getMyBlocks(offset = 0, limit = 10) {
        return ApiService.get(`${API_ENDPOINTS.ACTIVITY.MY_BLOCKS}?offset=${offset}&limit=${limit}`);
    }

    /**
     * 사용자 정지 (관리자)
     * @param {number} userId - 정지할 사용자 ID
     * @param {number} durationDays - 정지 기간 (일)
     * @param {string} reason - 정지 사유
     */
    static async suspendUser(userId, durationDays, reason) {
        return ApiService.post(API_ENDPOINTS.ADMIN.SUSPEND_USER(userId), {
            duration_days: durationDays,
            reason: reason,
        });
    }

    /**
     * 사용자 정지 해제 (관리자)
     * @param {number} userId - 정지 해제할 사용자 ID
     */
    static async unsuspendUser(userId) {
        return ApiService.delete(API_ENDPOINTS.ADMIN.UNSUSPEND_USER(userId));
    }
}

export default UserModel;
