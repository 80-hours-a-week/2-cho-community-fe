// js/controllers/DMPageController.js
// 데스크톱 DM 통합 페이지 컨트롤러
// 좌측 대화 목록 + 우측 채팅 영역을 오케스트레이션한다.

import DMModel from '../models/DMModel.js';
import DMListView from '../views/DMListView.js';
import DMDetailView from '../views/DMDetailView.js';
import AuthModel from '../models/AuthModel.js';
import MarkdownEditor from '../components/MarkdownEditor.js';
import { showToast } from '../views/helpers.js';
import { resolveNavPath } from '../config.js';
import { NAV_PATHS, UI_MESSAGES } from '../constants.js';
import { createElement, clearElement } from '../utils/dom.js';
import Logger from '../utils/Logger.js';

const logger = Logger.createLogger('DMPageController');

// 모듈 레벨 상태 — 대화 목록
let _conversations = [];
let _listOffset = 0;
const _listLimit = 20;
let _listHasMore = false;
let _isListLoading = false;

// 모듈 레벨 상태 — 선택된 대화
let _selectedConvId = null;
let _currentUserId = null;
let _otherUserId = null;
let _editor = null;
let _isSending = false;
let _msgOffset = 0;
let _msgHasMore = false;
let _isLoadingMore = false;
let _isTyping = false;
let _typingTimeout = null;
let _typingReceiveTimeout = null;

// 이벤트 핸들러 참조 (정리용)
let _listScrollHandler = null;
let _searchInputHandler = null;
let _searchInputEl = null;
let _cardClickHandler = null;
let _resizeHandler = null;
let _resizeTimer = null;
let _newMessageHandler = null;
let _messageDeletedHandler = null;
let _readEventHandler = null;
let _typingEventHandler = null;
let _msgScrollHandler = null;
let _contextMenuHandler = null;
let _sendBtnHandler = null;
let _deleteBtnHandler = null;

/**
 * 데스크톱 DM 통합 페이지 컨트롤러
 */
export class DMPageController {
    /**
     * 컨트롤러 초기화
     */
    static async init() {
        // 상태 초기화
        _conversations = [];
        _listOffset = 0;
        _listHasMore = false;
        _isListLoading = false;
        _selectedConvId = null;

        // 현재 사용자 정보 가져오기
        const authResult = await AuthModel.checkAuthStatus();
        if (!authResult.isAuthenticated || !authResult.user) {
            location.href = resolveNavPath(NAV_PATHS.LOGIN);
            return;
        }
        _currentUserId = authResult.user.id;

        // 리사이즈 핸들러 (모바일 전환 감지)
        DMPageController._setupResizeHandler();

        // 대화 목록 카드 클릭 위임
        DMPageController._setupCardClickDelegation();

        // 검색 설정
        DMPageController._setupSearch();

        // 실시간 이벤트 리스너
        DMPageController._setupRealtimeListeners();

        // 무한 스크롤 (대화 목록)
        DMPageController._setupListInfiniteScroll();

        // 대화 목록 로드
        await DMPageController._loadConversations();
    }

    // =============================
    // 대화 목록 (좌측 사이드바)
    // =============================

    /**
     * 대화 목록 로드 (페이지네이션)
     * @private
     */
    static async _loadConversations() {
        if (_isListLoading) return;
        _isListLoading = true;

        const listEl = document.getElementById('dm-list');
        const emptyEl = document.getElementById('dm-empty');

        try {
            const result = await DMModel.getConversations(_listOffset, _listLimit);

            if (!result.ok) {
                if (result.status === 401) {
                    location.href = resolveNavPath(NAV_PATHS.LOGIN);
                    return;
                }
                showToast(UI_MESSAGES.DM_LOAD_FAIL);
                return;
            }

            const conversations = result.data?.data?.conversations || [];
            const totalCount = result.data?.data?.pagination?.total_count || 0;

            if (conversations.length === 0 && _listOffset === 0) {
                DMListView.showEmpty(emptyEl);
                return;
            }

            DMListView.hideEmpty(emptyEl);
            // 카드를 렌더링하되, 기존 클릭 핸들러 대신 위임 방식 사용
            DMPageController._renderConversationCards(conversations, listEl);

            _conversations.push(...conversations);
            _listOffset += conversations.length;
            _listHasMore = _listOffset < totalCount;
        } catch (error) {
            logger.error('대화 목록 로드 실패', error);
            showToast(UI_MESSAGES.DM_LOAD_FAIL);
        } finally {
            _isListLoading = false;
        }
    }

    /**
     * 대화 카드 렌더링 (페이지 이동 대신 패널 선택)
     * DMListView.createConversationCard는 내부에 click → navigate 이벤트가 있으므로,
     * 여기서는 카드를 생성한 뒤 이벤트 위임으로 처리한다.
     * @param {Array} conversations
     * @param {HTMLElement} container
     * @private
     */
    static _renderConversationCards(conversations, container) {
        if (!container) return;

        conversations.forEach(conv => {
            const card = DMListView.createConversationCard(conv);
            // DMListView.createConversationCard가 붙인 click 이벤트를 무력화하기 위해
            // cloneNode(true)로 리스너 없는 복제본 생성
            const clone = card.cloneNode(true);
            container.appendChild(clone);
        });
    }

    /**
     * 카드 클릭 이벤트 위임 설정
     * @private
     */
    static _setupCardClickDelegation() {
        const listEl = document.getElementById('dm-list');
        if (!listEl) return;

        _cardClickHandler = (e) => {
            const card = e.target.closest('.dm-card');
            if (!card) return;
            e.preventDefault();
            e.stopPropagation();

            const convId = Number(card.dataset.id);
            if (!convId || convId === _selectedConvId) return;

            DMPageController._selectConversation(convId);
        };
        listEl.addEventListener('click', _cardClickHandler);
    }

    /**
     * 대화 목록 무한 스크롤 설정
     * @private
     */
    static _setupListInfiniteScroll() {
        const listEl = document.getElementById('dm-list');
        if (!listEl) return;

        _listScrollHandler = () => {
            if (_isListLoading || !_listHasMore) return;
            const { scrollTop, scrollHeight, clientHeight } = listEl;
            if (scrollTop + clientHeight >= scrollHeight - 100) {
                DMPageController._loadConversations();
            }
        };
        listEl.addEventListener('scroll', _listScrollHandler);
    }

    /**
     * 닉네임 검색 설정
     * @private
     */
    static _setupSearch() {
        _searchInputEl = document.getElementById('dm-search');
        if (!_searchInputEl) return;

        _searchInputHandler = (e) => {
            const query = e.target.value.trim().toLowerCase();
            const listEl = document.getElementById('dm-list');
            if (!listEl) return;

            _conversations.forEach(conv => {
                const convId = conv.id || conv.conversation_id;
                const card = listEl.querySelector(`[data-id="${convId}"]`);
                if (!card) return;

                const nickname = (conv.other_user?.nickname || '').toLowerCase();
                if (!query || nickname.includes(query)) {
                    card.classList.remove('hidden');
                } else {
                    card.classList.add('hidden');
                }
            });
        };
        _searchInputEl.addEventListener('input', _searchInputHandler);
    }

    /**
     * 리사이즈 핸들러 (모바일 전환 감지)
     * @private
     */
    static _setupResizeHandler() {
        _resizeHandler = () => {
            clearTimeout(_resizeTimer);
            _resizeTimer = setTimeout(() => {
                if (window.innerWidth < 768) {
                    // 모바일이면 적절한 페이지로 리다이렉트
                    if (_selectedConvId) {
                        location.replace(resolveNavPath(NAV_PATHS.DM_DETAIL(_selectedConvId)));
                    } else {
                        location.replace(resolveNavPath(NAV_PATHS.DM_LIST));
                    }
                }
            }, 300);
        };
        window.addEventListener('resize', _resizeHandler);
    }

    // =============================
    // 대화 선택 (우측 패널)
    // =============================

    /**
     * 대화 선택 — 우측 패널에 채팅 로드
     * @param {number} convId - 대화 ID
     * @private
     */
    static async _selectConversation(convId) {
        // 이전 대화 상태 정리
        DMPageController._destroyConversationState();

        _selectedConvId = convId;

        // 활성 카드 스타일 업데이트
        DMPageController._updateActiveCard(convId);

        // UI 전환: 선택 안내 숨기고 채팅 영역 표시
        const noSelectionEl = document.getElementById('dm-no-selection');
        const chatAreaEl = document.getElementById('dm-chat-area');
        if (noSelectionEl) noSelectionEl.style.display = 'none';
        if (chatAreaEl) chatAreaEl.style.display = 'flex';

        // 에디터 설정
        DMPageController._setupEditor();

        // 전송 버튼
        DMPageController._setupSendButton();

        // 삭제 버튼
        DMPageController._setupDeleteButton();

        // 메시지 로드
        await DMPageController._loadMessages();

        // 스크롤 페이지네이션
        DMPageController._setupMsgScrollPagination();

        // 컨텍스트 메뉴 (메시지 삭제)
        DMPageController._setupContextMenu();

        // 타이핑 인디케이터
        DMPageController._setupTypingEmitter();
        DMPageController._setupTypingReceiver();
    }

    /**
     * 활성 카드 스타일 업데이트
     * @param {number} convId
     * @private
     */
    static _updateActiveCard(convId) {
        const listEl = document.getElementById('dm-list');
        if (!listEl) return;

        // 기존 활성 클래스 제거
        const prevActive = listEl.querySelector('.dm-card--active');
        if (prevActive) prevActive.classList.remove('dm-card--active');

        // 새 카드에 활성 클래스 추가
        const card = listEl.querySelector(`[data-id="${convId}"]`);
        if (card) {
            card.classList.add('dm-card--active');
            // 읽음 처리: unread 배지 제거
            card.classList.remove('unread');
            const badge = card.querySelector('.dm-unread-badge');
            if (badge) badge.remove();
        }

        // conversations 배열에서도 unread_count 초기화
        const conv = _conversations.find(c => (c.id || c.conversation_id) === convId);
        if (conv) conv.unread_count = 0;
    }

    /**
     * 마크다운 에디터 설정
     * @private
     */
    static _setupEditor() {
        const editorEl = document.getElementById('dm-editor');
        if (!editorEl) return;

        clearElement(editorEl);

        const textarea = createElement('textarea', {
            className: 'dm-editor-textarea',
        });
        textarea.placeholder = '메시지를 입력하세요...';
        textarea.rows = 3;
        editorEl.appendChild(textarea);

        _editor = new MarkdownEditor(textarea, { compact: true });

        // Enter로 전송 (Shift+Enter는 줄바꿈)
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                DMPageController._sendMessage();
            }
        });
    }

    /**
     * 전송 버튼 이벤트 설정
     * @private
     */
    static _setupSendButton() {
        const sendBtn = document.getElementById('dm-send-btn');
        if (!sendBtn) return;

        // 기존 리스너 제거 (cloneNode 패턴)
        const newBtn = sendBtn.cloneNode(true);
        sendBtn.parentNode.replaceChild(newBtn, sendBtn);

        _sendBtnHandler = () => DMPageController._sendMessage();
        newBtn.addEventListener('click', _sendBtnHandler);
    }

    /**
     * 삭제 버튼 이벤트 설정
     * @private
     */
    static _setupDeleteButton() {
        const deleteBtn = document.getElementById('dm-delete-btn');
        if (!deleteBtn) return;

        const newBtn = deleteBtn.cloneNode(true);
        deleteBtn.parentNode.replaceChild(newBtn, deleteBtn);

        _deleteBtnHandler = () => DMPageController._handleDeleteConversation();
        newBtn.addEventListener('click', _deleteBtnHandler);
    }

    /**
     * 메시지 목록 로드
     * @private
     */
    static async _loadMessages() {
        const messagesEl = document.getElementById('dm-messages');
        const otherUserEl = document.getElementById('dm-other-user');

        _msgOffset = 0;
        _msgHasMore = false;

        try {
            const result = await DMModel.getMessages(_selectedConvId);

            if (!result.ok) {
                if (result.status === 401) {
                    location.href = resolveNavPath(NAV_PATHS.LOGIN);
                    return;
                }
                if (result.status === 404) {
                    showToast('대화를 찾을 수 없습니다.');
                    return;
                }
                showToast(UI_MESSAGES.DM_LOAD_FAIL);
                return;
            }

            const messages = result.data?.data?.messages || [];
            const otherUser = result.data?.data?.other_user;

            if (otherUser) {
                _otherUserId = otherUser.user_id;
                DMDetailView.renderOtherUser(otherUser, otherUserEl);
            }

            const pagination = result.data?.data?.pagination;
            _msgHasMore = pagination?.has_more || false;
            _msgOffset = messages.length;

            DMDetailView.renderMessages(messages, _currentUserId, messagesEl);
            DMDetailView.scrollToBottom(messagesEl);

            // 읽음 처리
            DMModel.markRead(_selectedConvId).catch(err => {
                logger.warn('읽음 처리 실패', err);
            });
        } catch (error) {
            logger.error('메시지 로드 실패', error);
            showToast(UI_MESSAGES.DM_LOAD_FAIL);
        }
    }

    /**
     * 메시지 전송
     * @private
     */
    static async _sendMessage() {
        if (_isSending || !_editor || !_selectedConvId) return;

        const content = _editor.getValue().trim();
        if (!content) return;

        _isSending = true;
        const sendBtn = document.getElementById('dm-send-btn');
        if (sendBtn) sendBtn.disabled = true;

        try {
            const result = await DMModel.sendMessage(_selectedConvId, content);

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
     * 대화 삭제 처리
     * @private
     */
    static async _handleDeleteConversation() {
        const confirmed = confirm('이 대화를 삭제하시겠습니까?');
        if (!confirmed) return;

        try {
            const result = await DMModel.deleteConversation(_selectedConvId);

            if (!result.ok) {
                showToast(UI_MESSAGES.DELETE_FAIL);
                return;
            }

            showToast(UI_MESSAGES.DM_DELETE_SUCCESS);

            // 목록에서 카드 제거
            const listEl = document.getElementById('dm-list');
            const card = listEl?.querySelector(`[data-id="${_selectedConvId}"]`);
            if (card) card.remove();

            // conversations 배열에서도 제거
            _conversations = _conversations.filter(
                c => (c.id || c.conversation_id) !== _selectedConvId
            );

            // 우측 패널 초기 상태로
            DMPageController._destroyConversationState();
            _selectedConvId = null;
            const noSelectionEl = document.getElementById('dm-no-selection');
            const chatAreaEl = document.getElementById('dm-chat-area');
            if (noSelectionEl) noSelectionEl.style.display = 'flex';
            if (chatAreaEl) chatAreaEl.style.display = 'none';

            // 목록이 비었으면 빈 상태 표시
            if (_conversations.length === 0) {
                const emptyEl = document.getElementById('dm-empty');
                DMListView.showEmpty(emptyEl);
            }
        } catch (error) {
            logger.error('대화 삭제 실패', error);
            showToast(UI_MESSAGES.DELETE_FAIL);
        }
    }

    /**
     * 위로 스크롤 시 이전 메시지 로드 설정
     * @private
     */
    static _setupMsgScrollPagination() {
        const messagesEl = document.getElementById('dm-messages');
        if (!messagesEl) return;

        _msgScrollHandler = () => {
            if (_isLoadingMore || !_msgHasMore) return;
            if (messagesEl.scrollTop <= 50) {
                DMPageController._loadOlderMessages();
            }
        };
        messagesEl.addEventListener('scroll', _msgScrollHandler);
    }

    /**
     * 이전 메시지 로드
     * @private
     */
    static async _loadOlderMessages() {
        if (_isLoadingMore || !_msgHasMore) return;
        _isLoadingMore = true;

        const messagesEl = document.getElementById('dm-messages');
        const prevScrollHeight = messagesEl?.scrollHeight || 0;

        try {
            const result = await DMModel.getMessages(_selectedConvId, _msgOffset);
            if (!result.ok) return;

            const messages = result.data?.data?.messages || [];
            const pagination = result.data?.data?.pagination;
            _msgHasMore = pagination?.has_more || false;
            _msgOffset += messages.length;

            if (messages.length > 0 && messagesEl) {
                DMDetailView.prependMessages(messages, _currentUserId, messagesEl);
                messagesEl.scrollTop = messagesEl.scrollHeight - prevScrollHeight;
            }
        } catch (error) {
            logger.error('이전 메시지 로드 실패', error);
        } finally {
            _isLoadingMore = false;
        }
    }

    /**
     * 컨텍스트 메뉴 설정 (내 메시지 우클릭 삭제)
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
                DMPageController._handleDeleteMessage(messageId);
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
            const result = await DMModel.deleteMessage(_selectedConvId, messageId);
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

    // =============================
    // 타이핑 인디케이터
    // =============================

    /**
     * 타이핑 발신 설정
     * @private
     */
    static _setupTypingEmitter() {
        const textarea = document.querySelector('#dm-chat-area .dm-editor-textarea');
        if (!textarea || !_otherUserId) return;

        textarea.addEventListener('input', () => {
            DMPageController._emitTyping();
        });
    }

    /**
     * 타이핑 이벤트 발신
     * @private
     */
    static _emitTyping() {
        if (!_otherUserId || !_selectedConvId) return;

        if (!_isTyping) {
            _isTyping = true;
            window.dispatchEvent(new CustomEvent('dm:send-typing', {
                detail: {
                    type: 'typing_start',
                    conversation_id: _selectedConvId,
                    recipient_id: _otherUserId,
                }
            }));
        }

        clearTimeout(_typingTimeout);
        _typingTimeout = setTimeout(() => {
            _isTyping = false;
            window.dispatchEvent(new CustomEvent('dm:send-typing', {
                detail: {
                    type: 'typing_stop',
                    conversation_id: _selectedConvId,
                    recipient_id: _otherUserId,
                }
            }));
        }, 3000);
    }

    /**
     * 타이핑 인디케이터 수신 설정
     * @private
     */
    static _setupTypingReceiver() {
        const typingEl = document.getElementById('dm-typing');

        _typingEventHandler = (e) => {
            const data = e.detail;
            if (!data || data.conversation_id !== _selectedConvId) return;

            if (data.type === 'typing_start') {
                DMDetailView.renderTypingIndicator(typingEl, true);
                clearTimeout(_typingReceiveTimeout);
                _typingReceiveTimeout = setTimeout(() => {
                    DMDetailView.renderTypingIndicator(typingEl, false);
                }, 3000);
            } else {
                clearTimeout(_typingReceiveTimeout);
                DMDetailView.renderTypingIndicator(typingEl, false);
            }
        };
        window.addEventListener('dm:typing', _typingEventHandler);
    }

    // =============================
    // 실시간 이벤트 리스너
    // =============================

    /**
     * WebSocket 실시간 이벤트 리스너 설정
     * @private
     */
    static _setupRealtimeListeners() {
        const listEl = document.getElementById('dm-list');
        const emptyEl = document.getElementById('dm-empty');

        // 새 메시지 수신
        _newMessageHandler = (e) => {
            const detail = e.detail || {};
            const { conversation_id, content, created_at } = detail;
            if (!conversation_id) return;

            // 좌측 목록 카드 업데이트
            const existing = _conversations.find(
                c => (c.id || c.conversation_id) === conversation_id
            );

            if (existing) {
                const isSelected = conversation_id === _selectedConvId;
                const currentUnread = existing.unread_count || 0;
                const newUnread = isSelected ? 0 : currentUnread + 1;

                DMListView.updateConversationCard(conversation_id, {
                    preview: content || '',
                    time: created_at || new Date().toISOString(),
                    unread_count: newUnread,
                });
                existing.unread_count = newUnread;
                if (typeof existing.last_message === 'object') {
                    existing.last_message = { ...existing.last_message, content, is_deleted: false };
                } else {
                    existing.last_message = content;
                }
                existing.last_message_at = created_at || new Date().toISOString();

                DMListView.moveCardToTop(conversation_id, listEl);
            } else {
                // 새 대화 카드 생성
                const newConv = {
                    id: conversation_id,
                    other_user: {
                        nickname: detail.sender_nickname || '알 수 없음',
                        profile_image_url: detail.sender_profile_image || null,
                    },
                    last_message: content || '새 대화',
                    last_message_at: created_at || new Date().toISOString(),
                    unread_count: conversation_id === _selectedConvId ? 0 : 1,
                };
                _conversations.unshift(newConv);

                const card = DMListView.createConversationCard(newConv);
                const clone = card.cloneNode(true);
                if (listEl && listEl.firstChild) {
                    listEl.insertBefore(clone, listEl.firstChild);
                } else if (listEl) {
                    listEl.appendChild(clone);
                }

                DMListView.hideEmpty(emptyEl);
            }

            // 우측 패널: 현재 선택된 대화의 메시지이면 append
            if (conversation_id === _selectedConvId) {
                const messagesEl = document.getElementById('dm-messages');
                DMDetailView.appendMessage(detail, _currentUserId, messagesEl);

                // 읽음 처리
                DMModel.markRead(_selectedConvId).catch(err => {
                    logger.warn('실시간 메시지 읽음 처리 실패', err);
                });
            }
        };
        window.addEventListener('dm:new-message', _newMessageHandler);

        // 메시지 삭제 수신
        _messageDeletedHandler = (e) => {
            const { conversation_id, message_id } = e.detail || {};
            if (!conversation_id) return;

            // 목록 카드 프리뷰 업데이트
            const conv = _conversations.find(
                c => (c.id || c.conversation_id) === conversation_id
            );
            if (conv) {
                const lastMsgId = typeof conv.last_message === 'object'
                    ? conv.last_message?.id
                    : null;
                const isLastMessage = lastMsgId === message_id || !lastMsgId;

                if (isLastMessage) {
                    DMListView.updateConversationCard(conversation_id, {
                        preview: '삭제된 메시지입니다',
                        is_deleted: true,
                    });
                    if (typeof conv.last_message === 'object') {
                        conv.last_message.is_deleted = true;
                    } else {
                        conv.last_message = { content: '', is_deleted: true };
                    }
                }
            }

            // 우측 패널: 현재 대화의 메시지이면 플레이스홀더로 교체
            if (conversation_id === _selectedConvId) {
                const messagesEl = document.getElementById('dm-messages');
                DMDetailView.removeMessage(message_id, messagesEl);
            }
        };
        window.addEventListener('dm:message-deleted', _messageDeletedHandler);

        // 읽음 확인 수신
        _readEventHandler = (e) => {
            const data = e.detail;
            if (!data || data.conversation_id !== _selectedConvId) return;
            const messagesEl = document.getElementById('dm-messages');
            DMDetailView.updateReadStatus(messagesEl);
        };
        window.addEventListener('dm:message-read', _readEventHandler);
    }

    // =============================
    // 정리 (destroy)
    // =============================

    /**
     * 선택된 대화 관련 상태만 정리 (대화 전환 시 호출)
     * @private
     */
    static _destroyConversationState() {
        // 메시지 스크롤 핸들러
        if (_msgScrollHandler) {
            const messagesEl = document.getElementById('dm-messages');
            if (messagesEl) messagesEl.removeEventListener('scroll', _msgScrollHandler);
            _msgScrollHandler = null;
        }

        // 컨텍스트 메뉴 핸들러
        if (_contextMenuHandler) {
            const messagesEl = document.getElementById('dm-messages');
            if (messagesEl) messagesEl.removeEventListener('contextmenu', _contextMenuHandler);
            _contextMenuHandler = null;
        }
        DMDetailView.hideContextMenu();

        // 타이핑 타임아웃
        if (_typingTimeout) {
            clearTimeout(_typingTimeout);
            _typingTimeout = null;
        }
        if (_typingReceiveTimeout) {
            clearTimeout(_typingReceiveTimeout);
            _typingReceiveTimeout = null;
        }

        // 타이핑 이벤트 핸들러
        if (_typingEventHandler) {
            window.removeEventListener('dm:typing', _typingEventHandler);
            _typingEventHandler = null;
        }

        // 타이핑 인디케이터 초기화
        const typingEl = document.getElementById('dm-typing');
        if (typingEl) clearElement(typingEl);

        // 에디터 정리
        _editor = null;
        _isSending = false;
        _isTyping = false;
        _otherUserId = null;
        _msgOffset = 0;
        _msgHasMore = false;
        _isLoadingMore = false;
    }

    /**
     * 컨트롤러 전체 정리 (페이지 이탈 시 호출)
     */
    static destroy() {
        // 대화 상태 정리
        DMPageController._destroyConversationState();

        // 대화 목록 스크롤
        if (_listScrollHandler) {
            const listEl = document.getElementById('dm-list');
            if (listEl) listEl.removeEventListener('scroll', _listScrollHandler);
            _listScrollHandler = null;
        }

        // 카드 클릭 위임
        if (_cardClickHandler) {
            const listEl = document.getElementById('dm-list');
            if (listEl) listEl.removeEventListener('click', _cardClickHandler);
            _cardClickHandler = null;
        }

        // 검색
        if (_searchInputEl && _searchInputHandler) {
            _searchInputEl.removeEventListener('input', _searchInputHandler);
            _searchInputHandler = null;
            _searchInputEl = null;
        }

        // 리사이즈
        if (_resizeHandler) {
            window.removeEventListener('resize', _resizeHandler);
            _resizeHandler = null;
        }
        if (_resizeTimer) {
            clearTimeout(_resizeTimer);
            _resizeTimer = null;
        }

        // 실시간 이벤트
        if (_newMessageHandler) {
            window.removeEventListener('dm:new-message', _newMessageHandler);
            _newMessageHandler = null;
        }
        if (_messageDeletedHandler) {
            window.removeEventListener('dm:message-deleted', _messageDeletedHandler);
            _messageDeletedHandler = null;
        }
        if (_readEventHandler) {
            window.removeEventListener('dm:message-read', _readEventHandler);
            _readEventHandler = null;
        }

        _selectedConvId = null;
        _currentUserId = null;
        _conversations = [];
    }
}
