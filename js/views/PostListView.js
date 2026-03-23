// @ts-check
// js/views/PostListView.js
// 게시글 목록 렌더링 — Terminal Editorial 카드 구조

import { formatDate, formatCount, truncateTitle, escapeCssUrl } from '../utils/formatters.js';
import { getImageUrl } from './helpers.js';
import { createElement } from '../utils/dom.js';
// 상수 및 경로 유틸리티
import { NAV_PATHS, CATEGORY_LABELS } from '../constants.js';
import { resolveNavPath } from '../config.js';
import { createDistroBadge } from '../utils/distro.js';
import BaseListView from './BaseListView.js';

/**
 * 게시글 목록 View 클래스
 */
class PostListView extends BaseListView {
    /**
     * 게시글 카드 요소 생성
     * 구조: 작성자 메타 → 제목(+배지) → 통계+태그
     * @param {Record<string, any>} post - 게시글 데이터
     * @param {Function} onClick - 클릭 핸들러
     * @returns {HTMLElement} - 게시글 카드 요소
     */
    static createPostCard(post, onClick) {
        const titleText = truncateTitle(post.title);
        const dateStr = formatDate(new Date(post.created_at));
        const likes = post.likes_count || 0;
        const comments = post.comments_count || 0;
        const views = post.views_count || 0;
        const profileImgUrl = getImageUrl(post.author?.profileImageUrl);
        const nickname = post.author?.nickname || '';

        // --- 1. 작성자 메타 바 (상단) ---
        const metaChildren = [
            createElement('div', {
                className: 'post-card__avatar',
                style: {
                    backgroundImage: `url('${escapeCssUrl(profileImgUrl)}')`,
                    backgroundSize: 'cover',
                },
            }),
            createElement('div', { className: 'post-card__meta-text' }, [
                (() => {
                    const nameRow = createElement('span', {
                        className: `post-card__author${post.author?.user_id ? ' clickable-nickname' : ''}`,
                        ...(post.author?.user_id ? {
                            onClick: (/** @type {any} */ e) => {
                                e.stopPropagation();
                                location.href = resolveNavPath(NAV_PATHS.USER_PROFILE(post.author.user_id));
                            },
                        } : {}),
                    }, [nickname]);
                    return nameRow;
                })(),
                createElement('span', { className: 'post-card__date' }, [dateStr]),
            ]),
        ];
        // 배포판 뱃지
        const distroBadge = createDistroBadge(post.author?.distro, 'small');
        if (distroBadge) {
            metaChildren[1].appendChild(distroBadge);
        }
        const metaBar = createElement('div', { className: 'post-card__meta' }, metaChildren);

        // --- 2. 콘텐츠 영역 (제목 + 배지) ---
        const bodyChildren = [];

        // 배지
        const badges = [];
        if (post.is_pinned) {
            badges.push(createElement('span', { className: 'pin-badge' }, ['고정']));
        }
        if (post.category_id && CATEGORY_LABELS[post.category_id]) {
            badges.push(createElement('span', { className: 'category-badge' }, [
                post.category_name || CATEGORY_LABELS[post.category_id],
            ]));
        }
        if (badges.length > 0) {
            bodyChildren.push(createElement('div', { className: 'post-badges' }, badges));
        }

        // 제목
        bodyChildren.push(createElement('h3', { className: 'post-title' }, [titleText]));

        // 태그
        if (post.tags && post.tags.length > 0) {
            bodyChildren.push(
                createElement('div', { className: 'post-tags' },
                    post.tags.map(/** @param {any} tag */ tag =>
                        createElement('span', {
                            className: 'tag-badge',
                            onClick: (/** @type {any} */ e) => {
                                e.stopPropagation();
                                location.href = resolveNavPath(`${NAV_PATHS.MAIN}?tag=${encodeURIComponent(tag.name)}`);
                            },
                        }, [`#${tag.name}`])
                    )
                )
            );
        }

        const body = createElement('div', { className: 'post-card__body' }, bodyChildren);
        // --- 3. 하단 통계 바 ---
        const postStats = createElement('div', { className: 'post-stats' }, [
            createElement('span', {}, [`♥ ${formatCount(likes)}`]),
            createElement('span', {}, [`◆ ${formatCount(comments)}`]),
            createElement('span', {}, [`▸ ${formatCount(views)}`]),
        ]);
        const footer = createElement('div', { className: 'post-card__footer' }, [postStats]);

        // --- 카드 조립 ---
        const card = createElement('li', {
            className: `post-card${post.is_pinned ? ' pinned' : ''}${post.is_read ? ' read' : ''}`,
            tabindex: '0',
            role: 'article',
        }, [metaBar, body, footer]);

        if (onClick) {
            card.addEventListener('click', () => onClick(post.post_id));
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick(post.post_id);
                }
            });
        }

        return card;
    }

    /**
     * 게시글 목록 렌더링
     * @param {HTMLElement} container - 목록 컨테이너
     * @param {Array<any>} posts - 게시글 배열
     * @param {Function} onPostClick - 게시글 클릭 핸들러
     */
    static renderPosts(container, posts, onPostClick) {
        const fragment = document.createDocumentFragment();
        posts.forEach(post => {
            const card = PostListView.createPostCard(post, onPostClick);
            fragment.appendChild(card);
        });
        container.appendChild(fragment);
    }

    /**
     * 로딩 센티널 표시/숨기기
     * @param {HTMLElement} sentinel - 센티널 요소
     * @param {boolean} show - 표시 여부
     */
    static toggleLoadingSentinel(sentinel, show) {
        if (sentinel) {
            sentinel.style.visibility = show ? 'visible' : 'hidden';
            sentinel.style.display = 'block';
            sentinel.innerText = show ? 'loading...' : '';
        }
    }

    /**
     * 로딩 센티널 에러 표시
     * @param {HTMLElement} sentinel - 센티널 요소
     * @param {string} message - 에러 메시지
     */
    static showSentinelError(sentinel, message) {
        if (sentinel) {
            sentinel.innerText = message;
        }
    }

    /**
     * 스켈레톤 로딩 카드 생성
     * @param {number} count - 스켈레톤 카드 수
     * @returns {DocumentFragment}
     */
    static createSkeletonCards(count = 3) {
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
            fragment.appendChild(createElement('li', { className: 'skeleton-post' }, [
                createElement('div', { className: 'skeleton-post-header' }, [
                    createElement('div', { className: 'skeleton skeleton-avatar' }),
                    createElement('div', { className: 'skeleton-post-meta' }, [
                        createElement('div', { className: 'skeleton skeleton-text' }),
                        createElement('div', { className: 'skeleton skeleton-text' }),
                    ]),
                ]),
                createElement('div', { className: 'skeleton skeleton-title' }),
                createElement('div', { className: 'skeleton skeleton-text medium' }),
            ]));
        }
        return fragment;
    }

    /**
     * 카테고리 탭 렌더링
     * @param {HTMLElement} container - 탭 컨테이너
     * @param {Array<any>} categories - 카테고리 목록
     * @param {number|null} activeCategoryId - 현재 선택된 카테고리 ID
     * @param {Function} onSelect - 카테고리 선택 핸들러
     */
    static renderCategoryTabs(container, categories, activeCategoryId, onSelect) {
        BaseListView.renderFilterButtons(container, categories, activeCategoryId, onSelect, {
            className: 'category-tab',
            allLabel: '전체',
            getKey: (/** @type {any} */ cat) => cat.category_id,
            getLabel: (/** @type {any} */ cat) => cat.name,
        });
    }
}

export default PostListView;
