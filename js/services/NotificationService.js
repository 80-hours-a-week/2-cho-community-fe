// js/services/NotificationService.js
// 알림/DM 폴링 및 WebSocket 관리 서비스 (DOM 조작 없음)

import NotificationModel from '../models/NotificationModel.js';
import DMModel from '../models/DMModel.js';
import WebSocketService from './WebSocketService.js';
import Logger from '../utils/Logger.js';

const logger = Logger.createLogger('NotificationService');

/** 폴링 주기 (ms) */
const POLL_INTERVAL_ACTIVE = 10_000;   // 포커스 상태: 10초
const POLL_INTERVAL_INACTIVE = 60_000; // 비포커스 상태: 60초
const WS_RESYNC_INTERVAL = 60_000;     // WebSocket 모드에서 count 재동기화: 60초

/**
 * 알림/DM 인프라 서비스
 * WebSocket 연결, 폴링, 배지 count 추적을 담당하며
 * UI 업데이트는 콜백으로 위임한다.
 */
class NotificationService {
    constructor() {
        /** @type {WebSocketService|null} */
        this._wsService = null;
        this._lastUnreadCount = null;
        this._lastDmUnreadCount = null;
        this._lastLatestId = null;
        this._lastETag = null;
        this._polling = false;
        this._notifInterval = null;
        this._resyncInterval = null;
        this._dmSendTypingHandler = null;
        this._onVisibilityChange = null;
        this._onFocus = null;
        this._onBlur = null;

        // 콜백
        this._onNotificationCb = null;
        this._onDmMessageCb = null;
        this._onDmEventCb = null;
    }

    /**
     * 알림 콜백 등록
     * @param {function({ count: number, latest: object|null, isNew: boolean }): void} callback
     */
    onNotification(callback) { this._onNotificationCb = callback; }

    /**
     * DM 메시지 콜백 등록
     * @param {function({ count: number, data: object|null }): void} callback
     */
    onDmMessage(callback) { this._onDmMessageCb = callback; }

    /**
     * DM 부가 이벤트 콜백 등록 (타이핑, 삭제, 읽음)
     * @param {function(string, object): void} callback
     */
    onDmEvent(callback) { this._onDmEventCb = callback; }

    /**
     * 알림 시스템 시작 (WebSocket 우선, 폴링 폴백)
     * @param {function(): string|null} getToken - 액세스 토큰 반환 함수
     */
    async start(getToken) {
        this._wsService = new WebSocketService();

        // 알림 이벤트 수신
        this._wsService.on('notification', (data) => {
            this._handleRealtimeNotification(data);
        });

        // DM 이벤트 수신
        this._wsService.on('dm', (data) => {
            this._handleRealtimeDm(data);
        });

        // DM 부가 이벤트 (타이핑, 삭제, 읽음)
        for (const type of ['typing_start', 'typing_stop', 'message_deleted', 'message_read']) {
            this._wsService.on(type, (data) => {
                this._dispatchDmEvent(type, data);
            });
        }

        // 폴백: WebSocket 재연결 포기 시 폴링 전환
        this._wsService.onFallback(() => {
            logger.info('WebSocket 폴백 → 폴링 모드');
            this._stopResync();
            this._startNotificationPolling();
        });

        // 재연결 성공 시 폴링 중단 + 재동기화 시작
        this._wsService.onReconnect(() => {
            logger.info('WebSocket 재연결 → 폴링 중단');
            this._stopNotificationPolling();
            this._startResync();
        });

        // WebSocket 연결 시도
        try {
            await this._wsService.connect(getToken);
            // WebSocket 연결 성공 → 주기적 count 재동기화 (드리프트 방지)
            this._startResync();
        } catch {
            logger.info('WebSocket 연결 실패 → 폴링 모드');
            this._startNotificationPolling();
        }

        // DM 타이핑 이벤트 전송 요청 수신 → WebSocket으로 전달
        this._dmSendTypingHandler = (e) => {
            if (this._wsService) {
                this._wsService.send(e.detail);
            }
        };
        window.addEventListener('dm:send-typing', this._dmSendTypingHandler);

        // 초기 unread count는 한 번 폴링으로 가져옴
        this._pollNotifications();
        this._pollDmUnreadCount();
    }

    /**
     * 알림 시스템 정지 (로그아웃 시 호출)
     */
    stop() {
        this._stopNotificationPolling();
        this._stopResync();
        if (this._dmSendTypingHandler) {
            window.removeEventListener('dm:send-typing', this._dmSendTypingHandler);
            this._dmSendTypingHandler = null;
        }
        if (this._wsService) {
            this._wsService.disconnect();
            this._wsService = null;
        }
    }

    // ── WebSocket 재동기화 ──────────────────────────

    /**
     * WebSocket 모드에서 주기적 unread count 재동기화 (드리프트 방지)
     * @private
     */
    _startResync() {
        this._stopResync();
        this._resyncInterval = setInterval(() => {
            this._pollNotifications();
            this._pollDmUnreadCount();
        }, WS_RESYNC_INTERVAL);
    }

    /**
     * 재동기화 중지
     * @private
     */
    _stopResync() {
        if (this._resyncInterval) {
            clearInterval(this._resyncInterval);
            this._resyncInterval = null;
        }
    }

    // ── 알림 ────────────────────────────────────────

    /**
     * 실시간 알림 수신 처리
     * @param {object} data - 알림 데이터
     * @private
     */
    _handleRealtimeNotification(data) {
        this._lastUnreadCount = (this._lastUnreadCount || 0) + 1;

        const latest = data.notification_type
            ? { type: data.notification_type, actor_nickname: data.actor_nickname }
            : null;

        this._onNotificationCb?.({
            count: this._lastUnreadCount,
            latest,
            isNew: true,
        });
    }

    /**
     * 알림 폴링 시작 (가변 주기)
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
     * 읽지 않은 알림 수 조회 + 새 알림 감지
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

            // 새 알림 감지: count 증가 + 최신 알림 ID 변경
            const isNew =
                this._lastUnreadCount !== null &&
                count > this._lastUnreadCount &&
                latest &&
                latest.notification_id !== this._lastLatestId;

            this._lastUnreadCount = count;
            this._lastLatestId = latest?.notification_id || null;

            this._onNotificationCb?.({ count, latest, isNew });
        } catch {
            // 폴링 실패는 무시
        } finally {
            this._polling = false;
        }
    }

    // ── DM ───────────────────────────────────────────

    /**
     * DM 관련 WebSocket 이벤트를 콜백으로 전달
     * @param {string} type - 이벤트 타입
     * @param {object} data - 이벤트 데이터
     * @private
     */
    _dispatchDmEvent(type, data) {
        this._onDmEventCb?.(type, data);
    }

    /**
     * 실시간 DM 수신 처리
     * @param {object} data - DM 이벤트 데이터
     * @private
     */
    _handleRealtimeDm(data) {
        // 현재 해당 대화를 보고 있으면 배지 증가 안 함
        // 모바일: /messages/detail?id=N, 데스크톱: /messages/inbox (DMPageController가 관리)
        const isDmPage = location.pathname.includes('/messages/detail')
            || location.pathname.includes('/messages/inbox');

        let isViewingConversation = false;
        if (isDmPage) {
            const params = new URLSearchParams(location.search);
            const viewingConvId = params.get('id');
            // 모바일: 쿼리 파라미터로 대화 식별
            if (viewingConvId && Number(viewingConvId) === data.conversation_id) {
                isViewingConversation = true;
            }
            // 데스크톱: DMPageController가 선택 중인 대화와 일치하면 무시
            // (dm:new-message 이벤트에서 DMPageController가 직접 읽음 처리)
            if (location.pathname.includes('/messages/inbox')
                && document.querySelector('.dm-conversation-card.active[data-conv-id="' + data.conversation_id + '"]')) {
                isViewingConversation = true;
            }
        }

        if (isViewingConversation) {
            // dm:new-message 이벤트만 발생, 배지/토스트는 생략
            this._onDmMessageCb?.({ count: this._lastDmUnreadCount || 0, data, isViewing: true });
            return;
        }

        this._lastDmUnreadCount = (this._lastDmUnreadCount || 0) + 1;
        this._onDmMessageCb?.({ count: this._lastDmUnreadCount, data, isViewing: false });
    }

    /**
     * DM 읽지 않은 대화 수 조회
     * @private
     */
    async _pollDmUnreadCount() {
        try {
            const result = await DMModel.getUnreadCount();
            if (!result.ok) return;

            const count = result.data?.data?.unread_count || 0;
            this._lastDmUnreadCount = count;
            this._onDmMessageCb?.({ count, data: null, isViewing: false });
        } catch {
            // 폴링 실패는 무시
        }
    }
}

export default NotificationService;
