// js/controllers/HeaderController.js
// 헤더 이벤트 처리 컨트롤러

import AuthModel from '../models/AuthModel.js';
import HeaderView from '../views/HeaderView.js';
import { ThemeService } from '../services/ThemeService.js';
import NotificationService from '../services/NotificationService.js';
import { showToast } from '../views/helpers.js';
import Logger from '../utils/Logger.js';
import { resolveNavPath } from '../config.js';
import { NAV_PATHS, UI_MESSAGES } from '../constants.js';
import { Icons } from '../utils/icons.js';
import { getAccessToken } from '../services/ApiService.js';

const logger = Logger.createLogger('HeaderController');

/**
 * 헤더 컨트롤러
 */
class HeaderController {
    constructor() {
        this.currentUser = null;
        /** @type {NotificationService|null} */
        this._notifService = null;
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

        window.addEventListener('auth:account-suspended', () => {
            logger.warn('계정 정지 이벤트 수신 - 로그인 페이지로 이동');
            if (!this._isAuthPage()) {
                location.href = resolveNavPath('/login?suspended=true');
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

                // 알림 시스템 초기화 (WebSocket 우선, 폴링 폴백)
                this._notifService = new NotificationService();

                this._notifService.onNotification(({ count, latest, isNew }) => {
                    this._updateNotificationBadge(count);
                    if (isNew && latest) {
                        this._showNotificationToast(latest);
                        window.dispatchEvent(new CustomEvent('notification:new', { detail: latest }));
                    }
                });

                this._notifService.onDmMessage(({ count, data, isViewing }) => {
                    this._updateDmBadge(count);
                    if (data && !isViewing) {
                        window.dispatchEvent(new CustomEvent('dm:new-message', { detail: data }));
                        if (data.sender_nickname) {
                            showToast(`${data.sender_nickname}님이 메시지를 보냈습니다`);
                        }
                    } else if (data && isViewing) {
                        // 대화를 보고 있을 때는 이벤트만 발생 (배지/토스트 생략)
                        window.dispatchEvent(new CustomEvent('dm:new-message', { detail: data }));
                    }
                });

                this._notifService.onDmEvent((type, data) => {
                    const eventMap = {
                        typing_start: 'dm:typing',
                        typing_stop: 'dm:typing',
                        message_deleted: 'dm:message-deleted',
                        message_read: 'dm:message-read',
                    };
                    if (eventMap[type]) {
                        window.dispatchEvent(new CustomEvent(eventMap[type], { detail: { ...data, type } }));
                    }
                });

                // WebSocket 연결은 fire-and-forget (init() 반환을 차단하지 않음)
                // 연결 실패 시 NotificationService 내부에서 폴링으로 폴백
                this._notifService.start(() => getAccessToken());
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
        this._notifService?.stop();
        this._notifService = null;

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
     * 새 알림 토스트 표시
     * @param {object} latest - 최신 알림 데이터
     * @private
     */
    _showNotificationToast(latest) {
        const typeTextMap = {
            comment: '댓글을 남겼습니다',
            like: '좋아요를 눌렀습니다',
            mention: '회원님을 언급했습니다',
            follow: '새 게시글을 작성했습니다',
        };
        const actor = latest.actor_nickname || '알 수 없는 사용자';
        const action = typeTextMap[latest.type] || '알림이 있습니다';
        showToast(`${actor}님이 ${action}`);
    }

    /**
     * 헤더 DM 뱃지 업데이트
     * @param {number} count - 읽지 않은 대화 수
     * @private
     */
    _updateDmBadge(count) {
        const badge = document.getElementById('dm-badge');
        if (!badge && !document.getElementById('dm-link')) {
            // DM 아이콘이 아직 없으면 생성
            const authSection = document.getElementById('auth-section');
            if (authSection) {
                const link = HeaderView.createIconLink(
                    count,
                    resolveNavPath(NAV_PATHS.DM_LIST),
                    Icons.mail,
                    'dm-link',
                    'dm-badge'
                );
                // 알림 아이콘 뒤에 삽입
                const notifLink = document.getElementById('notification-link');
                if (notifLink && notifLink.nextSibling) {
                    authSection.insertBefore(link, notifLink.nextSibling);
                } else if (notifLink) {
                    authSection.appendChild(link);
                } else {
                    authSection.insertBefore(link, authSection.firstChild);
                }
                return;
            }
        }
        HeaderView.updateBadge('dm-badge', count);
    }

    /**
     * 헤더 알림 뱃지 업데이트
     * @param {number} count - 읽지 않은 알림 수
     * @private
     */
    _updateNotificationBadge(count) {
        const badge = document.getElementById('notification-badge');
        if (!badge && !document.getElementById('notification-link')) {
            // 아이콘이 아직 없으면 생성
            const authSection = document.getElementById('auth-section');
            if (authSection) {
                const link = HeaderView.createIconLink(
                    count,
                    resolveNavPath(NAV_PATHS.NOTIFICATIONS),
                    Icons.bell,
                    'notification-link',
                    'notification-badge'
                );
                authSection.insertBefore(link, authSection.firstChild);
                return;
            }
        }
        HeaderView.updateBadge('notification-badge', count);
    }
}

export default HeaderController;
