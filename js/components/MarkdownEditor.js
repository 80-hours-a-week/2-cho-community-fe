// js/components/MarkdownEditor.js
// 마크다운 에디터 컴포넌트 — 툴바 + 미리보기

import { Icons } from '../utils/icons.js';
import { renderMarkdown } from '../utils/markdown.js';

/** 풀 모드 (게시글) 툴바 액션 */
const FULL_ACTIONS = [
    'bold', 'italic', 'strikethrough', '|',
    'heading', 'quote', 'hr', '|',
    'code', 'codeBlock', '|',
    'link', 'image', '|',
    'listUl', 'listOl', '|',
    'preview',
];

/** 컴팩트 모드 (댓글) 툴바 액션 */
const COMPACT_ACTIONS = [
    'bold', 'italic', 'code', 'codeBlock', 'link', '|', 'preview',
];

/** 액션별 설정 */
const ACTION_CONFIG = {
    bold:          { icon: 'bold',          title: '굵게 (Ctrl+B)',      wrap: ['**', '**'] },
    italic:        { icon: 'italic',        title: '기울임 (Ctrl+I)',    wrap: ['*', '*'] },
    strikethrough: { icon: 'strikethrough', title: '취소선',             wrap: ['~~', '~~'] },
    heading:       { icon: 'heading',       title: '제목',               prefix: '## ' },
    quote:         { icon: 'quote',         title: '인용',               prefix: '> ' },
    hr:            { icon: 'minus',         title: '구분선',             insert: '\n---\n' },
    code:          { icon: 'code',          title: '인라인 코드',        wrap: ['`', '`'] },
    codeBlock:     { icon: 'codeBlock',     title: '코드 블록',          wrap: ['```\n', '\n```'] },
    link:          { icon: 'link',          title: '링크',               wrap: ['[', '](url)'] },
    image:         { icon: 'image',         title: '이미지',             wrap: ['![alt](', ')'] },
    listUl:        { icon: 'listUl',        title: '목록',               prefix: '- ' },
    listOl:        { icon: 'listOl',        title: '번호 목록',          prefix: '1. ' },
    preview:       { icon: 'eye',           title: '미리보기 토글',      toggle: true },
};

class MarkdownEditor {
    /**
     * @param {HTMLTextAreaElement} textarea - 래핑할 textarea 요소
     * @param {object} [options]
     * @param {boolean} [options.compact=false] - 컴팩트 모드 (댓글용)
     */
    constructor(textarea, options = {}) {
        this.textarea = textarea;
        this.compact = options.compact || false;
        this.isPreviewing = false;
        this.previewEl = null;

        this._build();
        this._bindKeyboard();
    }

    /** 에디터 UI 구성 */
    _build() {
        const wrapper = document.createElement('div');
        wrapper.className = `md-editor-wrapper${this.compact ? ' md-editor-compact' : ''}`;

        // 툴바
        const toolbar = document.createElement('div');
        toolbar.className = 'md-toolbar';

        const actions = this.compact ? COMPACT_ACTIONS : FULL_ACTIONS;
        actions.forEach(action => {
            if (action === '|') {
                const sep = document.createElement('span');
                sep.className = 'md-toolbar-sep';
                toolbar.appendChild(sep);
                return;
            }

            const config = ACTION_CONFIG[action];
            if (!config) return;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'md-toolbar-btn';
            btn.title = config.title;
            btn.appendChild(Icons[config.icon](16));

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this._handleAction(action);
            });

            toolbar.appendChild(btn);
        });

        // 미리보기 영역
        this.previewEl = document.createElement('div');
        this.previewEl.className = 'md-preview markdown-body';
        if (this.compact) this.previewEl.classList.add('markdown-body--compact');
        this.previewEl.style.display = 'none';

        // DOM 조립 — textarea의 부모에 wrapper 삽입
        this.textarea.parentNode.insertBefore(wrapper, this.textarea);
        wrapper.appendChild(toolbar);
        wrapper.appendChild(this.textarea);
        wrapper.appendChild(this.previewEl);
    }

    /** 키보드 단축키 */
    _bindKeyboard() {
        this.textarea.addEventListener('keydown', (e) => {
            if (!(e.ctrlKey || e.metaKey)) return;

            switch (e.key.toLowerCase()) {
            case 'b':
                e.preventDefault();
                this._handleAction('bold');
                break;
            case 'i':
                e.preventDefault();
                this._handleAction('italic');
                break;
            }
        });

        // Tab → 2칸 스페이스 삽입 (코드 작성 시 유용)
        this.textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const { selectionStart, selectionEnd } = this.textarea;
                this.textarea.value =
                    this.textarea.value.substring(0, selectionStart) +
                    '  ' +
                    this.textarea.value.substring(selectionEnd);
                this.textarea.selectionStart = this.textarea.selectionEnd = selectionStart + 2;
                this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
    }

    /** 액션 핸들러 디스패치 */
    _handleAction(action) {
        const config = ACTION_CONFIG[action];
        if (!config) return;

        if (config.toggle) {
            this.togglePreview();
        } else if (config.wrap) {
            this._wrapSelection(config.wrap[0], config.wrap[1]);
        } else if (config.prefix) {
            this._prefixLine(config.prefix);
        } else if (config.insert) {
            this._insertText(config.insert);
        }
    }

    /**
     * 선택 영역을 before/after로 래핑
     * 선택 없으면 커서 위치에 삽입 후 커서를 사이에 배치
     */
    _wrapSelection(before, after) {
        const { selectionStart, selectionEnd, value } = this.textarea;
        const selected = value.substring(selectionStart, selectionEnd);

        const replacement = before + selected + after;
        this.textarea.value = value.substring(0, selectionStart) + replacement + value.substring(selectionEnd);

        // 선택 영역이 있으면 래핑된 텍스트 전체를 선택, 없으면 커서를 사이에 배치
        if (selected) {
            this.textarea.selectionStart = selectionStart;
            this.textarea.selectionEnd = selectionStart + replacement.length;
        } else {
            this.textarea.selectionStart = this.textarea.selectionEnd = selectionStart + before.length;
        }

        this.textarea.focus();
        this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    /** 현재 줄 앞에 접두사 추가 */
    _prefixLine(prefix) {
        const { selectionStart, value } = this.textarea;
        const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;

        this.textarea.value = value.substring(0, lineStart) + prefix + value.substring(lineStart);
        this.textarea.selectionStart = this.textarea.selectionEnd = selectionStart + prefix.length;

        this.textarea.focus();
        this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    /** 커서 위치에 텍스트 삽입 */
    _insertText(text) {
        const { selectionStart, selectionEnd, value } = this.textarea;
        this.textarea.value = value.substring(0, selectionStart) + text + value.substring(selectionEnd);
        this.textarea.selectionStart = this.textarea.selectionEnd = selectionStart + text.length;

        this.textarea.focus();
        this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    /** 미리보기 토글 */
    togglePreview() {
        this.isPreviewing = !this.isPreviewing;

        if (this.isPreviewing) {
            // renderMarkdown()은 내부적으로 DOMPurify sanitization을 거침 — XSS safe
            this.previewEl.textContent = '';
            const sanitized = renderMarkdown(this.textarea.value);
            const template = document.createElement('template');
            template.innerHTML = sanitized; // eslint-disable-line no-unsanitized/property -- DOMPurify sanitized
            this.previewEl.appendChild(template.content);
            this.previewEl.style.display = '';
            this.textarea.style.display = 'none';
        } else {
            this.previewEl.style.display = 'none';
            this.textarea.style.display = '';
            this.textarea.focus();
        }

        // 미리보기 버튼 아이콘 토글
        const wrapper = this.textarea.closest('.md-editor-wrapper');
        if (wrapper) {
            const previewBtn = wrapper.querySelector('.md-toolbar-btn:last-child');
            if (previewBtn) {
                previewBtn.textContent = '';
                previewBtn.appendChild(
                    Icons[this.isPreviewing ? 'eyeOff' : 'eye'](16)
                );
            }
        }
    }

    /** textarea 값 조회 */
    getValue() {
        return this.textarea.value;
    }

    /** textarea 값 설정 */
    setValue(value) {
        this.textarea.value = value;
        if (this.isPreviewing) {
            this.previewEl.textContent = '';
            const sanitized = renderMarkdown(value);
            const template = document.createElement('template');
            template.innerHTML = sanitized; // eslint-disable-line no-unsanitized/property -- DOMPurify sanitized
            this.previewEl.appendChild(template.content);
        }
    }
}

export default MarkdownEditor;
