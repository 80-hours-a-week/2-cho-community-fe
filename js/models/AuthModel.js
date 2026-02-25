// js/models/AuthModel.js
// 인증 관련 상태 및 API 호출 관리 (JWT 기반)

import ApiService, { setAccessToken, getAccessToken } from '../services/ApiService.js';
import { API_BASE_URL } from '../config.js';
import { API_ENDPOINTS } from '../constants.js';
import Logger from '../utils/Logger.js';

const logger = Logger.createLogger('AuthModel');

/**
 * 인증 관련 Model
 */
class AuthModel {
    /**
     * 로그인
     * 성공 시 access_token을 인메모리 저장소에 저장합니다.
     * @param {string} email - 이메일
     * @param {string} password - 비밀번호
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async login(email, password) {
        const result = await ApiService.post(API_ENDPOINTS.AUTH.LOGIN, { email, password });
        if (result.ok && result.data?.data?.access_token) {
            setAccessToken(result.data.data.access_token);
            logger.info('Access Token 저장 완료');
        }
        return result;
    }

    /**
     * 로그아웃
     * 인메모리 Access Token을 삭제합니다.
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async logout() {
        const result = await ApiService.delete(API_ENDPOINTS.AUTH.LOGOUT);
        setAccessToken(null); // 항상 로컬 토큰 삭제 (서버 응답과 무관)
        return result;
    }

    /**
     * 현재 로그인된 사용자 정보 조회
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async getCurrentUser() {
        return ApiService.get(API_ENDPOINTS.USERS.ME);
    }

    /**
     * 인증 상태 확인
     * 인메모리 토큰이 없으면 (예: 페이지 새로고침) silent refresh를 먼저 시도합니다.
     * @returns {Promise<{isAuthenticated: boolean, user: object|null}>}
     */
    static async checkAuthStatus() {
        // 토큰이 없으면 silent refresh 시도 (페이지 새로고침 복원)
        if (!getAccessToken()) {
            logger.debug('토큰 없음 — silent refresh 시도');
            try {
                const refreshRes = await fetch(
                    `${API_BASE_URL}/v1/auth/token/refresh`,
                    {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                    }
                );
                if (refreshRes.ok) {
                    const refreshData = await refreshRes.json();
                    const token = refreshData?.data?.access_token;
                    if (token) {
                        setAccessToken(token);
                        logger.info('Silent refresh 성공');
                        return {
                            isAuthenticated: true,
                            user: refreshData?.data?.user ?? null,
                        };
                    }
                }
            } catch (e) {
                logger.debug('Silent refresh 실패');
            }
            return { isAuthenticated: false, user: null };
        }

        // 토큰이 있으면 /v1/auth/me 호출로 유효성 확인
        try {
            const result = await ApiService.get('/v1/auth/me');
            if (result.ok && result.data?.data?.user) {
                return {
                    isAuthenticated: true,
                    user: result.data.data.user
                };
            }
            return { isAuthenticated: false, user: null };
        } catch (error) {
            logger.warn('인증 확인 실패:', error);
            return { isAuthenticated: false, user: null };
        }
    }
}

export default AuthModel;
