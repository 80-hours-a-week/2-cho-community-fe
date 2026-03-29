// @ts-check
// js/views/WikiDetailView.js
// 위키 상세 페이지 렌더링

import { createElement } from '../utils/dom.js';
import { formatDate } from '../utils/formatters.js';
import { createDistroBadge } from '../utils/distro.js';
import { renderMarkdownTo } from '../utils/markdown.js';
import { resolveNavPath } from '../config.js';
import { NAV_PATHS } from '../constants.js';

class WikiDetailView {
    /**
     * 위키 페이지 상세 렌더링
     * @param {HTMLElement} container
     * @param {Record<string, any>} page - 위키 페이지 데이터
     * @param {number|null} currentUserId - 현재 로그인 사용자 ID
     */
    static renderWikiPage(container, page, currentUserId) {
        if (!container) return;
        container.textContent = '';
        const title = page.title || '';
        const authorNickname = page.author?.nickname || '알 수 없음';
        const authorDistro = page.author?.distro || null;
        const createdAt = page.created_at ? formatDate(new Date(page.created_at)) : '';
        const viewsCount = page.views_count || 0;
        const content = page.content || '';
        const tags = page.tags || [];
        const lastEditedBy = page.last_edited_by || null;
        const editorNickname = page.editor_nickname || '';
        const updatedAt = page.updated_at ? formatDate(new Date(page.updated_at)) : '';
        // 제목
        container.appendChild(createElement('h1', { className: 'wiki-detail-title' }, [title]));
        // 메타 정보: 작성자 + 배포판 뱃지, 작성일, 조회수
        const metaChildren = [
            createElement('span', { className: 'wiki-detail-author' }, [authorNickname]),
        ];
        const distroBadge = createDistroBadge(authorDistro);
        if (distroBadge) {
            metaChildren.push(distroBadge);
        }
        metaChildren.push(createElement('span', { className: 'wiki-detail-date' }, [createdAt]));
        metaChildren.push(createElement('span', { className: 'wiki-detail-views' }, [`조회 ${viewsCount}`]));
        container.appendChild(createElement('div', { className: 'wiki-detail-meta' }, metaChildren));
        // 마지막 편집자 정보
        if (lastEditedBy && editorNickname) {
            container.appendChild(createElement('div', { className: 'wiki-detail-editor-info' }, [
                `마지막 편집: ${editorNickname} (${updatedAt})`,
            ]));
        }
        // 태그
        if (tags.length > 0) {
            container.appendChild(createElement('div', { className: 'wiki-detail-tags' },
                tags.map(/** @param {any} tag */ tag => createElement('a', {
                    className: 'wiki-tag-badge',
                    href: resolveNavPath(NAV_PATHS.TAG_DETAIL(tag.name)),
                }, [tag.name]))
            ));
        }
        // 마크다운 콘텐츠
        const contentEl = createElement('div', { className: 'wiki-detail-content markdown-body' });
        container.appendChild(contentEl);
        renderMarkdownTo(contentEl, content);
        // 액션 버튼
        const actionChildren = [];
        // 편집 기록 버튼 — 모든 사용자에게 표시
        actionChildren.push(createElement('button', {
            className: 'nav-link-btn',
            id: 'wiki-history-btn',
        }, ['편집 기록']));
        // 수정 버튼 — 로그인 사용자 모두 가능
        if (currentUserId) {
            actionChildren.push(createElement('button', {
                className: 'nav-link-btn',
                id: 'wiki-edit-btn',
                textContent: '페이지 수정',
            }));
        }
        // 삭제 버튼 — 작성자만
        if (currentUserId && currentUserId === page.author_id) {
            actionChildren.push(createElement('button', {
                className: 'nav-link-btn wiki-delete-btn',
                id: 'wiki-delete-btn',
                textContent: '페이지 삭제',
            }));
        }
        if (actionChildren.length > 0) {
            container.appendChild(createElement('div', { className: 'wiki-detail-actions' }, actionChildren));
        }
    }
}

export default WikiDetailView;
