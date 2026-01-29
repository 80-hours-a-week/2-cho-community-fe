// js/models/AuthModel.js
// 인증 관련 상태 및 API 호출 관리

import ApiService from '../services/ApiService.js';

/**
 * 인증 관련 Model
 */
class AuthModel {
    /**
     * 로그인
     * @param {string} email - 이메일
     * @param {string} password - 비밀번호
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async login(email, password) {
        return ApiService.post('/v1/auth/session', { email, password });
    }

    /**
     * 로그아웃
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async logout() {
        return ApiService.delete('/v1/auth/session');
    }

    /**
     * 현재 로그인된 사용자 정보 조회
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async getCurrentUser() {
        return ApiService.get('/v1/users/me');
    }

    /**
     * 인증 상태 확인
     * @returns {Promise<{isAuthenticated: boolean, user: object|null}>}
     */
    static async checkAuthStatus() {
        try {
            const result = await ApiService.get('/v1/users/me');
            if (result.ok && result.data?.data?.user) {
                return {
                    isAuthenticated: true,
                    user: result.data.data.user
                };
            }
            return { isAuthenticated: false, user: null };
        } catch (error) {
            console.error('인증 확인 실패:', error);
            return { isAuthenticated: false, user: null };
        }
    }
}

export default AuthModel;
