// js/controllers/MainController.js
// 메인 페이지 컨트롤러 (게시글 목록, 무한 스크롤)

import PostModel from '../models/PostModel.js';
import PostListView from '../views/PostListView.js';
import Logger from '../utils/Logger.js';
import { NAV_PATHS, UI_MESSAGES } from '../constants.js';

const logger = Logger.createLogger('MainController');

/**
 * 메인 페이지 컨트롤러
 */
class MainController {
    constructor() {
        this.currentOffset = 0;
        this.LIMIT = 10;
        this.isLoading = false;
        this.hasMore = true;
        // 중복 게시물 감지를 위한 Set
        this.loadedPostIds = new Set();
        // IntersectionObserver 참조 (cleanup용)
        this.scrollObserver = null;
    }

    /**
     * 컨트롤러 초기화
     */
    async init() {
        // 헤더의 인증 관련 로직은 HeaderController에서 처리
        await this._loadPosts();
        this._setupInfiniteScroll();

        // 게시글 작성 버튼
        const writeBtn = document.getElementById('write-btn');
        if (writeBtn) {
            writeBtn.addEventListener('click', () => {
                location.href = NAV_PATHS.WRITE;
            });
        }
    }

    /**
     * 무한 스크롤 설정
     * @private
     */
    _setupInfiniteScroll() {
        const sentinel = document.getElementById('loading-sentinel');
        if (!sentinel) return;

        // 기존 observer가 있으면 정리
        if (this.scrollObserver) {
            this.scrollObserver.disconnect();
        }

        this.scrollObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !this.isLoading && this.hasMore) {
                this._loadPosts();
            }
        }, { threshold: 0.1 });

        this.scrollObserver.observe(sentinel);
    }

    /**
     * 컨트롤러 정리 (페이지 이탈 시 호출)
     */
    destroy() {
        if (this.scrollObserver) {
            this.scrollObserver.disconnect();
            this.scrollObserver = null;
        }
    }

    /**
     * 게시글 목록 로드
     * @private
     */
    async _loadPosts() {
        if (this.isLoading || !this.hasMore) return;

        this.isLoading = true;
        const listElement = document.getElementById('post-list');
        const sentinel = document.getElementById('loading-sentinel');

        PostListView.toggleLoadingSentinel(sentinel, true);

        try {
            const result = await PostModel.getPosts(this.currentOffset, this.LIMIT);

            if (!result.ok) throw new Error(UI_MESSAGES.POST_LOAD_FAIL);

            const posts = result.data?.data?.posts || [];
            const pagination = result.data?.data?.pagination;

            // 중복 게시물 필터링
            // 무한 스크롤 시 데이터 순서 변경으로 인해 이미 로드한 게시물이 다시 내려올 수 있음.
            const newPosts = posts.filter(post => !this.loadedPostIds.has(post.post_id));

            if (newPosts.length < posts.length) {
                logger.warn(`${posts.length - newPosts.length}개의 중복 게시물 제외`);
            }

            // 새로운 게시물 ID 저장
            newPosts.forEach(post => this.loadedPostIds.add(post.post_id));

            // API 응답의 pagination 정보 또는 반환 개수로 hasMore 결정
            if (posts.length < this.LIMIT ||
                (pagination && !pagination.has_more) ||
                (pagination && this.currentOffset + posts.length >= pagination.total_count)) {
                this.hasMore = false;
                PostListView.toggleLoadingSentinel(sentinel, false);
            }

            if (this.currentOffset === 0 && newPosts.length === 0) {
                PostListView.showEmptyState(listElement);
                this.hasMore = false;
                PostListView.toggleLoadingSentinel(sentinel, false);
                return;
            }

            // 새로운 게시물만 렌더링
            if (newPosts.length > 0) {
                PostListView.renderPosts(listElement, newPosts, (postId) => {
                    location.href = NAV_PATHS.DETAIL(postId);
                });
            }

            this.currentOffset += this.LIMIT;

        } catch (error) {
            logger.error('게시글 목록 로딩 실패', error);
            PostListView.showSentinelError(sentinel, UI_MESSAGES.UNKNOWN_ERROR);
        } finally {
            this.isLoading = false;
        }
    }
}

export default MainController;
