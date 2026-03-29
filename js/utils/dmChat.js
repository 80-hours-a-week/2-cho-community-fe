// js/utils/dmChat.js
// DM 채팅 공통 로직 — DMPageController와 DMDetailController가 공유합니다.
// 각 함수는 상태를 매개변수로 받아 특정 컨트롤러에 종속되지 않습니다.

import DMModel from '../models/DMModel.js';
import DMDetailView from '../views/DMDetailView.js';
import MarkdownEditor from '../components/MarkdownEditor.js';
import { showToast } from '../views/helpers.js';
import { resolveNavPath } from '../config.js';
import { NAV_PATHS, UI_MESSAGES } from '../constants.js';
import { createElement } from '../utils/dom.js';
import Logger from '../utils/Logger.js';

const logger = Logger.createLogger('dmChat');

/**
 * 마크다운 에디터를 초기화합니다.
 * @param {Function} onSend - Enter 키 전송 콜백
 * @returns {MarkdownEditor|null}
 */
export function setupEditor(onSend) {
    const editorEl = document.getElementById('dm-editor');
    if (!editorEl) return null;

    const textarea = createElement('textarea', { className: 'dm-editor-textarea' });
    textarea.placeholder = '메시지를 입력하세요...';
    textarea.rows = 3;
    editorEl.appendChild(textarea);

    const editor = new MarkdownEditor(textarea, { compact: true });

    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onSend();
        }
    });

    return editor;
}

/**
 * 메시지 목록을 로드합니다.
 * @param {number} conversationId
 * @param {number} currentUserId
 * @returns {{ otherUserId: number|null, offset: number, hasMore: boolean }|null}
 */
export async function loadMessages(conversationId, currentUserId) {
    const messagesEl = document.getElementById('dm-messages');
    const otherUserEl = document.getElementById('dm-other-user');

    try {
        const result = await DMModel.getMessages(conversationId);

        if (!result.ok) {
            if (result.status === 401) {
                location.href = resolveNavPath(NAV_PATHS.LOGIN);
                return null;
            }
            if (result.status === 404) {
                showToast('대화를 찾을 수 없습니다.');
                return null;
            }
            showToast(UI_MESSAGES.DM_LOAD_FAIL);
            return null;
        }

        const messages = result.data?.data?.messages || [];
        const otherUser = result.data?.data?.other_user;
        let otherUserId = null;

        if (otherUser) {
            otherUserId = otherUser.user_id;
            DMDetailView.renderOtherUser(otherUser, otherUserEl);
        }

        const pagination = result.data?.data?.pagination;
        const hasMore = pagination?.has_more || false;

        DMDetailView.renderMessages(messages, currentUserId, messagesEl);
        DMDetailView.scrollToBottom(messagesEl);

        DMModel.markRead(conversationId).catch(err => {
            logger.warn('읽음 처리 실패', err);
        });

        return { otherUserId, offset: messages.length, hasMore };
    } catch (error) {
        logger.error('메시지 로드 실패', error);
        showToast(UI_MESSAGES.DM_LOAD_FAIL);
        return null;
    }
}

/**
 * 위로 스크롤 시 이전 메시지를 로드하는 핸들러를 설정합니다.
 * @param {Function} loadOlder - 이전 메시지 로드 콜백
 * @param {Function} canLoad - 로드 가능 여부를 반환하는 함수
 * @returns {Function|null} 정리용 핸들러 참조
 */
export function setupScrollPagination(loadOlder, canLoad) {
    const messagesEl = document.getElementById('dm-messages');
    if (!messagesEl) return null;

    const handler = () => {
        if (!canLoad()) return;
        if (messagesEl.scrollTop <= 50) loadOlder();
    };
    messagesEl.addEventListener('scroll', handler);
    return handler;
}

/**
 * 이전 메시지를 로드합니다 (위로 스크롤 페이지네이션).
 * @param {number} conversationId
 * @param {number} currentUserId
 * @param {number} currentOffset
 * @returns {{ offset: number, hasMore: boolean }}
 */
export async function loadOlderMessages(conversationId, currentUserId, currentOffset) {
    const messagesEl = document.getElementById('dm-messages');
    const prevScrollHeight = messagesEl?.scrollHeight || 0;

    try {
        const result = await DMModel.getMessages(conversationId, currentOffset);
        if (!result.ok) return { offset: currentOffset, hasMore: false };

        const messages = result.data?.data?.messages || [];
        const pagination = result.data?.data?.pagination;
        const hasMore = pagination?.has_more || false;
        const newOffset = currentOffset + messages.length;

        if (messages.length > 0 && messagesEl) {
            DMDetailView.prependMessages(messages, currentUserId, messagesEl);
            messagesEl.scrollTop = messagesEl.scrollHeight - prevScrollHeight;
        }

        return { offset: newOffset, hasMore };
    } catch (error) {
        logger.error('이전 메시지 로드 실패', error);
        return { offset: currentOffset, hasMore: false };
    }
}

/**
 * 메시지를 전송합니다.
 * @param {number} conversationId
 * @param {number} currentUserId
 * @param {MarkdownEditor} editor
 * @returns {boolean} 성공 여부
 */
export async function sendMessage(conversationId, currentUserId, editor) {
    const content = editor.getValue().trim();
    if (!content) return false;

    const sendBtn = document.getElementById('dm-send-btn');
    if (sendBtn) sendBtn.disabled = true;

    try {
        const result = await DMModel.sendMessage(conversationId, content);

        if (!result.ok) {
            showToast(result.status === 403 ? UI_MESSAGES.DM_BLOCKED : UI_MESSAGES.DM_SEND_FAIL);
            return false;
        }

        const message = result.data?.data?.message;
        if (message) {
            const messagesEl = document.getElementById('dm-messages');
            DMDetailView.appendMessage(message, currentUserId, messagesEl);
        }

        editor.setValue('');
        return true;
    } catch (error) {
        logger.error('메시지 전송 실패', error);
        showToast(UI_MESSAGES.DM_SEND_FAIL);
        return false;
    } finally {
        if (sendBtn) sendBtn.disabled = false;
    }
}

/**
 * 컨텍스트 메뉴 (우클릭 메시지 삭제)를 설정합니다.
 * @param {number} conversationId
 * @returns {Function|null} 정리용 핸들러 참조
 */
export function setupContextMenu(conversationId) {
    const messagesEl = document.getElementById('dm-messages');
    if (!messagesEl) return null;

    const handler = (e) => {
        const msgEl = e.target.closest('.dm-msg--mine:not(.dm-msg--deleted)');
        if (!msgEl) return;
        e.preventDefault();
        const messageId = Number(msgEl.dataset.messageId);
        if (!messageId) return;
        DMDetailView.showContextMenu(e.clientX, e.clientY, async () => {
            try {
                const result = await DMModel.deleteMessage(conversationId, messageId);
                if (!result.ok) {
                    showToast(UI_MESSAGES.DELETE_FAIL);
                    return;
                }
                DMDetailView.removeMessage(messageId, messagesEl);
            } catch (error) {
                logger.error('메시지 삭제 실패', error);
                showToast(UI_MESSAGES.DELETE_FAIL);
            }
        });
    };
    messagesEl.addEventListener('contextmenu', handler);
    return handler;
}

/**
 * 타이핑 인디케이터 발신/수신을 설정합니다.
 * @param {number} conversationId
 * @param {number} otherUserId
 * @returns {{ cleanup: Function }} 정리 함수
 */
export function setupTyping(conversationId, otherUserId) {
    let isTyping = false;
    let emitTimeout = null;
    let receiveTimeout = null;

    // 발신: textarea input 이벤트
    const textarea = document.querySelector('.dm-editor-textarea');
    const inputHandler = textarea ? () => {
        if (!isTyping) {
            isTyping = true;
            window.dispatchEvent(new CustomEvent('dm:send-typing', {
                detail: { type: 'typing_start', conversation_id: conversationId, recipient_id: otherUserId }
            }));
        }
        clearTimeout(emitTimeout);
        emitTimeout = setTimeout(() => {
            isTyping = false;
            window.dispatchEvent(new CustomEvent('dm:send-typing', {
                detail: { type: 'typing_stop', conversation_id: conversationId, recipient_id: otherUserId }
            }));
        }, 3000);
    } : null;

    if (textarea && inputHandler) {
        textarea.addEventListener('input', inputHandler);
    }

    // 수신: dm:typing 이벤트
    const typingEl = document.getElementById('dm-typing');
    const typingHandler = (e) => {
        const data = e.detail;
        if (!data || data.conversation_id !== conversationId) return;

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
    window.addEventListener('dm:typing', typingHandler);

    return {
        cleanup() {
            if (textarea && inputHandler) textarea.removeEventListener('input', inputHandler);
            window.removeEventListener('dm:typing', typingHandler);
            clearTimeout(emitTimeout);
            clearTimeout(receiveTimeout);
        }
    };
}

/**
 * 실시간 이벤트 리스너 (읽음 확인)를 설정합니다.
 * @param {Function} getConversationId - 현재 대화 ID를 반환하는 함수
 * @returns {Function} 정리 함수
 */
export function setupReadEventListener(getConversationId) {
    const handler = (e) => {
        const data = e.detail;
        if (!data || data.conversation_id !== getConversationId()) return;
        const messagesEl = document.getElementById('dm-messages');
        DMDetailView.updateReadStatus(messagesEl);
    };
    window.addEventListener('dm:message-read', handler);
    return () => window.removeEventListener('dm:message-read', handler);
}
