// @ts-check
// js/views/WikiRevisionView.js
// 위키 리비전 상세 보기 렌더링

import { createElement } from '../utils/dom.js';
import { formatDate } from '../utils/formatters.js';
import { renderMarkdownTo } from '../utils/markdown.js';
import { resolveNavPath } from '../config.js';
import { NAV_PATHS } from '../constants.js';

class WikiRevisionView {
    /**
     * 위키 리비전 상세 렌더링
     * @param {HTMLElement} container
     * @param {Record<string, any>} revision - 리비전 데이터
     * @param {string} slug - 위키 페이지 slug
     */
    static renderRevision(container, revision, slug) {
        if (!container) return;
        container.textContent = '';

        const revisionNumber = revision.revision_number || 0;
        const isCurrent = revision.is_current || false;
        const title = revision.title || '';
        const editorNickname = revision.editor?.nickname || revision.editor_nickname || '알 수 없음';
        const editedAt = revision.created_at ? formatDate(new Date(revision.created_at)) : '';
        const editSummary = revision.edit_summary || '';
        const content = revision.content || '';

        // 이전 버전 경고 배너
        if (!isCurrent) {
            container.appendChild(createElement('div', { className: 'wiki-revision-banner' }, [
                `이 페이지의 이전 버전입니다 (리비전 ${revisionNumber})`,
            ]));
        }

        // 제목
        container.appendChild(createElement('h1', { className: 'wiki-detail-title' }, [title]));

        // 메타 정보: 편집자, 날짜, 편집 요약
        const metaChildren = [
            createElement('span', { className: 'wiki-detail-author' }, [editorNickname]),
            createElement('span', { className: 'wiki-detail-date' }, [editedAt]),
        ];
        if (editSummary) {
            metaChildren.push(createElement('span', { className: 'wiki-detail-summary' }, [editSummary]));
        }
        container.appendChild(createElement('div', { className: 'wiki-detail-meta' }, metaChildren));

        // 마크다운 콘텐츠
        const contentEl = createElement('div', { className: 'wiki-detail-content markdown-body' });
        container.appendChild(contentEl);
        renderMarkdownTo(contentEl, content);

        // 액션 버튼
        const actionChildren = [];

        // 롤백 버튼 — 현재 리비전이 아닌 경우만 표시
        if (!isCurrent) {
            actionChildren.push(createElement('button', {
                className: 'nav-link-btn',
                id: 'rollback-btn',
                textContent: '이 버전으로 롤백',
            }));
        }

        // 편집 기록으로 돌아가기 링크
        actionChildren.push(createElement('a', {
            className: 'nav-link-btn',
            href: resolveNavPath(NAV_PATHS.WIKI_HISTORY(slug)),
            textContent: '편집 기록으로 돌아가기',
        }));

        container.appendChild(createElement('div', { className: 'wiki-detail-actions' }, actionChildren));
    }
}

export default WikiRevisionView;
