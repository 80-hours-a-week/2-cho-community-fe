// @ts-check
// js/views/WikiListView.js
// 위키 목록 렌더링

import { createElement } from '../utils/dom.js';
import { formatDate } from '../utils/formatters.js';

class WikiListView {
    /**
     * 위키 카드 요소 생성
     * @param {object} page - 위키 페이지 데이터
     * @param {Function} onClick - 클릭 핸들러
     * @returns {HTMLElement}
     */
    static createWikiCard(page, onClick) {
        const title = page.title || '';
        const authorNickname = page.author?.nickname || '알 수 없음';
        const viewsCount = page.views_count || 0;
        const createdAt = page.created_at ? formatDate(new Date(page.created_at)) : '';
        const tags = page.tags || [];

        const card = createElement('li', { className: 'wiki-card', onClick: () => onClick(page.slug) }, [
            // 태그 뱃지
            createElement('div', { className: 'wiki-card-tags' },
                tags.map(tag => createElement('span', { className: 'wiki-tag-badge' }, [tag]))
            ),
            // 제목
            createElement('h3', { className: 'wiki-card-title' }, [title]),
            // 메타 정보
            createElement('div', { className: 'wiki-card-meta' }, [
                `작성자: ${authorNickname} · 조회 ${viewsCount} · ${createdAt}`,
            ]),
        ]);

        return card;
    }

    /**
     * 위키 페이지 목록 렌더링
     * @param {HTMLElement} container
     * @param {Array} pages
     * @param {Function} onPageClick
     */
    static renderWikiPages(container, pages, onPageClick) {
        if (!container) return;
        pages.forEach(page => {
            const card = WikiListView.createWikiCard(page, onPageClick);
            container.appendChild(card);
        });
    }

    /**
     * 빈 상태 렌더링
     * @param {HTMLElement} container
     * @param {string} [message]
     */
    static renderEmptyState(container, message = '등록된 위키 페이지가 없습니다.') {
        if (!container) return;
        const empty = createElement('li', { className: 'empty-state' }, [message]);
        container.appendChild(empty);
    }

    /**
     * 태그 필터 버튼 렌더링
     * @param {HTMLElement} container
     * @param {Array<string>} tags - 사용 가능한 태그 목록
     * @param {string|null} activeTag - 현재 활성 태그
     * @param {Function} onTagClick - 태그 클릭 핸들러
     */
    static renderTagFilters(container, tags, activeTag, onTagClick) {
        if (!container) return;
        container.textContent = '';

        // 전체 버튼
        const allBtn = createElement('button', {
            className: `category-filter-btn${!activeTag ? ' active' : ''}`,
            textContent: '전체',
            onClick: () => onTagClick(null),
        });
        container.appendChild(allBtn);

        // 각 태그 버튼
        tags.forEach(tag => {
            const btn = createElement('button', {
                className: `category-filter-btn${activeTag === tag ? ' active' : ''}`,
                textContent: tag,
                dataset: { tag },
                onClick: () => onTagClick(tag),
            });
            container.appendChild(btn);
        });
    }

    /**
     * 로딩 센티넬 토글
     * @param {HTMLElement|null} sentinel
     * @param {boolean} show
     */
    static toggleLoadingSentinel(sentinel, show) {
        if (!sentinel) return;
        sentinel.style.display = show ? '' : 'none';
    }
}

export default WikiListView;
