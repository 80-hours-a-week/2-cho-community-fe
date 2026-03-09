// js/controllers/MainController.js
// 메인 페이지 컨트롤러 (게시글 목록, 무한 스크롤)

import PostModel from '../models/PostModel.js';
import CategoryModel from '../models/CategoryModel.js';
import PostListView from '../views/PostListView.js';
import Logger from '../utils/Logger.js';
import { NAV_PATHS, UI_MESSAGES } from '../constants.js';
import { resolveNavPath } from '../config.js';
import { getAccessToken } from '../services/ApiService.js';

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
        this.currentSearch = null;
        this.currentSort = 'latest';
        this.currentCategory = null;
        this.currentTag = null;
        this.currentFollowing = false;
        this.currentForYou = false;
        // 검색/정렬 변경 시 이전 요청의 응답을 무시하기 위한 세대 카운터
        this.loadGeneration = 0;
    }

    /**
     * 컨트롤러 초기화
     */
    async init() {
        // URL 파라미터에서 태그 필터 읽기
        const urlParams = new URLSearchParams(window.location.search);
        const tagParam = urlParams.get('tag');
        if (tagParam) {
            this.currentTag = tagParam;
        }

        // 헤더의 인증 관련 로직은 HeaderController에서 처리
        await this._loadCategories();
        await this._loadPosts();
        this._setupInfiniteScroll();
        this._setupSearchAndSort();

        // 로그인 상태이면 추천/팔로잉 버튼 표시
        if (getAccessToken()) {
            const forYouBtn = document.getElementById('foryou-btn');
            const followingBtn = document.getElementById('following-btn');
            const filterDivider = document.getElementById('filter-divider');
            if (forYouBtn) forYouBtn.classList.remove('hidden');
            if (followingBtn) followingBtn.classList.remove('hidden');
            if (filterDivider) filterDivider.classList.remove('hidden');
        }

        // 게시글 작성 버튼
        const writeBtn = document.getElementById('write-btn');
        if (writeBtn) {
            writeBtn.addEventListener('click', () => {
                location.href = resolveNavPath(NAV_PATHS.WRITE);
            });
        }
    }

    /**
     * 검색바와 정렬 버튼 이벤트를 설정합니다.
     * @private
     */
    _setupSearchAndSort() {
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');
        const sortButtons = document.getElementById('sort-buttons');

        const doSearch = () => {
            if (!searchInput) return;
            this.currentSearch = searchInput.value.trim() || null;
            this._resetAndReload();
        };

        if (searchBtn) searchBtn.addEventListener('click', doSearch);
        if (searchInput) {
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') doSearch();
            });
        }

        const forYouBtn = document.getElementById('foryou-btn');
        const followingBtn = document.getElementById('following-btn');

        if (forYouBtn) {
            forYouBtn.addEventListener('click', () => {
                this.currentForYou = !this.currentForYou;
                forYouBtn.classList.toggle('active', this.currentForYou);

                if (this.currentForYou) {
                    // 추천 활성화 시 팔로잉 해제 + 정렬 버튼 비활성화
                    this.currentFollowing = false;
                    if (followingBtn) followingBtn.classList.remove('active');
                    if (sortButtons) {
                        sortButtons.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
                    }
                } else {
                    // 추천 비활성화 시 최신순으로 복귀
                    this.currentSort = 'latest';
                    if (sortButtons) {
                        const latestBtn = sortButtons.querySelector('[data-sort="latest"]');
                        if (latestBtn) latestBtn.classList.add('active');
                    }
                }
                this._resetAndReload();
            });
        }

        if (followingBtn) {
            followingBtn.addEventListener('click', () => {
                this.currentFollowing = !this.currentFollowing;
                followingBtn.classList.toggle('active', this.currentFollowing);

                // 팔로잉 활성화 시 추천 해제
                if (this.currentFollowing && this.currentForYou) {
                    this.currentForYou = false;
                    if (forYouBtn) forYouBtn.classList.remove('active');
                    // 정렬 버튼 복원
                    this.currentSort = 'latest';
                    if (sortButtons) {
                        const latestBtn = sortButtons.querySelector('[data-sort="latest"]');
                        if (latestBtn) latestBtn.classList.add('active');
                    }
                }
                this._resetAndReload();
            });
        }

        if (sortButtons) {
            sortButtons.addEventListener('click', (e) => {
                const btn = e.target.closest('.sort-btn');
                if (!btn) return;

                const sort = btn.dataset.sort;
                if (sort === this.currentSort && !this.currentForYou) return;

                // 정렬 버튼 클릭 시 추천 모드 해제
                if (this.currentForYou) {
                    this.currentForYou = false;
                    if (forYouBtn) forYouBtn.classList.remove('active');
                }

                sortButtons.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                this.currentSort = sort;
                this._resetAndReload();
            });
        }
    }

    /**
     * 검색/정렬 변경 시 목록을 초기화하고 재로드합니다.
     * @private
     */
    _resetAndReload() {
        this.loadGeneration++;
        this.currentOffset = 0;
        this.hasMore = true;
        this.isLoading = false;
        this.loadedPostIds.clear();

        const listElement = document.getElementById('post-list');
        if (listElement) listElement.textContent = '';

        this._loadPosts();
    }

    /**
     * 카테고리 목록 로드 및 탭 렌더링
     * @private
     */
    async _loadCategories() {
        const tabContainer = document.getElementById('category-tabs');
        if (!tabContainer) return;

        try {
            const result = await CategoryModel.getCategories();
            if (!result.ok) return;

            this._categories = result.data?.data?.categories || [];
            this._renderCategoryTabs();
        } catch (error) {
            logger.error('카테고리 로드 실패', error);
        }
    }

    /**
     * 카테고리 탭 렌더링
     * @private
     */
    _renderCategoryTabs() {
        const tabContainer = document.getElementById('category-tabs');
        if (!tabContainer || !this._categories) return;

        PostListView.renderCategoryTabs(tabContainer, this._categories, this.currentCategory, (categoryId) => {
            if (categoryId === this.currentCategory) return;
            this.currentCategory = categoryId;
            this._renderCategoryTabs();
            this._resetAndReload();
        });
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
     * 게시글 목록을 API로부터 로드하고 화면에 렌더링합니다.
     * 
     * 중복 게시글 처리 전략:
     * 무한 스크롤 도중 새로운 게시글이 작성되면 오프셋이 밀려 이미 로드된 게시글이 중복되어 내려올 수 있습니다.
     * 이를 방지하기 위해 `this.loadedPostIds` Set을 사용하여 이미 화면에 표시된 게시글은 제외(필터링)합니다.
     * 
     * @private
     * @returns {Promise<void>}
     */
    async _loadPosts() {
        if (this.isLoading || !this.hasMore) return;

        this.isLoading = true;
        const generation = this.loadGeneration;
        const listElement = document.getElementById('post-list');
        const sentinel = document.getElementById('loading-sentinel');

        PostListView.toggleLoadingSentinel(sentinel, true);

        try {
            const sort = this.currentForYou ? 'for_you' : this.currentSort;
            const result = await PostModel.getPosts(
                this.currentOffset, this.LIMIT, this.currentSearch, sort,
                null, this.currentCategory, this.currentTag, this.currentFollowing
            );

            // 검색/정렬이 변경되어 세대가 바뀌었으면 이전 응답 무시
            if (generation !== this.loadGeneration) return;

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
                if (this.currentForYou) {
                    PostListView.showForYouEmptyState(listElement);
                } else if (this.currentFollowing) {
                    PostListView.showFollowingEmptyState(listElement);
                } else if (this.currentSearch) {
                    PostListView.showSearchEmptyState(listElement, this.currentSearch);
                } else {
                    PostListView.showEmptyState(listElement);
                }
                this.hasMore = false;
                PostListView.toggleLoadingSentinel(sentinel, false);
                return;
            }

            // 새로운 게시물만 렌더링
            if (newPosts.length > 0) {
                PostListView.renderPosts(listElement, newPosts, (postId) => {
                    location.href = resolveNavPath(NAV_PATHS.DETAIL(postId));
                });
            }

            this.currentOffset += posts.length;

        } catch (error) {
            logger.error('게시글 목록 로딩 실패', error);
            PostListView.showSentinelError(sentinel, UI_MESSAGES.UNKNOWN_ERROR);
        } finally {
            this.isLoading = false;
        }
    }
}

export default MainController;
