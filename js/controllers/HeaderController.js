// js/controllers/HeaderController.js
// 헤더 이벤트 처리 컨트롤러

import AuthModel from '../models/AuthModel.js';
import HeaderView from '../views/HeaderView.js';
import Logger from '../utils/Logger.js';

const logger = Logger.createLogger('HeaderController');

/**
 * 헤더 컨트롤러
 */
class HeaderController {
    constructor() {
        this.currentUser = null;
    }

    /**
     * 헤더 초기화
     */
    async init() {
        const profileCircle = document.getElementById('header-profile');
        if (!profileCircle) return;

        try {
            const authStatus = await AuthModel.checkAuthStatus();

            if (authStatus.isAuthenticated) {
                this.currentUser = authStatus.user;

                // 프로필 이미지 설정
                HeaderView.setProfileImage(profileCircle, this.currentUser.profileImageUrl);

                // 드롭다운 설정
                HeaderView.createDropdown(profileCircle, {
                    onEditInfo: () => this._handleEditInfo(),
                    onChangePassword: () => this._handleChangePassword(),
                    onLogout: () => this._handleLogout()
                });
            } else {
                // 로그인/회원가입 페이지가 아니면 로그인으로 리다이렉트
                if (!this._isAuthPage()) {
                    location.href = '/login';
                }
            }
        } catch (error) {
            logger.error('헤더 인증 확인 실패', error);
            if (!this._isAuthPage()) {
                location.href = '/login';
            }
        }
    }

    /**
     * 현재 사용자 정보 반환
     * @returns {object|null}
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * 인증 페이지 여부 확인
     * @private
     */
    _isAuthPage() {
        const path = location.pathname;
        return path === '/login' || path === '/signup';
    }

    /**
     * 회원정보 수정 이동
     * @private
     */
    _handleEditInfo() {
        location.href = '/edit-profile';
    }

    /**
     * 비밀번호 수정 이동
     * @private
     */
    _handleChangePassword() {
        location.href = '/password';
    }

    /**
     * 로그아웃 처리
     * @private
     */
    async _handleLogout() {
        try {
            const result = await AuthModel.logout();
            if (result.ok) {
                alert('로그아웃 되었습니다.');
                location.href = '/login';
            } else {
                alert('로그아웃 실패');
            }
        } catch (error) {
            logger.error('로그아웃 실패', error);
            location.href = '/login';
        }
    }
}

export default HeaderController;
