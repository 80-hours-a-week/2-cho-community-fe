// js/controllers/HeaderController.js
// 헤더 이벤트 처리 컨트롤러

import AuthModel from '../models/AuthModel.js';
import HeaderView from '../views/HeaderView.js';
import { showToast } from '../views/helpers.js';
import Logger from '../utils/Logger.js';
import { resolveNavPath } from '../config.js';

const logger = Logger.createLogger('HeaderController');

/**
 * 헤더 컨트롤러
 */
class HeaderController {
    constructor() {
        this.currentUser = null;
        this._setupGlobalEvents();
    }

    /**
     * 전역 이벤트 설정
     * @private
     */
    _setupGlobalEvents() {
        window.addEventListener('auth:session-expired', () => {
            logger.warn('세션 만료 이벤트 수신 - 로그인 페이지로 이동');
            if (!this._isAuthPage()) {
                location.href = resolveNavPath('/login?session=expired');
            }
        });
    }

    /**
     * 헤더 초기화
     */
    async init() {
        const authSection = document.getElementById('auth-section');
        if (!authSection) return;

        // 기존 내용 비우기
        authSection.textContent = '';

        try {
            const authStatus = await AuthModel.checkAuthStatus();

            if (authStatus.isAuthenticated) {
                this.currentUser = authStatus.user;

                // 프로필 요소 생성 및 주입
                const profileCircle = HeaderView.createProfileElement(this.currentUser);
                authSection.appendChild(profileCircle);

                // 드롭다운 설정
                HeaderView.createDropdown(profileCircle, {
                    onEditInfo: () => this._handleEditInfo(),
                    onChangePassword: () => this._handleChangePassword(),
                    onLogout: () => this._handleLogout()
                });
            } else {
                // 로그인/회원가입 페이지가 아니면 로그인으로 리다이렉트
                if (!this._isAuthPage()) {
                    location.href = resolveNavPath('/login');
                }
            }
        } catch (error) {
            logger.error('헤더 인증 확인 실패', error);
            if (!this._isAuthPage()) {
                location.href = resolveNavPath('/login');
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
        // Support both clean URLs (Nginx) and HTML files (S3)
        return path === '/login' || path === '/signup'
            || path === '/user_login.html' || path === '/user_signup.html';
    }

    /**
     * 회원정보 수정 이동
     * @private
     */
    _handleEditInfo() {
        location.href = resolveNavPath('/edit-profile');
    }

    /**
     * 비밀번호 수정 이동
     * @private
     */
    _handleChangePassword() {
        location.href = resolveNavPath('/password');
    }

    /**
     * 로그아웃 처리
     * @private
     */
    async _handleLogout() {
        try {
            const result = await AuthModel.logout();
            if (result.ok) {
                showToast('로그아웃 되었습니다.');
                setTimeout(() => {
                    location.href = resolveNavPath('/login');
                }, 1000);
            } else {
                showToast('로그아웃 실패');
            }
        } catch (error) {
            logger.error('로그아웃 실패', error);
            location.href = resolveNavPath('/login');
        }
    }
}

export default HeaderController;
