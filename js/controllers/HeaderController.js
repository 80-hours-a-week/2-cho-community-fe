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
import { Icons } from '../utils/icons.js';
import WebSocketService from '../services/WebSocketService.js';
import { getAccessToken } from '../services/ApiService.js';

const logger = Logger.createLogger('HeaderController');

/** 폴링 주기 (ms) */
const POLL_INTERVAL_ACTIVE = 10_000;   // 포커스 상태: 10초
const POLL_INTERVAL_INACTIVE = 60_000; // 비포커스 상태: 60초

/**
 * 헤더 컨트롤러
 */
class HeaderController {
    constructor() {
        this.currentUser = null;
        this._notifInterval = null;
        this._lastUnreadCount = null;
        this._lastLatestId = null;
        this._lastETag = null;
        this._polling = false;
        /** @type {WebSocketService|null} */
        this._wsService = null;
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
                this._initNotifications();
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
        if (this._wsService) {
            this._wsService.disconnect();
            this._wsService = null;
        }
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
     * 알림 시스템 초기화 (WebSocket 우선, 폴링 폴백)
     * @private
     */
    _initNotifications() {
        this._wsService = new WebSocketService();

        // 알림 이벤트 수신
        this._wsService.on('notification', (data) => {
            this._handleRealtimeNotification(data);
        });

        // 폴백: WebSocket 재연결 포기 시 폴링 전환
        this._wsService.onFallback(() => {
            logger.info('WebSocket 폴백 → 폴링 모드');
            this._startNotificationPolling();
        });

        // 재연결 성공 시 폴링 중단
        this._wsService.onReconnect(() => {
            logger.info('WebSocket 재연결 → 폴링 중단');
            this._stopNotificationPolling();
        });

        // WebSocket 연결 시도
        this._wsService.connect(() => getAccessToken()).catch(() => {
            logger.info('WebSocket 연결 실패 → 폴링 모드');
            this._startNotificationPolling();
        });

        // 초기 unread count는 한 번 폴링으로 가져옴
        this._pollNotifications();
    }

    /**
     * 실시간 알림 수신 처리
     * @param {object} data - 알림 데이터
     * @private
     */
    _handleRealtimeNotification(data) {
        this._lastUnreadCount = (this._lastUnreadCount || 0) + 1;
        this._updateNotificationBadge(this._lastUnreadCount);

        // 토스트 표시
        if (data.notification_type) {
            this._showNotificationToast({
                type: data.notification_type,
                actor_nickname: data.actor_nickname,
            });
        }

        // 알림 목록 페이지 자동 갱신
        window.dispatchEvent(new CustomEvent('notification:new', { detail: data }));
    }

    /**
     * 알림 폴링 시작 (가변 주기)
     * - 포커스: 10초, 비포커스: 60초, 숨김 탭: 중단
     * @private
     */
    _startNotificationPolling() {
        this._pollNotifications();
        this._setPollingRate(document.hidden ? 'hidden' : 'active');

        this._onVisibilityChange = () => {
            if (document.hidden) {
                this._setPollingRate('hidden');
            } else {
                this._pollNotifications();
                this._setPollingRate('active');
            }
        };

        this._onFocus = () => {
            this._pollNotifications();
            this._setPollingRate('active');
        };

        this._onBlur = () => {
            this._setPollingRate('inactive');
        };

        document.addEventListener('visibilitychange', this._onVisibilityChange);
        window.addEventListener('focus', this._onFocus);
        window.addEventListener('blur', this._onBlur);
    }

    /**
     * 폴링 주기 설정
     * @param {'active'|'inactive'|'hidden'} mode
     * @private
     */
    _setPollingRate(mode) {
        if (this._notifInterval) {
            clearInterval(this._notifInterval);
            this._notifInterval = null;
        }
        if (mode === 'hidden') return; // 숨김 탭: 폴링 중단

        const interval = mode === 'active' ? POLL_INTERVAL_ACTIVE : POLL_INTERVAL_INACTIVE;
        this._notifInterval = setInterval(() => this._pollNotifications(), interval);
    }

    /**
     * 알림 폴링 중지 + 이벤트 리스너 정리
     * @private
     */
    _stopNotificationPolling() {
        if (this._notifInterval) {
            clearInterval(this._notifInterval);
            this._notifInterval = null;
        }
        if (this._onVisibilityChange) {
            document.removeEventListener('visibilitychange', this._onVisibilityChange);
            this._onVisibilityChange = null;
        }
        if (this._onFocus) {
            window.removeEventListener('focus', this._onFocus);
            this._onFocus = null;
        }
        if (this._onBlur) {
            window.removeEventListener('blur', this._onBlur);
            this._onBlur = null;
        }
        this._lastUnreadCount = null;
        this._lastLatestId = null;
        this._lastETag = null;
    }

    /**
     * 읽지 않은 알림 수 조회 + 새 알림 토스트
     * @private
     */
    async _pollNotifications() {
        if (this._polling) return; // visibilitychange + focus 이중 발생 방지
        this._polling = true;
        try {
            const result = await NotificationModel.getUnreadCount(this._lastETag);

            // 304 Not Modified — 변경 없음
            if (result.status === 304) return;
            if (!result.ok) return;

            // ETag 저장
            if (result.etag) {
                this._lastETag = result.etag;
            }

            const data = result.data?.data;
            const count = data?.unread_count || 0;
            const latest = data?.latest || null;

            this._updateNotificationBadge(count);

            // 새 알림 감지: count 증가 + 최신 알림 ID 변경
            const isNewNotification =
                this._lastUnreadCount !== null &&
                count > this._lastUnreadCount &&
                latest &&
                latest.notification_id !== this._lastLatestId;

            if (isNewNotification) {
                this._showNotificationToast(latest);
                window.dispatchEvent(new CustomEvent('notification:new'));
            }

            this._lastUnreadCount = count;
            this._lastLatestId = latest?.notification_id || null;
        } catch {
            // 폴링 실패는 무시
        } finally {
            this._polling = false;
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

                    // 벨 아이콘 (SVG)
                    const bell = document.createElement('span');
                    bell.className = 'notification-bell';
                    bell.appendChild(Icons.bell(20));

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
