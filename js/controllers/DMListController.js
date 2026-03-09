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
     * 컨트롤러 정리 (스크롤 핸들러 제거)
     */
    static destroy() {
        if (_scrollHandler) {
            window.removeEventListener('scroll', _scrollHandler);
            _scrollHandler = null;
        }
    }
}
