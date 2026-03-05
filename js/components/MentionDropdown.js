// js/components/MentionDropdown.js
// @멘션 자동완성 드롭다운 컴포넌트

import { createElement } from '../utils/dom.js';
import { escapeCssUrl } from '../utils/formatters.js';
import UserModel from '../models/UserModel.js';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 1;

/**
 * 멘션 자동완성 드롭다운.
 * textarea에 @를 입력하면 닉네임 후보를 드롭다운으로 표시한다.
 */
class MentionDropdown {
    /**
     * @param {HTMLTextAreaElement} textarea - 대상 textarea
     * @param {HTMLElement} container - 드롭다운을 삽입할 position:relative 컨테이너
     */
    constructor(textarea, container) {
        this.textarea = textarea;
        this.container = container;
        this.dropdownEl = null;
        this.items = [];
        this.selectedIndex = -1;
        this._debounceTimer = null;
        this._mentionStart = -1;

        this._onInput = this._onInput.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onBlur = this._onBlur.bind(this);

        this.textarea.addEventListener('input', this._onInput);
        this.textarea.addEventListener('keydown', this._onKeyDown);
        this.textarea.addEventListener('blur', this._onBlur);
    }

    /** textarea input 이벤트 핸들러 */
    _onInput() {
        const { value, selectionStart } = this.textarea;
        const beforeCursor = value.slice(0, selectionStart);
        const atIndex = beforeCursor.lastIndexOf('@');

        if (atIndex === -1) {
            this._close();
            return;
        }

        // @ 앞이 공백이거나 문자열 시작이어야 유효한 멘션
        if (atIndex > 0 && !/\s/.test(value[atIndex - 1])) {
            this._close();
            return;
        }

        const query = beforeCursor.slice(atIndex + 1);

        // 쿼리에 공백이 있으면 멘션 종료
        if (/\s/.test(query)) {
            this._close();
            return;
        }

        this._mentionStart = atIndex;

        if (query.length < MIN_QUERY_LENGTH) {
            this._close();
            return;
        }

        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => this._search(query), DEBOUNCE_MS);
    }

    /** API 검색 호출 */
    async _search(query) {
        try {
            const results = await UserModel.searchUsers(query);
            this.items = results;
            this.selectedIndex = -1;

            if (results.length === 0) {
                this._close();
                return;
            }

            this._render();
        } catch {
            this._close();
        }
    }

    /** 드롭다운 렌더링 */
    _render() {
        this._removeDropdown();

        this.dropdownEl = createElement('ul', { className: 'mention-dropdown' },
            this.items.map((user, index) =>
                createElement('li', {
                    className: `mention-dropdown-item${index === this.selectedIndex ? ' selected' : ''}`,
                    onMousedown: (e) => {
                        e.preventDefault();
                        this._select(index);
                    },
                    onMouseenter: () => {
                        this.selectedIndex = index;
                        this._updateSelection();
                    },
                }, [
                    createElement('div', {
                        className: 'mention-dropdown-avatar',
                        style: {
                            backgroundImage: `url('${escapeCssUrl(user.profileImageUrl)}')`,
                        },
                    }),
                    createElement('span', {
                        className: 'mention-dropdown-name',
                    }, [user.nickname]),
                ])
            )
        );

        this.container.appendChild(this.dropdownEl);
    }

    /** 선택 항목 하이라이트 갱신 */
    _updateSelection() {
        if (!this.dropdownEl) return;
        const items = this.dropdownEl.querySelectorAll('.mention-dropdown-item');
        items.forEach((el, i) => {
            el.classList.toggle('selected', i === this.selectedIndex);
        });
    }

    /** 항목 선택 — textarea에 닉네임 삽입 */
    _select(index) {
        const user = this.items[index];
        if (!user) return;

        const { value } = this.textarea;
        const before = value.slice(0, this._mentionStart);
        const after = value.slice(this.textarea.selectionStart);
        const insert = `@${user.nickname} `;

        this.textarea.value = before + insert + after;

        const newPos = before.length + insert.length;
        this.textarea.selectionStart = newPos;
        this.textarea.selectionEnd = newPos;
        this.textarea.focus();

        this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
        this._close();
    }

    /** 키보드 네비게이션 */
    _onKeyDown(e) {
        if (!this.dropdownEl || this.items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selectedIndex = Math.min(this.selectedIndex + 1, this.items.length - 1);
            this._updateSelection();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
            this._updateSelection();
        } else if (e.key === 'Enter' && this.selectedIndex >= 0) {
            e.preventDefault();
            this._select(this.selectedIndex);
        } else if (e.key === 'Escape') {
            this._close();
        }
    }

    /** blur 시 드롭다운 닫기 */
    _onBlur() {
        setTimeout(() => this._close(), 150);
    }

    /** 드롭다운 닫기 */
    _close() {
        this._mentionStart = -1;
        this.items = [];
        this.selectedIndex = -1;
        clearTimeout(this._debounceTimer);
        this._removeDropdown();
    }

    /** DOM에서 드롭다운 제거 */
    _removeDropdown() {
        if (this.dropdownEl && this.dropdownEl.parentNode) {
            this.dropdownEl.parentNode.removeChild(this.dropdownEl);
        }
        this.dropdownEl = null;
    }

    /** 리소스 정리 */
    destroy() {
        this._close();
        this.textarea.removeEventListener('input', this._onInput);
        this.textarea.removeEventListener('keydown', this._onKeyDown);
        this.textarea.removeEventListener('blur', this._onBlur);
    }
}

export default MentionDropdown;
