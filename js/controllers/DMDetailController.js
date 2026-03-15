// js/controllers/DMDetailController.js
// DM 대화 상세 페이지 컨트롤러

import DMModel from '../models/DMModel.js';
import DMDetailView from '../views/DMDetailView.js';
import AuthModel from '../models/AuthModel.js';
import MarkdownEditor from '../components/MarkdownEditor.js';
import { showToast } from '../views/helpers.js';
import { resolveNavPath } from '../config.js';
import { NAV_PATHS, UI_MESSAGES } from '../constants.js';
import { createElement } from '../utils/dom.js';
import Logger from '../utils/Logger.js';

const logger = Logger.createLogger('DMDetailController');

// 모듈 레벨 상태
let _conversationId = null;
let _currentUserId = null;
let _editor = null;
let _isSending = false;
let _dmEventHandler = null;
let _otherUserId = null;
let _typingTimeout = null;
let _isTyping = false;
let _offset = 0;
let _hasMore = false;
let _isLoadingMore = false;
let _scrollHandler = null;
let _contextMenuHandler = null;
let _typingEventHandler = null;
let _deletedEventHandler = null;
let _readEventHandler = null;

/**
 * DM 대화 상세 페이지 컨트롤러
 */
export class DMDetailController {
    /**
     * 컨트롤러 초기화
     */
    static async init() {
        // URL에서 대화 ID 추출
        const params = new URLSearchParams(window.location.search);
        _conversationId = params.get('id');
        if (!_conversationId) {
            location.href = resolveNavPath(NAV_PATHS.DM_LIST);
            return;
        }
        _conversationId = Number(_conversationId);

        // 현재 사용자 정보 가져오기
        const authResult = await AuthModel.checkAuthStatus();
        if (!authResult.isAuthenticated || !authResult.user) {
            location.href = resolveNavPath(NAV_PATHS.LOGIN);
            return;
        }
        _currentUserId = authResult.user.id;

        // 에디터 설정
        DMDetailController._setupEditor();

        // 전송 버튼 이벤트
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

        // 실시간 메시지 수신 리스너
        DMDetailController._setupDmEventListener();

        // 메시지 로드
        await DMDetailController._loadMessages();

        // 스크롤 페이지네이션 설정
        DMDetailController._setupScrollPagination();

        // 컨텍스트 메뉴 (메시지 삭제) 설정
        DMDetailController._setupContextMenu();

        // 타이핑 인디케이터 설정
        DMDetailController._setupTypingEmitter();
        DMDetailController._setupTypingReceiver();
    }

    /**
     * 마크다운 에디터 설정 (컴팩트 모드)
     * @private
     */
    static _setupEditor() {
        const editorEl = document.getElementById('dm-editor');
        if (!editorEl) return;

        // MarkdownEditor는 textarea를 래핑하므로 textarea 생성
        const textarea = createElement('textarea', { className: 'dm-editor-textarea' });
        textarea.placeholder = '메시지를 입력하세요...';
        textarea.rows = 3;
        editorEl.appendChild(textarea);

        _editor = new MarkdownEditor(textarea, { compact: true });

        // Enter로 전송 (Shift+Enter는 줄바꿈)
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                DMDetailController._sendMessage();
            }
        });
    }

    /**
     * 메시지 목록 로드
     * @private
     */
    static async _loadMessages() {
        const messagesEl = document.getElementById('dm-messages');
        const otherUserEl = document.getElementById('dm-other-user');

        try {
            const result = await DMModel.getMessages(_conversationId);

            if (!result.ok) {
                if (result.status === 401) {
                    location.href = resolveNavPath(NAV_PATHS.LOGIN);
                    return;
                }
                if (result.status === 404) {
                    showToast('대화를 찾을 수 없습니다.');
                    location.href = resolveNavPath(NAV_PATHS.DM_LIST);
                    return;
                }
                showToast(UI_MESSAGES.DM_LOAD_FAIL);
                return;
            }

            const messages = result.data?.data?.messages || [];

            // API 응답의 other_user 필드에서 상대방 정보 추출
            const otherUser = result.data?.data?.other_user;
            if (otherUser) {
                _otherUserId = otherUser.user_id;
                DMDetailView.renderOtherUser(otherUser, otherUserEl);
                // sessionStorage에 저장 (다른 페이지에서 활용)
                sessionStorage.setItem(`dm_other_user_${_conversationId}`, JSON.stringify(otherUser));
            }

            // 페이지네이션 정보 저장
            const pagination = result.data?.data?.pagination;
            _hasMore = pagination?.has_more || false;
            _offset = messages.length;

            // 메시지 렌더링
            DMDetailView.renderMessages(messages, _currentUserId, messagesEl);
            DMDetailView.scrollToBottom(messagesEl);

            // 읽음 처리
            DMModel.markRead(_conversationId).catch(err => {
                logger.warn('읽음 처리 실패', err);
            });
        } catch (error) {
            logger.error('메시지 로드 실패', error);
            showToast(UI_MESSAGES.DM_LOAD_FAIL);
        }
    }

    /**
     * 위로 스크롤 시 이전 메시지 로드 (페이지네이션) 설정
     * @private
     */
    static _setupScrollPagination() {
        const messagesEl = document.getElementById('dm-messages');
        if (!messagesEl) return;

        _scrollHandler = () => {
            if (_isLoadingMore || !_hasMore) return;
            if (messagesEl.scrollTop <= 50) {
                DMDetailController._loadOlderMessages();
            }
        };
        messagesEl.addEventListener('scroll', _scrollHandler);
    }

    /**
     * 이전 메시지 로드 (위로 스크롤 페이지네이션)
     * @private
     */
    static async _loadOlderMessages() {
        if (_isLoadingMore || !_hasMore) return;
        _isLoadingMore = true;

        const messagesEl = document.getElementById('dm-messages');
        const prevScrollHeight = messagesEl.scrollHeight;

        try {
            const result = await DMModel.getMessages(_conversationId, _offset);
            if (!result.ok) return;

            const messages = result.data?.data?.messages || [];
            const pagination = result.data?.data?.pagination;
            _hasMore = pagination?.has_more || false;
            _offset += messages.length;

            // 이전 메시지를 상단에 prepend
            if (messages.length > 0) {
                DMDetailView.prependMessages(messages, _currentUserId, messagesEl);
                // 스크롤 위치 유지
                messagesEl.scrollTop = messagesEl.scrollHeight - prevScrollHeight;
            }
        } catch (error) {
            logger.error('이전 메시지 로드 실패', error);
            showToast('이전 메시지를 불러오지 못했습니다.');
        } finally {
            _isLoadingMore = false;
        }
    }

    /**
     * 타이핑 인디케이터 발신 설정
     * @private
     */
    static _setupTypingEmitter() {
        const textarea = document.querySelector('.dm-editor-textarea');
        if (!textarea || !_otherUserId) return;

        textarea.addEventListener('input', () => {
            DMDetailController._emitTyping();
        });
    }

    /**
     * 타이핑 이벤트 발신 (WebSocket 경유)
     * @private
     */
    static _emitTyping() {
        if (!_otherUserId) return;

        // HeaderController가 WebSocket으로 전송하도록 CustomEvent 요청
        if (!_isTyping) {
            _isTyping = true;
            window.dispatchEvent(new CustomEvent('dm:send-typing', {
                detail: {
                    type: 'typing_start',
                    conversation_id: _conversationId,
                    recipient_id: _otherUserId,
                }
            }));
        }

        // 3초 무입력 시 typing_stop 전송
        clearTimeout(_typingTimeout);
        _typingTimeout = setTimeout(() => {
            _isTyping = false;
            window.dispatchEvent(new CustomEvent('dm:send-typing', {
                detail: {
                    type: 'typing_stop',
                    conversation_id: _conversationId,
                    recipient_id: _otherUserId,
                }
            }));
        }, 3000);
    }

    /**
     * 타이핑 인디케이터 수신 리스너 설정
     * @private
     */
    static _setupTypingReceiver() {
        const typingEl = document.getElementById('dm-typing');
        let receiveTimeout = null;

        _typingEventHandler = (e) => {
            const data = e.detail;
            if (!data || data.conversation_id !== _conversationId) return;

            if (data.type === 'typing_start') {
                DMDetailView.renderTypingIndicator(typingEl, true);
                clearTimeout(receiveTimeout);
                receiveTimeout = setTimeout(() => {
                    DMDetailView.renderTypingIndicator(typingEl, false);
                }, 3000);
            } else {
                clearTimeout(receiveTimeout);
                DMDetailView.renderTypingIndicator(typingEl, false);
            }
        };
        window.addEventListener('dm:typing', _typingEventHandler);
    }

    /**
     * 메시지 삭제 컨텍스트 메뉴 설정
     * @private
     */
    static _setupContextMenu() {
        const messagesEl = document.getElementById('dm-messages');
        if (!messagesEl) return;

        _contextMenuHandler = (e) => {
            const msgEl = e.target.closest('.dm-msg--mine:not(.dm-msg--deleted)');
            if (!msgEl) return;
            e.preventDefault();
            const messageId = Number(msgEl.dataset.messageId);
            if (!messageId) return;
            DMDetailView.showContextMenu(e.clientX, e.clientY, () => {
                DMDetailController._handleDeleteMessage(messageId);
            });
        };
        messagesEl.addEventListener('contextmenu', _contextMenuHandler);
    }

    /**
     * 개별 메시지 삭제 처리
     * @param {number} messageId
     * @private
     */
    static async _handleDeleteMessage(messageId) {
        try {
            const result = await DMModel.deleteMessage(_conversationId, messageId);
            if (!result.ok) {
                showToast(UI_MESSAGES.DELETE_FAIL);
                return;
            }
            const messagesEl = document.getElementById('dm-messages');
            DMDetailView.removeMessage(messageId, messagesEl);
        } catch (error) {
            logger.error('메시지 삭제 실패', error);
            showToast(UI_MESSAGES.DELETE_FAIL);
        }
    }

    /**
     * 메시지 전송
     * @private
     */
    static async _sendMessage() {
        if (_isSending || !_editor) return;

        const content = _editor.getValue().trim();
        if (!content) return;

        _isSending = true;
        const sendBtn = document.getElementById('dm-send-btn');
        if (sendBtn) sendBtn.disabled = true;

        try {
            const result = await DMModel.sendMessage(_conversationId, content);

            if (!result.ok) {
                if (result.status === 403) {
                    showToast(UI_MESSAGES.DM_BLOCKED);
                } else {
                    showToast(UI_MESSAGES.DM_SEND_FAIL);
                }
                return;
            }

            const message = result.data?.data?.message;
            if (message) {
                const messagesEl = document.getElementById('dm-messages');
                DMDetailView.appendMessage(message, _currentUserId, messagesEl);
            }

            // 에디터 초기화
            _editor.setValue('');
        } catch (error) {
            logger.error('메시지 전송 실패', error);
            showToast(UI_MESSAGES.DM_SEND_FAIL);
        } finally {
            _isSending = false;
            if (sendBtn) sendBtn.disabled = false;
        }
    }

    /**
     * 실시간 DM 이벤트 리스너 설정
     * HeaderController의 WebSocket이 dm 이벤트를 커스텀 DOM 이벤트로 디스패치
     * @private
     */
    static _setupDmEventListener() {
        _dmEventHandler = (e) => {
            const data = e.detail;
            if (!data) return;

            // 현재 대화의 메시지인 경우만 처리
            if (data.conversation_id === _conversationId) {
                const messagesEl = document.getElementById('dm-messages');
                DMDetailView.appendMessage(data, _currentUserId, messagesEl);

                // 읽음 처리
                DMModel.markRead(_conversationId).catch(err => {
                    logger.warn('실시간 메시지 읽음 처리 실패', err);
                });
            }
        };

        window.addEventListener('dm:new-message', _dmEventHandler);

        // 메시지 삭제 실시간 수신
        _deletedEventHandler = (e) => {
            const data = e.detail;
            if (!data || data.conversation_id !== _conversationId) return;
            const messagesEl = document.getElementById('dm-messages');
            DMDetailView.removeMessage(data.message_id, messagesEl);
        };
        window.addEventListener('dm:message-deleted', _deletedEventHandler);

        // 읽음 확인 실시간 수신
        _readEventHandler = (e) => {
            const data = e.detail;
            if (!data || data.conversation_id !== _conversationId) return;
            const messagesEl = document.getElementById('dm-messages');
            DMDetailView.updateReadStatus(messagesEl);
        };
        window.addEventListener('dm:message-read', _readEventHandler);
    }

    /**
     * 대화 삭제 처리
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
     * 컨트롤러 정리 (이벤트 리스너 해제)
     */
    static destroy() {
        if (_dmEventHandler) {
            window.removeEventListener('dm:new-message', _dmEventHandler);
            _dmEventHandler = null;
        }
        if (_typingEventHandler) {
            window.removeEventListener('dm:typing', _typingEventHandler);
            _typingEventHandler = null;
        }
        if (_deletedEventHandler) {
            window.removeEventListener('dm:message-deleted', _deletedEventHandler);
            _deletedEventHandler = null;
        }
        if (_readEventHandler) {
            window.removeEventListener('dm:message-read', _readEventHandler);
            _readEventHandler = null;
        }
        if (_scrollHandler || _contextMenuHandler) {
            const messagesEl = document.getElementById('dm-messages');
            if (messagesEl) {
                if (_scrollHandler) messagesEl.removeEventListener('scroll', _scrollHandler);
                if (_contextMenuHandler) messagesEl.removeEventListener('contextmenu', _contextMenuHandler);
            }
            _scrollHandler = null;
            _contextMenuHandler = null;
        }
        if (_typingTimeout) {
            clearTimeout(_typingTimeout);
            _typingTimeout = null;
        }
        DMDetailView.hideContextMenu();
        _conversationId = null;
        _currentUserId = null;
        _otherUserId = null;
        _editor = null;
        _isSending = false;
        _isTyping = false;
        _offset = 0;
        _hasMore = false;
        _isLoadingMore = false;
    }
}
