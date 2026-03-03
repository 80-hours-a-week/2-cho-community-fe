// js/controllers/HeaderController.js
// 헤더 이벤트 처리 컨트롤러

import AuthModel from '../models/AuthModel.js';
import NotificationModel from '../models/NotificationModel.js';
import HeaderView from '../views/HeaderView.js';
import { ThemeService } from '../services/ThemeService.js';
import { showToast } from '../views/helpers.js';
import Logger from '../utils/Logger.js';
import { resolveNavPath } from '../config.js';
import { NAV_PATHS, UI_MESSAGES } from '../constants.js';

const logger = Logger.createLogger('HeaderController');

/**
 * 헤더 컨트롤러
 */
class HeaderController {
    constructor() {
        this.currentUser = null;
        this._notifInterval = null;
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

        // 테마 토글 (로그인 여부 무관하게 항상 표시)
        ThemeService.initTheme();
        const themeToggle = HeaderView.createThemeToggle(ThemeService.getCurrentTheme());
        themeToggle.addEventListener('click', () => {
            const newTheme = ThemeService.toggleTheme();
            HeaderView.updateThemeToggle(newTheme);
        });
        authSection.appendChild(themeToggle);

        try {
            const authStatus = await AuthModel.checkAuthStatus();

            if (authStatus.isAuthenticated) {
                this.currentUser = authStatus.user;

                // 프로필 요소 생성 및 주입
                const profileCircle = HeaderView.createProfileElement(this.currentUser);
                authSection.appendChild(profileCircle);

                // 드롭다운 설정 (관리자면 신고 관리 메뉴 추가)
                const dropdownHandlers = {
                    onEditInfo: () => this._handleEditInfo(),
                    onChangePassword: () => this._handleChangePassword(),
                    onMyActivity: () => this._handleMyActivity(),
                    onLogout: () => this._handleLogout(),
                };
                if (this.currentUser.role === 'admin') {
                    dropdownHandlers.onAdminReports = () => this._handleAdminReports();
                }
                HeaderView.createDropdown(profileCircle, dropdownHandlers);

                // 알림 폴링 시작
                this._startNotificationPolling();
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
        // 인증 불필요 페이지: 클린 URL과 HTML 파일 경로 모두 지원
        const publicPages = [
            '/login', '/signup', '/find-account', '/verify-email',
            '/user_login.html', '/user_signup.html',
            '/user_find_account.html', '/verify-email.html',
        ];
        return publicPages.includes(path);
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
     * 내 활동 페이지 이동
     * @private
     */
    _handleMyActivity() {
        location.href = resolveNavPath(NAV_PATHS.MY_ACTIVITY);
    }

    /**
     * 신고 관리 페이지 이동 (관리자)
     * @private
     */
    _handleAdminReports() {
        location.href = resolveNavPath(NAV_PATHS.ADMIN_REPORTS);
    }

    /**
     * 로그아웃 처리
     * @private
     */
    async _handleLogout() {
        this._stopNotificationPolling();
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

    /**
     * 알림 폴링 시작 (30초 간격)
     * @private
     */
    _startNotificationPolling() {
        this._pollNotifications();  // 즉시 1회
        this._notifInterval = setInterval(() => this._pollNotifications(), 30000);
    }

    /**
     * 알림 폴링 중지
     * @private
     */
    _stopNotificationPolling() {
        if (this._notifInterval) {
            clearInterval(this._notifInterval);
            this._notifInterval = null;
        }
    }

    /**
     * 읽지 않은 알림 수 조회
     * @private
     */
    async _pollNotifications() {
        try {
            const result = await NotificationModel.getUnreadCount();
            if (result.ok) {
                const count = result.data?.data?.unread_count || 0;
                this._updateNotificationBadge(count);
            }
        } catch {
            // 폴링 실패는 무시
        }
    }

    /**
     * 헤더 알림 뱃지 업데이트
     * @param {number} count - 읽지 않은 알림 수
     * @private
     */
    _updateNotificationBadge(count) {
        let badge = document.getElementById('notification-badge');
        if (count > 0) {
            if (!badge) {
                // 알림 아이콘이 아직 없으면 헤더에 추가
                const authSection = document.getElementById('auth-section');
                if (authSection) {
                    const notifBtn = document.createElement('a');
                    notifBtn.href = resolveNavPath(NAV_PATHS.NOTIFICATIONS);
                    notifBtn.className = 'notification-icon-wrapper';
                    notifBtn.id = 'notification-link';

                    badge = document.createElement('span');
                    badge.id = 'notification-badge';
                    badge.className = 'notification-badge';
                    badge.textContent = count > 99 ? '99+' : String(count);

                    // 벨 아이콘
                    const bell = document.createElement('span');
                    bell.className = 'notification-bell';
                    bell.textContent = '\uD83D\uDD14';

                    notifBtn.appendChild(bell);
                    notifBtn.appendChild(badge);
                    authSection.insertBefore(notifBtn, authSection.firstChild);
                }
            } else {
                badge.textContent = count > 99 ? '99+' : String(count);
                badge.classList.remove('hidden');
            }
        } else if (badge) {
            badge.classList.add('hidden');
        }
    }
}

export default HeaderController;
