// js/controllers/DMListController.js
// DM 대화 목록 페이지 컨트롤러

import DMModel from '../models/DMModel.js';
import DMListView from '../views/DMListView.js';
import { showToast } from '../views/helpers.js';
import { resolveNavPath } from '../config.js';
import { NAV_PATHS, UI_MESSAGES } from '../constants.js';
import Logger from '../utils/Logger.js';

const logger = Logger.createLogger('DMListController');

// 모듈 레벨 상태
let _conversations = [];
let _offset = 0;
const _limit = 20;
let _hasMore = false;
let _isLoading = false;
let _scrollHandler = null;
let _newMessageHandler = null;
let _messageDeletedHandler = null;
let _searchInputHandler = null;
let _searchInputEl = null;

/**
 * DM 대화 목록 페이지 컨트롤러
 * 무한 스크롤로 대화 목록을 관리한다.
 */
export class DMListController {
    /**
     * 컨트롤러 초기화
     */
    static async init() {
        // 상태 초기화
        _conversations = [];
        _offset = 0;
        _hasMore = false;
        _isLoading = false;

        DMListController._setupInfiniteScroll();
        DMListController._setupRealtimeListeners();
        DMListController._setupSearch();
        await DMListController._loadConversations();
    }

    /**
     * 무한 스크롤 설정
     * @private
     */
    static _setupInfiniteScroll() {
        _scrollHandler = () => {
            if (_isLoading || !_hasMore) return;
            const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
            if (scrollTop + clientHeight >= scrollHeight - 100) {
                DMListController._loadConversations();
            }
        };
        window.addEventListener('scroll', _scrollHandler);
    }

    /**
     * WebSocket 실시간 이벤트 리스너 설정
     * @private
     */
    static _setupRealtimeListeners() {
        const listEl = document.getElementById('dm-list');
        const emptyEl = document.getElementById('dm-empty');

        // 새 메시지 수신 시 대화 카드 업데이트
        _newMessageHandler = (e) => {
            const { conversation_id, content, created_at, sender } = e.detail || {};
            if (!conversation_id) return;

            const existing = _conversations.find(
                c => (c.id || c.conversation_id) === conversation_id
            );

            if (existing) {
                // 기존 대화 카드 업데이트
                const currentUnread = existing.unread_count || 0;
                DMListView.updateConversationCard(conversation_id, {
                    preview: content || '',
                    time: created_at || new Date().toISOString(),
                    unread_count: currentUnread + 1,
                });
                existing.unread_count = currentUnread + 1;
                if (typeof existing.last_message === 'object') {
                    existing.last_message = { ...existing.last_message, content, is_deleted: false };
                } else {
                    existing.last_message = content;
                }
                existing.last_message_at = created_at || new Date().toISOString();

                // 카드를 최상단으로 이동
                DMListView.moveCardToTop(conversation_id, listEl);
            } else {
                // 새 대화 — 카드 생성 후 prepend
                const newConv = {
                    id: conversation_id,
                    other_user: sender || { nickname: '알 수 없음' },
                    last_message: content || '새 대화',
                    last_message_at: created_at || new Date().toISOString(),
                    unread_count: 1,
                };
                _conversations.unshift(newConv);

                const card = DMListView.createConversationCard(newConv);
                if (listEl && listEl.firstChild) {
                    listEl.insertBefore(card, listEl.firstChild);
                } else if (listEl) {
                    listEl.appendChild(card);
                }

                // 빈 상태 숨기기
                DMListView.hideEmpty(emptyEl);
            }
        };
        window.addEventListener('dm:new-message', _newMessageHandler);

        // 메시지 삭제 시 마지막 메시지 프리뷰 업데이트
        _messageDeletedHandler = (e) => {
            const { conversation_id, message_id } = e.detail || {};
            if (!conversation_id) return;

            const conv = _conversations.find(
                c => (c.id || c.conversation_id) === conversation_id
            );
            if (!conv) return;

            // 삭제된 메시지가 마지막 메시지인지 확인
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
        };
        window.addEventListener('dm:message-deleted', _messageDeletedHandler);
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
     * 대화 목록 로드 (페이지네이션)
     * @private
     */
    static async _loadConversations() {
        if (_isLoading) return;
        _isLoading = true;

        const listEl = document.getElementById('dm-list');
        const emptyEl = document.getElementById('dm-empty');

        try {
            const result = await DMModel.getConversations(_offset, _limit);

            if (!result.ok) {
                // 미인증 시 로그인 페이지로 이동
                if (result.status === 401) {
                    location.href = resolveNavPath(NAV_PATHS.LOGIN);
                    return;
                }
                showToast(UI_MESSAGES.DM_LOAD_FAIL);
                return;
            }

            const conversations = result.data?.data?.conversations || [];
            const totalCount = result.data?.data?.pagination?.total_count || 0;

            // 첫 로드 시 데이터가 없으면 빈 상태 표시
            if (conversations.length === 0 && _offset === 0) {
                DMListView.showEmpty(emptyEl);
                return;
            }

            DMListView.hideEmpty(emptyEl);
            DMListView.renderConversations(conversations, listEl);

            _conversations.push(...conversations);
            _offset += conversations.length;
            _hasMore = _offset < totalCount;
        } catch (error) {
            logger.error('대화 목록 로드 실패', error);
            showToast(UI_MESSAGES.DM_LOAD_FAIL);
        } finally {
            _isLoading = false;
        }
    }

    /**
     * 컨트롤러 정리 (모든 이벤트 리스너 제거)
     */
    static destroy() {
        if (_scrollHandler) {
            window.removeEventListener('scroll', _scrollHandler);
            _scrollHandler = null;
        }
        if (_newMessageHandler) {
            window.removeEventListener('dm:new-message', _newMessageHandler);
            _newMessageHandler = null;
        }
        if (_messageDeletedHandler) {
            window.removeEventListener('dm:message-deleted', _messageDeletedHandler);
            _messageDeletedHandler = null;
        }
        if (_searchInputEl && _searchInputHandler) {
            _searchInputEl.removeEventListener('input', _searchInputHandler);
            _searchInputHandler = null;
            _searchInputEl = null;
        }
    }
}
