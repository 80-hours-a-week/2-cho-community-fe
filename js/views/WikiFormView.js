// @ts-check
// js/views/WikiFormView.js
// 위키 작성/수정 폼 렌더링

import { createElement } from '../utils/dom.js';
import MarkdownEditor from '../components/MarkdownEditor.js';

class WikiFormView {
    /**
     * 위키 작성/수정 폼 렌더링
     * @param {HTMLElement} container
     * @param {object} options
     * @param {object} [options.existingPage] - 수정 시 기존 페이지 데이터
     * @param {Function} options.onSubmit - 제출 핸들러
     * @param {Function} [options.onCancel] - 취소 핸들러
     */
    static renderForm(container, options) {
        if (!container) return;
        container.textContent = '';

        const { existingPage, onSubmit, onCancel } = options;
        const isEdit = !!existingPage;

        // 제목 입력
        const titleInput = createElement('input', {
            type: 'text',
            className: 'form-input',
            id: 'wiki-title',
            placeholder: '페이지 제목',
            maxlength: '200',
        });
        if (existingPage?.title) {
            /** @type {HTMLInputElement} */ (titleInput).value = existingPage.title;
        }

        const formChildren = [
            createElement('div', { className: 'input-group' }, [
                createElement('label', { className: 'form-label', for: 'wiki-title' }, ['제목']),
                titleInput,
            ]),
        ];

        // 슬러그 입력 — 작성 시에만 표시
        if (!isEdit) {
            const slugInput = createElement('input', {
                type: 'text',
                className: 'form-input',
                id: 'wiki-slug',
                placeholder: 'page-slug',
                maxlength: '200',
            });

            formChildren.push(
                createElement('div', { className: 'input-group' }, [
                    createElement('label', { className: 'form-label', for: 'wiki-slug' }, ['슬러그']),
                    slugInput,
                    createElement('span', { className: 'slug-helper' }, ['영문 소문자, 숫자, 하이픈만 사용']),
                ])
            );
        }

        // 태그 입력
        const tagsInput = createElement('input', {
            type: 'text',
            className: 'form-input',
            id: 'wiki-tags',
            placeholder: '태그1, 태그2, 태그3',
        });
        if (existingPage?.tags && Array.isArray(existingPage.tags)) {
            /** @type {HTMLInputElement} */ (tagsInput).value = existingPage.tags.map(t => t.name).join(', ');
        }

        formChildren.push(
            createElement('div', { className: 'input-group' }, [
                createElement('label', { className: 'form-label', for: 'wiki-tags' }, ['태그']),
                tagsInput,
                createElement('span', { className: 'slug-helper' }, ['쉼표로 구분']),
            ])
        );

        // 콘텐츠 textarea
        const contentTextarea = createElement('textarea', {
            className: 'form-textarea',
            id: 'wiki-content',
            placeholder: '마크다운으로 내용을 작성하세요.',
            rows: '15',
        });
        if (existingPage?.content) {
            /** @type {HTMLTextAreaElement} */ (contentTextarea).value = existingPage.content;
        }

        formChildren.push(
            createElement('div', { className: 'input-group' }, [
                createElement('label', { className: 'form-label', for: 'wiki-content' }, ['내용']),
                contentTextarea,
            ])
        );

        // 버튼
        const submitBtn = createElement('button', {
            className: 'review-submit-btn',
            textContent: isEdit ? '페이지 수정' : '페이지 작성',
            onClick: () => {
                const data = {
                    title: /** @type {HTMLInputElement} */ (titleInput).value.trim(),
                    tags: /** @type {HTMLInputElement} */ (tagsInput).value
                        .split(',')
                        .map(t => t.trim())
                        .filter(t => t.length > 0),
                    content: /** @type {HTMLTextAreaElement} */ (contentTextarea).value.trim(),
                };

                // 작성 시 슬러그 포함
                if (!isEdit) {
                    const slugEl = /** @type {HTMLInputElement} */ (document.getElementById('wiki-slug'));
                    if (slugEl) {
                        /** @type {any} */ (data).slug = slugEl.value.trim();
                    }
                }

                onSubmit(data);
            },
        });

        const buttonRow = createElement('div', { className: 'review-form-buttons' }, [submitBtn]);

        if (onCancel) {
            const cancelBtn = createElement('button', {
                className: 'review-cancel-btn',
                textContent: '취소',
                onClick: () => onCancel(),
            });
            buttonRow.appendChild(cancelBtn);
        }

        formChildren.push(buttonRow);

        const form = createElement('div', { className: 'wiki-form' }, formChildren);
        container.appendChild(form);

        // MarkdownEditor 래핑
        new MarkdownEditor(/** @type {HTMLTextAreaElement} */ (contentTextarea), { compact: false });
    }
}

export default WikiFormView;
