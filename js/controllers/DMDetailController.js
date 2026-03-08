// js/controllers/DMDetailController.js
// DM 대화 상세 페이지 컨트롤러

import DMModel from '../models/DMModel.js';
import DMDetailView from '../views/DMDetailView.js';
import AuthModel from '../models/AuthModel.js';
import MarkdownEditor from '../components/MarkdownEditor.js';
import { showToast } from '../views/helpers.js';
import { resolveNavPath } from '../config.js';
import { NAV_PATHS, UI_MESSAGES } from '../constants.js';
import Logger from '../utils/Logger.js';

const logger = Logger.createLogger('DMDetailController');

// 모듈 레벨 상태
let _conversationId = null;
let _currentUserId = null;
let _editor = null;
let _isSending = false;
let _dmEventHandler = null;

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
    }

    /**
     * 마크다운 에디터 설정 (컴팩트 모드)
     * @private
     */
    static _setupEditor() {
        const editorEl = document.getElementById('dm-editor');
        if (!editorEl) return;

        // MarkdownEditor는 textarea를 래핑하므로 textarea 생성
        const textarea = document.createElement('textarea');
        textarea.className = 'dm-editor-textarea';
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

            // 상대방 정보 추출: 내가 아닌 메시지에서 sender 정보 가져오기
            const otherUser = DMDetailController._extractOtherUser(messages);
            if (otherUser) {
                DMDetailView.renderOtherUser(otherUser, otherUserEl);
            }

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
     * 메시지 목록에서 상대방 사용자 정보 추출
     * @param {Array} messages - 메시지 배열
     * @returns {object|null} - { nickname, profile_image_url }
     * @private
     */
    static _extractOtherUser(messages) {
        if (!messages || messages.length === 0) return null;

        // 내가 아닌 발신자 정보를 찾기
        const otherMsg = messages.find(m => m.sender_id !== _currentUserId);
        if (otherMsg) {
            return {
                nickname: otherMsg.sender_nickname,
                profile_image_url: otherMsg.sender_profile_image,
            };
        }

        // 모든 메시지가 내 것이면 대화 목록에서 정보 가져오기 시도
        // (sessionStorage에 저장된 정보 활용)
        const stored = sessionStorage.getItem(`dm_other_user_${_conversationId}`);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch {
                // 파싱 실패 시 무시
            }
        }

        return null;
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

            const message = result.data?.data;
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
        _conversationId = null;
        _currentUserId = null;
        _editor = null;
        _isSending = false;
    }
}
