// js/controllers/DMDetailController.js
// DM 대화 상세 페이지 컨트롤러 (모바일/단일 대화 뷰)

import DMModel from '../models/DMModel.js';
import DMDetailView from '../views/DMDetailView.js';
import AuthModel from '../models/AuthModel.js';
import { showToast } from '../views/helpers.js';
import { resolveNavPath } from '../config.js';
import { NAV_PATHS, UI_MESSAGES } from '../constants.js';
import Logger from '../utils/Logger.js';
import * as dmChat from '../utils/dmChat.js';

const logger = Logger.createLogger('DMDetailController');

// 모듈 레벨 상태
let _conversationId = null;
let _currentUserId = null;
let _editor = null;
let _isSending = false;
let _otherUserId = null;
let _offset = 0;
let _hasMore = false;
let _isLoadingMore = false;

// 정리용 참조
let _scrollHandler = null;
let _contextMenuHandler = null;
let _typingCleanup = null;
let _readCleanup = null;
let _dmEventHandler = null;
let _deletedEventHandler = null;

/**
 * DM 대화 상세 페이지 컨트롤러
 */
export class DMDetailController {
    /**
     * 컨트롤러 초기화
     */
    static async init() {
        const params = new URLSearchParams(window.location.search);
        _conversationId = params.get('id');
        if (!_conversationId) {
            location.href = resolveNavPath(NAV_PATHS.DM_LIST);
            return;
        }
        _conversationId = Number(_conversationId);

        const authResult = await AuthModel.checkAuthStatus();
        if (!authResult.isAuthenticated || !authResult.user) {
            location.href = resolveNavPath(NAV_PATHS.LOGIN);
            return;
        }
        _currentUserId = authResult.user.user_id;

        // 공통 에디터 설정
        _editor = dmChat.setupEditor(() => DMDetailController._sendMessage());

        // 전송 버튼
        const sendBtn = document.getElementById('dm-send-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => DMDetailController._sendMessage());
        }

        // 뒤로가기 버튼
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                location.href = resolveNavPath(NAV_PATHS.DM_LIST);
            });
        }

        // 삭제 버튼
        const deleteBtn = document.getElementById('dm-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => DMDetailController._handleDelete());
        }

        // 실시간 이벤트 리스너
        DMDetailController._setupDmEventListener();

        // 공통 메시지 로드
        const loadResult = await dmChat.loadMessages(_conversationId, _currentUserId);
        if (loadResult) {
            _otherUserId = loadResult.otherUserId;
            _offset = loadResult.offset;
            _hasMore = loadResult.hasMore;

            // sessionStorage에 상대방 정보 저장
            if (_otherUserId) {
                const otherUser = { user_id: _otherUserId };
                sessionStorage.setItem(`dm_other_user_${_conversationId}`, JSON.stringify(otherUser));
            }
        }

        // 공통 스크롤 페이지네이션
        _scrollHandler = dmChat.setupScrollPagination(
            () => DMDetailController._loadOlderMessages(),
            () => !_isLoadingMore && _hasMore,
        );

        // 공통 컨텍스트 메뉴
        _contextMenuHandler = dmChat.setupContextMenu(_conversationId);

        // 공통 타이핑 인디케이터
        if (_otherUserId) {
            _typingCleanup = dmChat.setupTyping(_conversationId, _otherUserId).cleanup;
        }

        // 공통 읽음 확인 리스너
        _readCleanup = dmChat.setupReadEventListener(() => _conversationId);
    }

    /**
     * @private
     */
    static async _sendMessage() {
        if (_isSending || !_editor || !_conversationId) return;
        _isSending = true;
        try {
            await dmChat.sendMessage(_conversationId, _currentUserId, _editor);
        } finally {
            _isSending = false;
        }
    }

    /**
     * @private
     */
    static async _loadOlderMessages() {
        if (_isLoadingMore || !_hasMore) return;
        _isLoadingMore = true;
        try {
            const result = await dmChat.loadOlderMessages(_conversationId, _currentUserId, _offset);
            _offset = result.offset;
            _hasMore = result.hasMore;
        } finally {
            _isLoadingMore = false;
        }
    }

    /**
     * 실시간 DM 이벤트 리스너 (새 메시지 수신 + 삭제)
     * @private
     */
    static _setupDmEventListener() {
        _dmEventHandler = (e) => {
            const data = e.detail;
            if (!data || data.conversation_id !== _conversationId) return;

            const messagesEl = document.getElementById('dm-messages');
            DMDetailView.appendMessage(data, _currentUserId, messagesEl);

            DMModel.markRead(_conversationId).catch(err => {
                logger.warn('실시간 메시지 읽음 처리 실패', err);
            });
        };
        window.addEventListener('dm:new-message', _dmEventHandler);

        _deletedEventHandler = (e) => {
            const data = e.detail;
            if (!data || data.conversation_id !== _conversationId) return;
            const messagesEl = document.getElementById('dm-messages');
            DMDetailView.removeMessage(data.message_id, messagesEl);
        };
        window.addEventListener('dm:message-deleted', _deletedEventHandler);
    }

    /**
     * 대화 삭제
     * @private
     */
    static async _handleDelete() {
        const confirmed = confirm('이 대화를 삭제하시겠습니까?');
        if (!confirmed) return;

        try {
            const result = await DMModel.deleteConversation(_conversationId);
            if (!result.ok) {
                showToast(UI_MESSAGES.DELETE_FAIL);
                return;
            }
            showToast(UI_MESSAGES.DM_DELETE_SUCCESS);
            location.href = resolveNavPath(NAV_PATHS.DM_LIST);
        } catch (error) {
            logger.error('대화 삭제 실패', error);
            showToast(UI_MESSAGES.DELETE_FAIL);
        }
    }

    /**
     * 컨트롤러 정리
     */
    static destroy() {
        if (_dmEventHandler) {
            window.removeEventListener('dm:new-message', _dmEventHandler);
            _dmEventHandler = null;
        }
        if (_deletedEventHandler) {
            window.removeEventListener('dm:message-deleted', _deletedEventHandler);
            _deletedEventHandler = null;
        }
        if (_scrollHandler) {
            const messagesEl = document.getElementById('dm-messages');
            if (messagesEl) messagesEl.removeEventListener('scroll', _scrollHandler);
            _scrollHandler = null;
        }
        if (_contextMenuHandler) {
            const messagesEl = document.getElementById('dm-messages');
            if (messagesEl) messagesEl.removeEventListener('contextmenu', _contextMenuHandler);
            _contextMenuHandler = null;
        }
        if (_typingCleanup) { _typingCleanup(); _typingCleanup = null; }
        if (_readCleanup) { _readCleanup(); _readCleanup = null; }
        DMDetailView.hideContextMenu();
        _conversationId = null;
        _currentUserId = null;
        _otherUserId = null;
        _editor = null;
        _isSending = false;
        _offset = 0;
        _hasMore = false;
        _isLoadingMore = false;
    }
}
