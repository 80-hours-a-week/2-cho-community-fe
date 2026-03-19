// @ts-check
// js/controllers/PackageListController.js
// 패키지 목록 페이지 컨트롤러

import PackageModel from '../models/PackageModel.js';
import PackageListView from '../views/PackageListView.js';
import Logger from '../utils/Logger.js';
import { NAV_PATHS } from '../constants.js';
import { resolveNavPath } from '../config.js';
import { getAccessToken } from '../services/ApiService.js';
import { showToast } from '../views/helpers.js';

const logger = Logger.createLogger('PackageListController');

class PackageListController {
    constructor() {
        this.currentOffset = 0;
        this.LIMIT = 10;
        this.isLoading = false;
        this.hasMore = true;
        /** @type {IntersectionObserver|null} */
        this.scrollObserver = null;
        this.filters = {
            sort: 'latest',
            category: null,
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
        this._setupCategoryFilter();
        this._setupInfiniteScroll();
        await this._loadPackages();
    }

    /**
     * 패키지 등록 버튼
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
                location.href = resolveNavPath(NAV_PATHS.PACKAGE_WRITE);
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
     * 카테고리 필터 설정
     * @private
     */
    _setupCategoryFilter() {
        const container = document.getElementById('category-filters');
        if (!container) return;

        // URL에서 ?category= 파라미터 읽기 (MPA 네비게이션)
        const urlCategory = new URLSearchParams(location.search).get('category');
        if (urlCategory) this.filters.category = urlCategory;

        PackageListView.renderCategoryFilters(container, this.filters.category, (category) => {
            if (category === this.filters.category) return;
            this.filters.category = category;
            PackageListView.renderCategoryFilters(container, this.filters.category, arguments.callee);
            this._resetAndReload();
        });

        // 카테고리 변경 시 재렌더링을 위한 참조 저장
        this._categoryContainer = container;
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
                this._loadPackages();
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

        const listElement = document.getElementById('package-list');
        if (listElement) listElement.textContent = '';

        this._loadPackages();

        // 카테고리 필터 재렌더링
        if (this._categoryContainer) {
            PackageListView.renderCategoryFilters(
                this._categoryContainer,
                this.filters.category,
                (category) => {
                    if (category === this.filters.category) return;
                    this.filters.category = category;
                    this._resetAndReload();
                }
            );
        }
    }

    /**
     * 패키지 목록 로드
     * @private
     */
    async _loadPackages() {
        if (this.isLoading || !this.hasMore) return;

        this.isLoading = true;
        const generation = this.loadGeneration;
        const listElement = document.getElementById('package-list');
        const sentinel = document.getElementById('loading-sentinel');

        PackageListView.toggleLoadingSentinel(sentinel, true);

        try {
            const result = await PackageModel.getPackages(
                this.currentOffset, this.LIMIT, this.filters.sort,
                this.filters.category, this.filters.search
            );

            // 세대가 바뀌었으면 이전 응답 무시
            if (generation !== this.loadGeneration) return;

            if (!result.ok) throw new Error('패키지 목록을 불러오지 못했습니다.');

            const packages = result.data?.data?.packages || [];
            const pagination = result.data?.data?.pagination;

            if (packages.length < this.LIMIT ||
                (pagination && !pagination.has_more) ||
                (pagination && this.currentOffset + packages.length >= pagination.total_count)) {
                this.hasMore = false;
                PackageListView.toggleLoadingSentinel(sentinel, false);
            }

            if (this.currentOffset === 0 && packages.length === 0) {
                if (this.filters.search) {
                    PackageListView.renderEmptyState(listElement, `'${this.filters.search}' 검색 결과가 없습니다.`, `apt search "${this.filters.search}"`);
                } else {
                    PackageListView.renderEmptyState(listElement, '등록된 패키지가 없습니다.', 'apt list --installed');
                }
                this.hasMore = false;
                PackageListView.toggleLoadingSentinel(sentinel, false);
                return;
            }

            PackageListView.renderPackages(listElement, packages, (packageId) => {
                location.href = resolveNavPath(NAV_PATHS.PACKAGE_DETAIL(packageId));
            });

            this.currentOffset += packages.length;

        } catch (error) {
            logger.error('패키지 목록 로딩 실패', error);
            showToast('패키지 목록을 불러오지 못했습니다.');
        } finally {
            this.isLoading = false;
        }
    }
}

export default PackageListController;
