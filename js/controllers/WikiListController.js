// @ts-check
// js/controllers/WikiListController.js
// 위키 목록 페이지 컨트롤러

import WikiModel from '../models/WikiModel.js';
import WikiListView from '../views/WikiListView.js';
import Logger from '../utils/Logger.js';
import { NAV_PATHS } from '../constants.js';
import { resolveNavPath } from '../config.js';
import { getAccessToken } from '../services/ApiService.js';
import { showToast } from '../views/helpers.js';

const logger = Logger.createLogger('WikiListController');

class WikiListController {
    constructor() {
        this.currentOffset = 0;
        this.LIMIT = 10;
        this.isLoading = false;
        this.hasMore = true;
        /** @type {IntersectionObserver|null} */
        this.scrollObserver = null;
        this.filters = {
            sort: 'latest',
            tag: null,
            search: null,
        };
        // 비동기 응답 무효화 카운터
        this.loadGeneration = 0;
    }

    /**
     * 컨트롤러 초기화
     */
    async init() {
        this._setupWriteButton();
        this._setupSearch();
        this._setupSort();
        this._setupTagFilter();
        this._setupInfiniteScroll();
        await this._loadWikiPages();
    }

    /**
     * 페이지 작성 버튼
     * @private
     */
    _setupWriteButton() {
        const writeBtn = document.getElementById('write-btn');
        if (writeBtn) {
            writeBtn.addEventListener('click', () => {
                if (!getAccessToken()) {
                    showToast('로그인이 필요합니다.');
                    location.href = resolveNavPath(NAV_PATHS.LOGIN);
                    return;
                }
                location.href = resolveNavPath(NAV_PATHS.WIKI_WRITE);
            });
        }
    }

    /**
     * 검색 설정 (디바운스)
     * @private
     */
    _setupSearch() {
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');

        let timer = null;

        const doSearch = () => {
            if (!searchInput) return;
            this.filters.search = /** @type {HTMLInputElement} */ (searchInput).value.trim() || null;
            this._resetAndReload();
        };

        if (searchBtn) searchBtn.addEventListener('click', doSearch);
        if (searchInput) {
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') doSearch();
            });
            searchInput.addEventListener('input', () => {
                clearTimeout(timer);
                timer = setTimeout(doSearch, 300);
            });
        }
    }

    /**
     * 정렬 버튼 설정
     * @private
     */
    _setupSort() {
        const sortButtons = document.getElementById('sort-buttons');
        if (!sortButtons) return;

        sortButtons.addEventListener('click', (e) => {
            const btn = /** @type {HTMLElement} */ (e.target).closest('.sort-btn');
            if (!btn) return;

            const sort = /** @type {HTMLElement} */ (btn).dataset.sort;
            if (sort === this.filters.sort) return;

            sortButtons.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            this.filters.sort = sort;
            this._resetAndReload();
        });
    }

    /**
     * 태그 필터 설정
     * @private
     */
    _setupTagFilter() {
        const container = document.getElementById('tag-filters');
        if (!container) return;
        this._tagContainer = container;

        // 태그 목록은 첫 로드 후 API 응답에서 추출하거나, 별도 엔드포인트에서 로드
        // 현재는 API 응답에 tags 목록이 포함될 때 렌더링
    }

    /**
     * 태그 필터 렌더링
     * @param {Array<string>} tags
     * @private
     */
    _renderTagFilters(tags) {
        if (!this._tagContainer || !tags || tags.length === 0) return;

        WikiListView.renderTagFilters(this._tagContainer, tags, this.filters.tag, (tag) => {
            if (tag === this.filters.tag) return;
            this.filters.tag = tag;
            this._renderTagFilters(this._availableTags || []);
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

        if (this.scrollObserver) {
            this.scrollObserver.disconnect();
        }

        this.scrollObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !this.isLoading && this.hasMore) {
                this._loadWikiPages();
            }
        }, { threshold: 0.1 });

        this.scrollObserver.observe(sentinel);
    }

    /**
     * 목록 초기화 후 재로드
     * @private
     */
    _resetAndReload() {
        this.loadGeneration++;
        this.currentOffset = 0;
        this.hasMore = true;
        this.isLoading = false;

        const listElement = document.getElementById('wiki-list');
        if (listElement) listElement.textContent = '';

        this._loadWikiPages();
    }

    /**
     * 위키 페이지 목록 로드
     * @private
     */
    async _loadWikiPages() {
        if (this.isLoading || !this.hasMore) return;

        this.isLoading = true;
        const generation = this.loadGeneration;
        const listElement = document.getElementById('wiki-list');
        const sentinel = document.getElementById('loading-sentinel');

        WikiListView.toggleLoadingSentinel(sentinel, true);

        try {
            const result = await WikiModel.getWikiPages(
                this.currentOffset, this.LIMIT, this.filters.sort,
                this.filters.tag, this.filters.search
            );

            // 세대가 바뀌었으면 이전 응답 무시
            if (generation !== this.loadGeneration) return;

            if (!result.ok) throw new Error('위키 목록을 불러오지 못했습니다.');

            const wikiPages = result.data?.data?.wiki_pages || [];
            const pagination = result.data?.data?.pagination;

            // 페이지들의 태그를 수집하여 태그 필터 렌더링 (첫 로드 시)
            if (this.currentOffset === 0 && wikiPages.length > 0) {
                const tagSet = new Set();
                wikiPages.forEach(p => (p.tags || []).forEach(t => tagSet.add(t.name)));
                const tagNames = [...tagSet].sort();
                if (tagNames.length > 0) {
                    this._renderTagFilters(tagNames);
                }
            }

            if (wikiPages.length < this.LIMIT ||
                (pagination && !pagination.has_more) ||
                (pagination && this.currentOffset + wikiPages.length >= pagination.total_count)) {
                this.hasMore = false;
                WikiListView.toggleLoadingSentinel(sentinel, false);
            }

            if (this.currentOffset === 0 && wikiPages.length === 0) {
                if (this.filters.search) {
                    WikiListView.renderEmptyState(listElement, `'${this.filters.search}' 검색 결과가 없습니다.`);
                } else {
                    WikiListView.renderEmptyState(listElement);
                }
                this.hasMore = false;
                WikiListView.toggleLoadingSentinel(sentinel, false);
                return;
            }

            WikiListView.renderWikiPages(listElement, wikiPages, (slug) => {
                location.href = resolveNavPath(NAV_PATHS.WIKI_DETAIL(slug));
            });

            this.currentOffset += wikiPages.length;

        } catch (error) {
            logger.error('위키 목록 로딩 실패', error);
            showToast('위키 목록을 불러오지 못했습니다.');
        } finally {
            this.isLoading = false;
        }
    }
}

export default WikiListController;
