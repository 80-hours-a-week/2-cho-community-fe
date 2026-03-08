// js/services/WebSocketService.js
// WebSocket 연결 생명주기 관리 서비스

import { WS_BASE_URL } from '../config.js';
import Logger from '../utils/Logger.js';

const logger = Logger.createLogger('WebSocketService');

/** 재연결 설정 */
const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_RECONNECT_DELAY = 1000; // 1초
const MAX_RECONNECT_DELAY = 30000;    // 30초

/** Heartbeat 설정 */
const HEARTBEAT_INTERVAL = 25000;     // 25초 (API GW 10분 idle timeout 방지)

/**
 * WebSocket 연결 생명주기 관리
 *
 * 사용법:
 *   const ws = new WebSocketService();
 *   ws.on('notification', (data) => { ... });
 *   ws.onFallback(() => startPolling());
 *   ws.connect(() => getAccessToken());
 */
class WebSocketService {
    constructor() {
        /** @type {WebSocket|null} */
        this._ws = null;
        /** @type {'disconnected'|'connecting'|'authenticating'|'connected'} */
        this._state = 'disconnected';
        this._reconnectAttempts = 0;
        this._reconnectTimer = null;
        this._heartbeatTimer = null;
        /** @type {Function|null} 토큰 획득 함수 (DI) */
        this._getToken = null;
        /** @type {Object.<string, Set<Function>>} 이벤트 리스너 */
        this._listeners = {};
        /** @type {Function|null} 폴백 콜백 */
        this._onFallbackCb = null;
        /** @type {Function|null} 재연결 성공 콜백 */
        this._onReconnectCb = null;
    }

    /**
     * WebSocket 연결을 시작합니다.
     * @param {Function} getToken - () => accessToken 반환 함수
     * @returns {Promise<void>}
     */
    connect(getToken) {
        this._getToken = getToken;
        return this._doConnect();
    }

    /**
     * 연결을 명시적으로 종료합니다 (로그아웃 시).
     */
    disconnect() {
        this._clearReconnect();
        this._stopHeartbeat();
        this._state = 'disconnected';
        if (this._ws) {
            this._ws.onclose = null; // 재연결 방지
            this._ws.close();
            this._ws = null;
        }
        logger.info('WebSocket 연결 종료');
    }

    /**
     * 이벤트 타입별 리스너를 등록합니다.
     * @param {string} type - 이벤트 타입 (예: 'notification', 'dm')
     * @param {Function} callback - 콜백 함수
     */
    on(type, callback) {
        if (!this._listeners[type]) {
            this._listeners[type] = new Set();
        }
        this._listeners[type].add(callback);
    }

    /**
     * 이벤트 리스너를 해제합니다.
     * @param {string} type
     * @param {Function} callback
     */
    off(type, callback) {
        this._listeners[type]?.delete(callback);
    }

    /**
     * 폴백 콜백 등록 (재연결 포기 시 호출)
     * @param {Function} cb
     */
    onFallback(cb) {
        this._onFallbackCb = cb;
    }

    /**
     * 재연결 성공 콜백 등록
     * @param {Function} cb
     */
    onReconnect(cb) {
        this._onReconnectCb = cb;
    }

    /**
     * 현재 연결 상태 반환
     * @returns {string}
     */
    get state() {
        return this._state;
    }

    // ─── Private ────────────────────────────────────────────────────────

    /**
     * 실제 WebSocket 연결 수행
     * @returns {Promise<void>}
     * @private
     */
    _doConnect() {
        return new Promise((resolve, reject) => {
            if (this._state === 'connecting' || this._state === 'authenticating') {
                resolve();
                return;
            }

            this._state = 'connecting';
            logger.info('WebSocket 연결 시도: %s', WS_BASE_URL);

            try {
                this._ws = new WebSocket(WS_BASE_URL);
            } catch (e) {
                this._state = 'disconnected';
                reject(e);
                return;
            }

            this._ws.onopen = () => {
                this._state = 'authenticating';
                const token = this._getToken?.();
                if (!token) {
                    logger.warn('Access Token 없음 — 연결 종료');
                    this._ws.close();
                    reject(new Error('No access token'));
                    return;
                }
                this._ws.send(JSON.stringify({ type: 'auth', token }));
            };

            this._ws.onmessage = (event) => {
                let msg;
                try {
                    msg = JSON.parse(event.data);
                } catch {
                    return;
                }

                // 인증 응답 처리
                if (msg.type === 'auth_ok') {
                    this._state = 'connected';
                    this._reconnectAttempts = 0;
                    this._startHeartbeat();
                    logger.info('WebSocket 인증 성공 (user_id=%d)', msg.user_id);
                    resolve();
                    return;
                }

                if (msg.type === 'auth_error') {
                    this._state = 'disconnected';
                    logger.warn('WebSocket 인증 실패: %s', msg.message);
                    reject(new Error(msg.message));
                    return;
                }

                if (msg.type === 'pong') {
                    return; // heartbeat 응답 무시
                }

                // 범용 이벤트 디스패치
                this._dispatch(msg.type, msg.data);
            };

            this._ws.onclose = (event) => {
                this._stopHeartbeat();
                const wasConnected = this._state === 'connected';
                this._state = 'disconnected';
                logger.info('WebSocket 연결 종료 (code=%d)', event.code);

                if (wasConnected) {
                    this._scheduleReconnect();
                }
            };

            this._ws.onerror = () => {
                logger.warn('WebSocket 에러 발생');
                // onclose가 이후 호출됨
            };
        });
    }

    /**
     * 이벤트 디스패치
     * @param {string} type
     * @param {*} data
     * @private
     */
    _dispatch(type, data) {
        const listeners = this._listeners[type];
        if (!listeners) return;
        for (const cb of listeners) {
            try {
                cb(data);
            } catch (e) {
                logger.error('이벤트 리스너 에러 (type=%s)', type, e);
            }
        }
    }

    /**
     * 재연결 스케줄링 (지수 백오프)
     * @private
     */
    _scheduleReconnect() {
        if (this._reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            logger.warn('재연결 포기 (%d회 실패) — 폴링 폴백', MAX_RECONNECT_ATTEMPTS);
            this._onFallbackCb?.();
            return;
        }

        const delay = Math.min(
            INITIAL_RECONNECT_DELAY * Math.pow(2, this._reconnectAttempts),
            MAX_RECONNECT_DELAY
        );
        this._reconnectAttempts++;

        logger.info('재연결 예정: %dms 후 (%d/%d)', delay, this._reconnectAttempts, MAX_RECONNECT_ATTEMPTS);

        this._reconnectTimer = setTimeout(async () => {
            try {
                await this._doConnect();
                logger.info('재연결 성공');
                this._onReconnectCb?.();
            } catch {
                // onclose에서 다시 스케줄링됨
            }
        }, delay);
    }

    /**
     * 재연결 타이머 정리
     * @private
     */
    _clearReconnect() {
        if (this._reconnectTimer) {
            clearTimeout(this._reconnectTimer);
            this._reconnectTimer = null;
        }
        this._reconnectAttempts = 0;
    }

    /**
     * Heartbeat 시작
     * @private
     */
    _startHeartbeat() {
        this._stopHeartbeat();
        this._heartbeatTimer = setInterval(() => {
            if (this._ws?.readyState === WebSocket.OPEN) {
                this._ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, HEARTBEAT_INTERVAL);
    }

    /**
     * Heartbeat 중지
     * @private
     */
    _stopHeartbeat() {
        if (this._heartbeatTimer) {
            clearInterval(this._heartbeatTimer);
            this._heartbeatTimer = null;
        }
    }
}

export default WebSocketService;
