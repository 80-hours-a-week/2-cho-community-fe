// @ts-check
// js/views/TagDetailView.js
// 태그 상세 페이지 렌더링

import { createElement } from '../utils/dom.js';
import { formatDate } from '../utils/formatters.js';
import { renderMarkdownTo } from '../utils/markdown.js';

class TagDetailView {
    /**
     * 태그 상세 렌더링
     * @param {HTMLElement} container
     * @param {Record<string, any>} tag - 태그 데이터
     * @param {number|null} currentUserId - 현재 로그인 사용자 ID
     */
    static renderTagDetail(container, tag, currentUserId) {
        if (!container) return;
        container.textContent = '';

        const name = tag.name || '';
        const description = tag.description || '';
        const body = tag.body || '';
        const postCount = tag.post_count || 0;
        const wikiCount = tag.wiki_count || 0;
        const lastEditedBy = tag.last_edited_by_nickname || null;
        const updatedAt = tag.updated_at ? formatDate(new Date(tag.updated_at)) : '';

        // 태그 이름
        container.appendChild(createElement('h1', { className: 'tag-detail-name' }, [`#${name}`]));

        // 설명
        if (description) {
            container.appendChild(createElement('p', { className: 'tag-detail-description' }, [description]));
        }

        // 통계
        container.appendChild(createElement('div', { className: 'tag-detail-stats' }, [
            `게시글 ${postCount}개 \u00B7 위키 ${wikiCount}개`,
        ]));

        // 수정 버튼 (로그인 사용자만)
        if (currentUserId) {
            container.appendChild(createElement('div', { className: 'tag-detail-actions' }, [
                createElement('button', {
                    className: 'nav-link-btn',
                    id: 'tag-edit-btn',
                    textContent: '태그 설명 수정',
                }),
            ]));
        }

        // 마크다운 본문
        if (body) {
            const bodyEl = createElement('div', { className: 'tag-detail-body markdown-body' });
            container.appendChild(bodyEl);
            renderMarkdownTo(bodyEl, body);
        }

        // 마지막 편집자 정보
        if (lastEditedBy) {
            container.appendChild(createElement('div', { className: 'tag-detail-editor-info' }, [
                `마지막 편집: ${lastEditedBy} (${updatedAt})`,
            ]));
        }

        // 탭 버튼
        const tabContainer = createElement('div', { className: 'tag-detail-tabs' }, [
            createElement('button', {
                className: 'tag-tab-btn active',
                dataset: { tab: 'posts' },
                textContent: '게시글',
            }),
            createElement('button', {
                className: 'tag-tab-btn',
                dataset: { tab: 'wiki' },
                textContent: '위키',
            }),
        ]);
        container.appendChild(tabContainer);

        // 목록 컨테이너
        container.appendChild(createElement('ul', {
            className: 'tag-detail-list',
            id: 'tag-list-container',
        }));

        // 로딩 센티널
        container.appendChild(createElement('div', {
            className: 'loading-sentinel',
            id: 'tag-loading-sentinel',
            textContent: 'loading...',
        }));
    }

    /**
     * 태그 수정 폼 렌더링
     * @param {HTMLElement} container
     * @param {Record<string, any>} tag - 태그 데이터
     * @param {Function} onSubmit - 저장 핸들러 (data) => void
     * @param {Function} onCancel - 취소 핸들러
     */
    static renderEditForm(container, tag, onSubmit, onCancel) {
        if (!container) return;
        container.textContent = '';

        const descInput = createElement('input', {
            className: 'input-field',
            type: 'text',
            placeholder: '태그 한 줄 설명',
        });
        /** @type {HTMLInputElement} */ (descInput).value = tag.description || '';

        const bodyTextarea = createElement('textarea', {
            className: 'input-field tag-edit-body',
            placeholder: '태그 상세 설명 (마크다운 지원)',
        });
        /** @type {HTMLTextAreaElement} */ (bodyTextarea).value = tag.body || '';
        /** @type {HTMLTextAreaElement} */ (bodyTextarea).rows = 10;

        const form = createElement('div', { className: 'tag-edit-form' }, [
            createElement('div', { className: 'input-group' }, [
                createElement('label', {}, ['한 줄 설명']),
                descInput,
            ]),
            createElement('div', { className: 'input-group' }, [
                createElement('label', {}, ['상세 설명']),
                bodyTextarea,
            ]),
            createElement('div', { className: 'tag-edit-form-actions' }, [
                createElement('button', {
                    className: 'btn btn-primary',
                    textContent: '저장',
                    onClick: () => {
                        const data = {
                            description: /** @type {HTMLInputElement} */ (descInput).value.trim(),
                            body: /** @type {HTMLTextAreaElement} */ (bodyTextarea).value.trim(),
                        };
                        onSubmit(data);
                    },
                }),
                createElement('button', {
                    className: 'btn btn-secondary',
                    textContent: '취소',
                    onClick: () => onCancel(),
                }),
            ]),
        ]);
        container.appendChild(form);
    }
}

export default TagDetailView;
