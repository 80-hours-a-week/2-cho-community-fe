// js/controllers/MainController.js
// 메인 페이지 컨트롤러 (게시글 목록, 무한 스크롤)
import PostModel from '../models/PostModel.js';
import CategoryModel from '../models/CategoryModel.js';
import PostListView from '../views/PostListView.js';
import Logger from '../utils/Logger.js';
import { NAV_PATHS, UI_MESSAGES } from '../constants.js';
import { resolveNavPath } from '../config.js';
import { getAccessToken } from '../services/ApiService.js';
import { showToast } from '../views/helpers.js';
import { createElement } from '../utils/dom.js';

const logger = Logger.createLogger('MainController');
const AUTOCOMPLETE_DEBOUNCE_MS = 300;

const DEFAULT_FILTERS = Object.freeze({
    search: null,
    sort: 'latest',
    category: null,
    tag: null,
    following: false,
    forYou: false,
    solved: null,
});
/** 메인 페이지 컨트롤러 */
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
        this.filters = { ...DEFAULT_FILTERS };
        // 검색/정렬 변경 시 이전 요청의 응답을 무시하기 위한 세대 카운터
        this.loadGeneration = 0;
        // 이전 API 요청 취소용
        this._abortController = null;
    }
    /** 컨트롤러 초기화 */
    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        const categoryParam = urlParams.get('category');
        if (categoryParam) this.filters.category = Number(categoryParam);
        const tagParam = urlParams.get('tag');
        if (tagParam) this.filters.tag = tagParam;
        this._setupWriteButton();
        this._setupSearchAndSort();
        this._setupInfiniteScroll();
        if (getAccessToken()) {
            const forYouBtn = document.getElementById('foryou-btn');
            const followingBtn = document.getElementById('following-btn');
            const filterDivider = document.getElementById('filter-divider');
            if (forYouBtn) forYouBtn.classList.remove('hidden');
            if (followingBtn) followingBtn.classList.remove('hidden');
            if (filterDivider) filterDivider.classList.remove('hidden');
        }
        await this._loadCategories();
        await this._loadPosts();
    }
    /** @private */
    _setupWriteButton() {
        const writeBtn = document.getElementById('write-btn');
        if (writeBtn) {
            writeBtn.addEventListener('click', () => {
                location.href = resolveNavPath(NAV_PATHS.WRITE);
            });
        }
    }
    /**
     * 정렬을 최신순으로 초기화하고 해당 버튼을 활성화합니다.
     * forYou/following 비활성화 후 호출됩니다.
     * @private
     */
    _resetSortToLatest(sortButtons) {
        this.filters.sort = 'latest';
        if (sortButtons) {
            const latestBtn = sortButtons.querySelector('[data-sort="latest"]');
            if (latestBtn) latestBtn.classList.add('active');
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
        const forYouBtn = document.getElementById('foryou-btn');
        const followingBtn = document.getElementById('following-btn');
        const doSearch = () => {
            if (!searchInput) return;
            this.filters.search = searchInput.value.trim() || null;
            this._resetAndReload();
        };
        if (searchBtn) searchBtn.addEventListener('click', doSearch);
        if (searchInput) {
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { this._hideSearchSuggestions(); doSearch(); }
            });
            this._setupSearchAutocomplete(searchInput);
        }
        if (forYouBtn) {
            forYouBtn.addEventListener('click', () => {
                this.filters.forYou = !this.filters.forYou;
                forYouBtn.classList.toggle('active', this.filters.forYou);
                if (this.filters.forYou) {
                    // 추천 활성화 시 팔로잉 해제 + 정렬 버튼 비활성화
                    this.filters.following = false;
                    if (followingBtn) followingBtn.classList.remove('active');
                    if (sortButtons) {
                        sortButtons.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
                    }
                } else {
                    // 추천 비활성화 시 최신순으로 복귀
                    this._resetSortToLatest(sortButtons);
                }
                this._resetAndReload();
            });
        }
        if (followingBtn) {
            followingBtn.addEventListener('click', () => {
                this.filters.following = !this.filters.following;
                followingBtn.classList.toggle('active', this.filters.following);
                if (this.filters.following && this.filters.forYou) {
                    // 팔로잉 활성화 시 추천 해제
                    this.filters.forYou = false;
                    if (forYouBtn) forYouBtn.classList.remove('active');
                    this._resetSortToLatest(sortButtons);
                }
                this._resetAndReload();
            });
        }
        if (sortButtons) {
            sortButtons.addEventListener('click', (e) => {
                const btn = e.target.closest('.sort-btn');
                if (!btn) return;
                const mode = btn.dataset.sort;
                if (mode === this.filters.sort && !this.filters.forYou) return;
                if (this.filters.forYou) {
                    // 정렬 버튼 클릭 시 추천 모드 해제
                    this.filters.forYou = false;
                    if (forYouBtn) forYouBtn.classList.remove('active');
                }
                sortButtons.querySelectorAll('.sort-btn').forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-pressed', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
                this.filters.sort = mode;
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
            showToast('카테고리를 불러오지 못했습니다.');
        }
    }
    /**
     * 카테고리 탭 렌더링
     * @private
     */
    _renderCategoryTabs() {
        const tabContainer = document.getElementById('category-tabs');
        if (!tabContainer || !this._categories) return;
        PostListView.renderCategoryTabs(tabContainer, this._categories, this.filters.category, (categoryId) => {
            if (categoryId === this.filters.category) return;
            this.filters.category = categoryId;
            // Q&A 카테고리가 아니면 solved 필터 초기화
            if (categoryId !== 2) {
                this.filters.solved = null;
            }
            this._renderCategoryTabs();
            this._renderSolvedFilter();
            this._resetAndReload();
        });
        this._renderSolvedFilter();
    }
    /**
     * Q&A 카테고리 선택 시 해결/미해결 필터 렌더링
     * @private
     */
    _renderSolvedFilter() {
        const feedFilters = document.getElementById('feed-filters');
        if (!feedFilters) return;
        // 기존 solved 필터 제거
        const existing = document.getElementById('solved-filter');
        if (existing) existing.remove();
        // Q&A 카테고리(category_id === 2)일 때만 표시
        if (this.filters.category !== 2) return;
        const options = [
            { label: '전체', value: null },
            { label: '해결됨', value: true },
            { label: '미해결', value: false },
        ];
        const buttons = options.map(opt => {
            const isActive = this.filters.solved === opt.value;
            const btn = createElement('button', {
                className: `sort-btn${isActive ? ' active' : ''}`,
                onClick: () => {
                    if (this.filters.solved === opt.value) return;
                    this.filters.solved = opt.value;
                    this._renderSolvedFilter();
                    this._resetAndReload();
                },
            }, [opt.label]);
            return btn;
        });
        const container = createElement('div', {
            className: 'sort-buttons',
            id: 'solved-filter',
        }, buttons);
        feedFilters.appendChild(container);
    }
    /**
     * 무한 스크롤 설정
     * @private
     */
    _setupInfiniteScroll() {
        const sentinel = document.getElementById('loading-sentinel');
        if (!sentinel) return;
        if (this.scrollObserver) this.scrollObserver.disconnect();
        this.scrollObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !this.isLoading && this.hasMore) {
                this._loadPosts();
            }
        }, { threshold: 0.1 });
        this.scrollObserver.observe(sentinel);
    }
    /** 컨트롤러 정리 (페이지 이탈 시 호출) */
    destroy() {
        if (this._abortController) {
            this._abortController.abort();
            this._abortController = null;
        }
        if (this.scrollObserver) {
            this.scrollObserver.disconnect();
            this.scrollObserver = null;
        }
    }
    /**
     * 현재 필터 상태로 PostModel.getPosts를 호출합니다.
     * getPosts의 다수 위치 인자를 한 곳에서 관리합니다.
     * @param {AbortSignal} signal
     * @private
     */
    async _fetchPosts(signal) {
        const effectiveSort = (this.filters.forYou ? 'for_you' : this.filters.sort);
        return PostModel.getPosts(
            this.currentOffset, this.LIMIT, this.filters.search, effectiveSort,
            null, this.filters.category, this.filters.tag, this.filters.following,
            { signal }, this.filters.solved
        );
    }
    /**
     * 게시글 목록을 API로부터 로드하고 화면에 렌더링합니다.
     *
     * 중복 게시글 처리 전략:
     * 무한 스크롤 도중 새로운 게시글이 작성되면 오프셋이 밀려 이미 로드된 게시글이 중복되어 내려올 수 있습니다.
     * 이를 방지하기 위해 `this.loadedPostIds` Set으로 이미 표시된 게시글은 필터링합니다.
     * @private
     */
    async _loadPosts() {
        if (this.isLoading || !this.hasMore) return;
        if (this._abortController) this._abortController.abort();
        this._abortController = new AbortController();
        this.isLoading = true;
        const generation = this.loadGeneration;
        const listElement = document.getElementById('post-list');
        const sentinel = document.getElementById('loading-sentinel');
        PostListView.toggleLoadingSentinel(sentinel, true);
        if (this.currentOffset === 0 && listElement) {
            listElement.textContent = '';
            listElement.appendChild(PostListView.createSkeletonCards(3));
        }
        try {
            const result = await this._fetchPosts(this._abortController.signal);
            if (result?.aborted) return;
            // 검색/정렬 변경으로 세대가 바뀌었으면 이전 응답 무시
            if (generation !== this.loadGeneration) return;
            if (!result.ok) throw new Error(UI_MESSAGES.POST_LOAD_FAIL);
            const posts = result.data?.data?.posts || [];
            const pagination = result.data?.data?.pagination;
            // 추천 피드 폴백 안내 (첫 페이지만)
            if (this.currentOffset === 0 && result.data?.data?.effective_sort) {
                showToast('활동 데이터가 부족하여 최신순으로 표시됩니다. 게시글을 읽고 좋아요를 남겨보세요!');
            }
            const newPosts = posts.filter(post => !this.loadedPostIds.has(post.post_id));
            if (newPosts.length < posts.length) logger.warn(`${posts.length - newPosts.length}개의 중복 게시물 제외`);
            newPosts.forEach(post => this.loadedPostIds.add(post.post_id));
            if (posts.length < this.LIMIT ||
                (pagination && !pagination.has_more) ||
                (pagination && this.currentOffset + posts.length >= pagination.total_count)) {
                this.hasMore = false;
                PostListView.toggleLoadingSentinel(sentinel, false);
            }
            // 첫 페이지 로드 완료 시 스켈레톤 카드 제거
            if (this.currentOffset === 0 && listElement) {
                listElement.querySelectorAll('.skeleton-post').forEach(el => el.remove());
            }
            if (this.currentOffset === 0 && newPosts.length === 0) {
                this._renderEmptyFeed(listElement, sentinel);
                return;
            }
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
    /**
     * 빈 피드 상태 메시지 렌더링
     * @private
     */
    _renderEmptyFeed(listElement, sentinel) {
        if (this.filters.forYou) {
            PostListView.renderEmptyState(listElement, '추천 게시글을 준비 중입니다. 게시글을 읽고, 좋아요와 북마크를 남겨보세요!', 'recommend --for-you');
        } else if (this.filters.following) {
            PostListView.renderEmptyState(listElement, '팔로우한 사용자의 게시글이 여기에 표시됩니다.', 'feed --following');
        } else if (this.filters.search) {
            PostListView.renderEmptyState(listElement, `'${this.filters.search}' — ${UI_MESSAGES.SEARCH_NO_RESULTS}`, `grep "${this.filters.search}" posts/`);
        } else {
            PostListView.renderEmptyState(listElement, '등록된 게시글이 없습니다.', 'ls posts/');
        }
        this.hasMore = false;
        PostListView.toggleLoadingSentinel(sentinel, false);
    }
    /**
     * 검색 자동완성 설정 (AUTOCOMPLETE_DEBOUNCE_MS 디바운스)
     * @param {HTMLInputElement} input
     * @private
     */
    _setupSearchAutocomplete(input) {
        let timer = null;
        const MIN_QUERY = 2;
        input.addEventListener('input', () => {
            clearTimeout(timer);
            const query = input.value.trim();
            if (query.length < MIN_QUERY) { this._hideSearchSuggestions(); return; }
            timer = setTimeout(() => this._fetchSuggestions(query), AUTOCOMPLETE_DEBOUNCE_MS);
        });
        input.addEventListener('blur', () => setTimeout(() => this._hideSearchSuggestions(), 150));
    }
    /**
     * 검색 제안 목록 조회 및 렌더링
     * @param {string} query
     * @private
     */
    async _fetchSuggestions(query) {
        try {
            const result = await PostModel.getPosts({ search: query, limit: 5, offset: 0 });
            if (!result.ok) return;
            this._renderSuggestions(result.data?.data?.posts || []);
        } catch {
            this._hideSearchSuggestions();
        }
    }
    /**
     * 검색 제안 드롭다운 렌더링
     * @param {Array} posts
     * @private
     */
    _renderSuggestions(posts) {
        const container = document.getElementById('search-suggestions');
        if (!container) return;
        container.textContent = '';
        if (posts.length === 0) { container.style.display = 'none'; return; }
        posts.forEach(post => {
            const li = document.createElement('li');
            li.className = 'search-suggestion-item';
            const title = document.createElement('span');
            title.className = 'suggestion-title';
            title.textContent = post.title;
            const author = document.createElement('span');
            author.className = 'suggestion-author';
            author.textContent = post.author?.nickname || '';
            li.appendChild(title);
            li.appendChild(author);
            li.addEventListener('mousedown', (e) => {
                e.preventDefault();
                location.href = resolveNavPath(NAV_PATHS.DETAIL(post.post_id));
            });
            container.appendChild(li);
        });
        container.style.display = '';
    }
    /** @private */
    _hideSearchSuggestions() {
        const container = document.getElementById('search-suggestions');
        if (container) { container.style.display = 'none'; container.textContent = ''; }
    }
}

export default MainController;
