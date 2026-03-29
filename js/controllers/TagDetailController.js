// @ts-check
// js/controllers/TagDetailController.js
// 태그 상세 페이지 컨트롤러

import TagModel from '../models/TagModel.js';
import PostModel from '../models/PostModel.js';
import WikiModel from '../models/WikiModel.js';
import TagDetailView from '../views/TagDetailView.js';
import PostListView from '../views/PostListView.js';
import WikiListView from '../views/WikiListView.js';
import BaseListView from '../views/BaseListView.js';
import Logger from '../utils/Logger.js';
import { NAV_PATHS } from '../constants.js';
import { resolveNavPath } from '../config.js';
import { showToast } from '../views/helpers.js';

const logger = Logger.createLogger('TagDetailController');
const PAGE_SIZE = 10;

class TagDetailController {
    constructor() {
        /** @type {string|null} */
        this.tagName = null;
        /** @type {Record<string, any>|null} */
        this.tagData = null;
        /** @type {string} */
        this.activeTab = 'posts';
        /** @type {number} */
        this.offset = 0;
        /** @type {boolean} */
        this.hasMore = true;
        /** @type {boolean} */
        this.loading = false;
        /** @type {IntersectionObserver|null} */
        this.observer = null;
    }

    /**
     * 컨트롤러 초기화
     * @param {Promise<object|null>|null} [currentUserPromise]
     */
    async init(currentUserPromise = null) {
        /** @type {Record<string, any>|null} */
        this.currentUser = currentUserPromise ? await currentUserPromise : null;

        // URL에서 태그 이름 추출 (/tags/{tagName})
        const rawName = window.location.pathname.replace(/^\/tags\//, '');
        this.tagName = decodeURIComponent(rawName);

        if (!this.tagName || this.tagName === '' || this.tagName === 'tags') {
            showToast('잘못된 접근입니다.');
            location.href = resolveNavPath(NAV_PATHS.MAIN);
            return;
        }

        this._setupBackButton();
        await this._loadTagDetail();
    }

    /**
     * 뒤로가기 버튼 설정
     * @private
     */
    _setupBackButton() {
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    location.href = resolveNavPath(NAV_PATHS.MAIN);
                }
            });
        }
    }

    /**
     * 태그 상세 로드
     * @private
     */
    async _loadTagDetail() {
        const container = document.getElementById('tag-content');
        try {
            const result = await TagModel.getTagDetail(/** @type {string} */ (this.tagName));
            if (!result.ok) {
                showToast('태그 정보를 불러오지 못했습니다.');
                return;
            }

            this.tagData = result.data?.data?.tag || result.data?.data;

            const currentUserId = this.currentUser?.user_id || null;

            TagDetailView.renderTagDetail(
                /** @type {HTMLElement} */ (container),
                /** @type {Record<string, any>} */ (this.tagData),
                currentUserId,
            );

            this._setupEditButton();
            this._setupTabs();
            this._setupInfiniteScroll();
            await this._loadTabContent();
        } catch (error) {
            logger.error('태그 상세 로드 실패', error);
            showToast('태그 정보를 불러오지 못했습니다.');
        }
    }

    /**
     * 수정 버튼 설정
     * @private
     */
    _setupEditButton() {
        const editBtn = document.getElementById('tag-edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                const container = document.getElementById('tag-content');
                if (!container || !this.tagData) return;

                TagDetailView.renderEditForm(
                    container,
                    this.tagData,
                    async (/** @type {Record<string, any>} */ data) => {
                        try {
                            const result = await TagModel.updateTag(
                                /** @type {string} */ (this.tagName),
                                data,
                            );
                            if (result.ok) {
                                showToast('태그 설명이 수정되었습니다.');
                                await this._loadTagDetail();
                            } else {
                                showToast(/** @type {any} */ (result.data)?.detail || '태그 수정에 실패했습니다.');
                            }
                        } catch (error) {
                            logger.error('태그 수정 실패', error);
                            showToast('태그 수정에 실패했습니다.');
                        }
                    },
                    () => this._loadTagDetail(),
                );
            });
        }
    }

    /**
     * 탭 전환 설정
     * @private
     */
    _setupTabs() {
        const tabs = document.querySelectorAll('.tag-tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', async () => {
                const selectedTab = /** @type {HTMLElement} */ (tab).dataset.tab;
                if (selectedTab === this.activeTab) return;

                // 활성 탭 업데이트
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                this.activeTab = selectedTab || 'posts';
                this.offset = 0;
                this.hasMore = true;

                // 목록 초기화 후 로드
                const listContainer = document.getElementById('tag-list-container');
                if (listContainer) listContainer.textContent = '';

                await this._loadTabContent();
            });
        });
    }

    /**
     * IntersectionObserver 무한 스크롤 설정
     * @private
     */
    _setupInfiniteScroll() {
        const sentinel = document.getElementById('tag-loading-sentinel');
        if (!sentinel) return;

        this.observer = new IntersectionObserver(async (entries) => {
            const entry = entries[0];
            if (entry.isIntersecting && this.hasMore && !this.loading) {
                await this._loadTabContent();
            }
        }, { rootMargin: '200px' });

        this.observer.observe(sentinel);
    }

    /**
     * 탭 콘텐츠 로드 (게시글/위키)
     * @private
     */
    async _loadTabContent() {
        if (this.loading || !this.hasMore) return;
        this.loading = true;

        const listContainer = document.getElementById('tag-list-container');
        const sentinel = document.getElementById('tag-loading-sentinel');

        BaseListView.toggleLoadingSentinel(sentinel, true);

        try {
            if (this.activeTab === 'posts') {
                await this._loadPosts(/** @type {HTMLElement} */ (listContainer));
            } else {
                await this._loadWikiPages(/** @type {HTMLElement} */ (listContainer));
            }
        } catch (error) {
            logger.error('탭 콘텐츠 로드 실패', error);
            showToast('목록을 불러오지 못했습니다.');
        } finally {
            this.loading = false;
            BaseListView.toggleLoadingSentinel(sentinel, false);
        }
    }

    /**
     * 게시글 목록 로드
     * @param {HTMLElement} container
     * @private
     */
    async _loadPosts(container) {
        const result = await PostModel.getPosts(
            this.offset,
            PAGE_SIZE,
            null,
            'latest',
            null,
            null,
            this.tagName,
        );

        if (!result.ok) {
            showToast('게시글 목록을 불러오지 못했습니다.');
            return;
        }

        const posts = result.data?.data?.posts || [];
        if (posts.length === 0 && this.offset === 0) {
            BaseListView.renderEmptyState(container, '태그된 게시글이 없습니다.', `ls posts/ --tag=${this.tagName}`);
            this.hasMore = false;
            return;
        }

        const onPostClick = (/** @type {string|number} */ postId) => {
            location.href = resolveNavPath(NAV_PATHS.DETAIL(postId));
        };

        PostListView.renderPosts(container, posts, onPostClick);

        this.offset += posts.length;
        if (posts.length < PAGE_SIZE) {
            this.hasMore = false;
        }
    }

    /**
     * 위키 페이지 목록 로드
     * @param {HTMLElement} container
     * @private
     */
    async _loadWikiPages(container) {
        const result = await WikiModel.getWikiPages(
            this.offset,
            PAGE_SIZE,
            'latest',
            this.tagName,
        );

        if (!result.ok) {
            showToast('위키 목록을 불러오지 못했습니다.');
            return;
        }

        const pages = result.data?.data?.wiki_pages || [];
        if (pages.length === 0 && this.offset === 0) {
            BaseListView.renderEmptyState(container, '태그된 위키 페이지가 없습니다.', `ls wiki/ --tag=${this.tagName}`);
            this.hasMore = false;
            return;
        }

        const onPageClick = (/** @type {string} */ slug) => {
            location.href = resolveNavPath(NAV_PATHS.WIKI_DETAIL(slug));
        };

        WikiListView.renderWikiPages(container, pages, onPageClick);

        this.offset += pages.length;
        if (pages.length < PAGE_SIZE) {
            this.hasMore = false;
        }
    }
}

export default TagDetailController;
