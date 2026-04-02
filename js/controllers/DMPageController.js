// js/controllers/DMPageController.js
// 데스크톱 DM 통합 페이지 컨트롤러
// 좌측 대화 목록 + 우측 채팅 영역을 오케스트레이션한다.

import DMModel from '../models/DMModel.js';
import DMListView from '../views/DMListView.js';
import DMDetailView from '../views/DMDetailView.js';
import AuthModel from '../models/AuthModel.js';
import { showToast } from '../views/helpers.js';
import { resolveNavPath } from '../config.js';
import { NAV_PATHS, UI_MESSAGES } from '../constants.js';
import { clearElement } from '../utils/dom.js';
import Logger from '../utils/Logger.js';
import * as dmChat from '../utils/dmChat.js';

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
let _msgScrollHandler = null;
let _contextMenuHandler = null;
let _sendBtnHandler = null;
let _deleteBtnHandler = null;
let _typingCleanup = null;

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
        _currentUserId = authResult.user.user_id;

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
                if (result.status === 403) {
                    showToast(result.data?.detail?.message || '접근 권한이 없습니다.');
                    return;
                }
                showToast(result.status >= 500
                    ? '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
                    : UI_MESSAGES.DM_LOAD_FAIL);
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

        // 공통 에디터 설정
        _editor = dmChat.setupEditor(() => DMPageController._sendMessage());

        // 전송 버튼
        DMPageController._setupSendButton();

        // 삭제 버튼
        DMPageController._setupDeleteButton();

        // 공통 메시지 로드
        const loadResult = await dmChat.loadMessages(_selectedConvId, _currentUserId);
        if (loadResult) {
            _otherUserId = loadResult.otherUserId;
            _msgOffset = loadResult.offset;
            _msgHasMore = loadResult.hasMore;
        }

        // 공통 스크롤 페이지네이션
        _msgScrollHandler = dmChat.setupScrollPagination(
            () => DMPageController._loadOlderMessages(),
            () => !_isLoadingMore && _msgHasMore,
        );

        // 공통 컨텍스트 메뉴
        _contextMenuHandler = dmChat.setupContextMenu(_selectedConvId);

        // 공통 타이핑 인디케이터
        if (_otherUserId) {
            _typingCleanup = dmChat.setupTyping(_selectedConvId, _otherUserId).cleanup;
        }
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

    // _setupEditor → dmChat.setupEditor()로 대체 (_selectConversation에서 호출)

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

    // _loadMessages → dmChat.loadMessages()로 대체 (_selectConversation에서 호출)

    /**
     * 메시지 전송
     * @private
     */
    static async _sendMessage() {
        if (_isSending || !_editor || !_selectedConvId) return;
        _isSending = true;
        try {
            await dmChat.sendMessage(_selectedConvId, _currentUserId, _editor);
        } finally {
            _isSending = false;
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
            if (noSelectionEl) noSelectionEl.style.display = '';
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

    // _setupMsgScrollPagination, _loadOlderMessages, _setupContextMenu,
    // _handleDeleteMessage, _setupTypingEmitter/Receiver → dmChat.*로 대체

    /**
     * 이전 메시지 로드 (공통 유틸 래퍼)
     * @private
     */
    static async _loadOlderMessages() {
        if (_isLoadingMore || !_msgHasMore) return;
        _isLoadingMore = true;
        try {
            const result = await dmChat.loadOlderMessages(_selectedConvId, _currentUserId, _msgOffset);
            _msgOffset = result.offset;
            _msgHasMore = result.hasMore;
        } finally {
            _isLoadingMore = false;
        }
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

        // 타이핑 (공통 유틸 cleanup)
        if (_typingCleanup) { _typingCleanup(); _typingCleanup = null; }

        // 타이핑 인디케이터 초기화
        const typingEl = document.getElementById('dm-typing');
        if (typingEl) clearElement(typingEl);

        // 에디터 정리용 DOM 클리어
        const editorEl = document.getElementById('dm-editor');
        if (editorEl) clearElement(editorEl);

        _editor = null;
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
