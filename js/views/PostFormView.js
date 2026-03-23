// js/views/PostFormView.js
// 게시글 작성/수정 페이지 공통 View

import { showToast, updateButtonState as updateBtnState } from './helpers.js';
import MarkdownEditor from '../components/MarkdownEditor.js';
import { createElement } from '../utils/dom.js';
import PostModel from '../models/PostModel.js';

/**
 * 게시글 폼(작성/수정) 공통 View 클래스
 */
class PostFormView {
    /**
     * @param {string} formId - 폼 요소의 ID
     */
    constructor(formId) {
        this.formId = formId;
        this.form = null;
        this.titleInput = null;
        this.contentInput = null;
        this.submitBtn = null;
        this.validationHelper = null;
        this.fileInput = null;
        this.fileNameEl = null;
        this.previewContainer = null;
        // 태그 관련 상태
        this.tagInput = null;
        this.tagChips = null;
        this.tagSuggestions = null;
        this.tags = [];
        this._tagDebounceTimer = null;
    }

    /**
     * DOM 요소 초기화
     * @param {object} [options={}] - 초기화 옵션
     * @param {Function|null} [options.onImageUpload=null] - 이미지 업로드 콜백 (file → Promise<url>)
     * @returns {boolean} 초기화 성공 여부
     */
    initialize(options = {}) {
        this.form = document.getElementById(this.formId);
        this.titleInput = document.getElementById('post-title');
        this.contentInput = document.getElementById('post-content');
        this.submitBtn = document.getElementById('submit-btn');
        this.validationHelper = document.getElementById('validation-helper');
        this.fileInput = document.getElementById('file-input');
        this.fileNameEl = document.getElementById('file-name');
        this.previewContainer = document.getElementById('image-preview');

        // 마크다운 에디터 래핑
        if (this.contentInput) {
            this.editor = new MarkdownEditor(this.contentInput, {
                onImageUpload: options?.onImageUpload || null,
            });

            // @멘션 자동완성 연결 — 에디터 wrapper를 컨테이너로 사용
            this._initMentionDropdown();
        }

        // 태그 요소 참조
        this.tagInput = document.getElementById('tag-input');
        this.tagChips = document.getElementById('tag-chips');
        this.tagSuggestions = document.getElementById('tag-suggestions');

        return !!this.form;
    }

    /**
     * 태그 입력 UI 초기화 (이벤트 바인딩)
     */
    initializeTags() {
        if (!this.tagInput || !this.tagChips || !this.tagSuggestions) return;

        // Enter 키로 태그 추가
        this.tagInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const value = this.tagInput.value.trim();
                if (value) {
                    this.addTag(value);
                    this.tagInput.value = '';
                    this._hideSuggestions();
                }
            } else if (e.key === 'Escape') {
                this._hideSuggestions();
            }
        });

        // 300ms 디바운스 자동완성 검색
        this.tagInput.addEventListener('input', () => {
            clearTimeout(this._tagDebounceTimer);
            const value = this.tagInput.value.trim();
            if (!value) {
                this._hideSuggestions();
                return;
            }
            this._tagDebounceTimer = setTimeout(async () => {
                try {
                    const result = await PostModel.searchTags(value);
                    if (result.ok) {
                        const tags = result.data?.data?.tags || [];
                        this._showSuggestions(tags);
                    }
                } catch (_unused) {
                    // 자동완성 실패는 무시
                }
            }, 300);
        });

        // 컨테이너 클릭 시 입력창 포커스
        const container = document.getElementById('tag-container');
        if (container) {
            container.addEventListener('click', (e) => {
                if (e.target !== this.tagInput) {
                    this.tagInput.focus();
                }
            });
        }

        // 외부 클릭 시 자동완성 숨기기
        document.addEventListener('click', (e) => {
            if (container && !container.contains(e.target)) {
                this._hideSuggestions();
            }
        });
    }

    /**
     * 태그 추가
     * @param {string} name - 태그 이름
     */
    addTag(name) {
        // 최대 5개 제한
        if (this.tags.length >= 5) return;
        // 중복 제거
        const normalized = name.trim().toLowerCase();
        if (!normalized) return;
        if (this.tags.some(t => t.toLowerCase() === normalized)) return;

        this.tags.push(name.trim());
        this._renderChips();
    }

    /**
     * 태그 제거
     * @param {string} name - 태그 이름
     */
    removeTag(name) {
        this.tags = this.tags.filter(t => t !== name);
        this._renderChips();
    }

    /**
     * 현재 태그 목록 반환
     * @returns {string[]}
     */
    getTags() {
        return [...this.tags];
    }

    /**
     * 태그 목록 설정 (수정 폼에서 기존 태그 로드)
     * @param {Array<{name: string}|string>} tagList - 태그 배열
     */
    setTags(tagList) {
        this.tags = tagList.map(t => (typeof t === 'string' ? t : t.name));
        this._renderChips();
    }

    /**
     * 태그 칩 렌더링
     * @private
     */
    _renderChips() {
        if (!this.tagChips) return;
        this.tagChips.textContent = '';
        this.tags.forEach(tagName => {
            const chip = createElement('span', { className: 'tag-chip' }, [
                `#${tagName}`,
                createElement('button', {
                    type: 'button',
                    className: 'tag-chip-remove',
                    onClick: () => this.removeTag(tagName),
                }, ['×']),
            ]);
            this.tagChips.appendChild(chip);
        });
    }

    /**
     * 자동완성 드롭다운 표시
     * @param {Array<{name: string, post_count: number}>} suggestions - 태그 목록
     * @private
     */
    _showSuggestions(suggestions) {
        if (!this.tagSuggestions) return;
        this.tagSuggestions.textContent = '';

        if (suggestions.length === 0) {
            this._hideSuggestions();
            return;
        }

        suggestions.forEach(tag => {
            const item = createElement('div', {
                className: 'tag-suggestion-item',
                onClick: () => {
                    this.addTag(tag.name);
                    this.tagInput.value = '';
                    this._hideSuggestions();
                    this.tagInput.focus();
                },
            }, [
                createElement('span', {}, [`#${tag.name}`]),
                createElement('span', { className: 'tag-suggestion-count' }, [`${tag.post_count || 0}`]),
            ]);
            this.tagSuggestions.appendChild(item);
        });

        this.tagSuggestions.style.display = '';
    }

    /**
     * 자동완성 드롭다운 숨기기
     * @private
     */
    _hideSuggestions() {
        if (this.tagSuggestions) {
            this.tagSuggestions.style.display = 'none';
            this.tagSuggestions.textContent = '';
        }
    }

    /**
     * 제목 값 조회
     * @returns {string}
     */
    getTitle() {
        return this.titleInput?.value.trim() || '';
    }

    /**
     * 제목 설정
     * @param {string} title - 제목
     */
    setTitle(title) {
        if (this.titleInput) {
            this.titleInput.value = title;
        }
    }

    /**
     * 본문 값 조회
     * @returns {string}
     */
    getContent() {
        return this.contentInput?.value.trim() || '';
    }

    /**
     * 본문 설정
     * @param {string} content - 본문
     */
    setContent(content) {
        if (this.contentInput) {
            this.contentInput.value = content;
        }
    }

    /**
     * 제목 최대 길이 제한 적용
     * @param {number} maxLength - 최대 길이
     */
    enforceTitleMaxLength(maxLength = 26) {
        if (this.titleInput && this.titleInput.value.length > maxLength) {
            this.titleInput.value = this.titleInput.value.slice(0, maxLength);
        }
    }

    /**
     * 이미지 미리보기 표시
     * @param {string} imageUrl - 이미지 URL
     */
    showImagePreview(imageUrl) {
        if (this.previewContainer) {
            this.previewContainer.textContent = '';
            const img = document.createElement('img');
            img.setAttribute('src', imageUrl);
            img.setAttribute('alt', 'Preview');
            img.className = 'preview-img';
            this.previewContainer.appendChild(img);
            this.previewContainer.classList.remove('hidden');
        }
    }

    /**
     * 파일명 표시 설정
     * @param {string} name - 파일명
     */
    setFileName(name) {
        if (this.fileNameEl) {
            this.fileNameEl.textContent = name;
        }
    }

    /**
     * 이미지 미리보기 숨기기
     */
    hideImagePreview() {
        if (this.previewContainer) {
            this.previewContainer.textContent = '';
            this.previewContainer.classList.add('hidden');
        }
    }

    /**
     * 버튼 상태 업데이트
     * @param {boolean} isValid - 유효 여부
     */
    updateButtonState(isValid) {
        updateBtnState(this.submitBtn, isValid);
    }

    /**
     * 유효성 검사 헬퍼 표시/숨기기
     * @param {boolean} show - 표시 여부
     */
    toggleValidationHelper(show) {
        if (this.validationHelper) {
            this.validationHelper.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * 이벤트 리스너 바인딩
     * @param {object} handlers - 이벤트 핸들러 객체
     */
    bindEvents(handlers) {
        if (this.titleInput && handlers.onTitleInput) {
            this.titleInput.addEventListener('input', handlers.onTitleInput);
        }

        if (this.contentInput && handlers.onContentInput) {
            this.contentInput.addEventListener('input', handlers.onContentInput);
        }

        if (this.fileInput && handlers.onFileChange) {
            this.fileInput.addEventListener('change', handlers.onFileChange);
        }

        if (this.form && handlers.onSubmit) {
            this.form.addEventListener('submit', handlers.onSubmit);
        }
    }

    /**
     * 토스트 메시지 표시
     * @param {string} message - 메세지
     */
    showToast(message) {
        showToast(message);
    }

    /**
     * 투표 폼 섹션 생성 및 DOM에 삽입
     * @param {HTMLElement} insertAfter - 이 요소 뒤에 투표 섹션 삽입
     */
    static createPollSection(insertAfter) {
        const section = createElement('div', { id: 'poll-section', className: 'poll-form-section' });

        // 투표 추가 토글 체크박스
        const toggleRow = createElement('label', { className: 'poll-toggle' }, [
            createElement('input', {
                type: 'checkbox',
                id: 'poll-toggle-checkbox',
                onChange: (e) => {
                    const formBody = document.getElementById('poll-form-body');
                    if (formBody) {
                        formBody.style.display = e.target.checked ? '' : 'none';
                    }
                },
            }),
            '투표 추가',
        ]);
        section.appendChild(toggleRow);

        // 투표 폼 본체 (기본 숨김)
        const formBody = createElement('div', {
            id: 'poll-form-body',
            style: { display: 'none' },
        });

        // 질문 입력
        const questionGroup = createElement('div', { className: 'input-group' }, [
            createElement('label', { for: 'poll-question' }, ['투표 질문']),
            createElement('input', {
                type: 'text',
                id: 'poll-question',
                placeholder: '투표 질문을 입력하세요',
                maxlength: '200',
            }),
        ]);
        formBody.appendChild(questionGroup);

        // 옵션 목록 컨테이너
        const optionsContainer = createElement('div', { id: 'poll-options-container' });

        // 기본 2개 옵션
        optionsContainer.appendChild(PostFormView._createOptionInput(1));
        optionsContainer.appendChild(PostFormView._createOptionInput(2));
        formBody.appendChild(optionsContainer);

        // 옵션 추가 버튼
        const addBtn = createElement('button', {
            type: 'button',
            className: 'poll-add-option-btn',
            onClick: () => {
                const container = document.getElementById('poll-options-container');
                if (!container) return;
                const count = container.querySelectorAll('.poll-option-input').length;
                if (count >= 10) return; // 최대 10개
                container.appendChild(PostFormView._createOptionInput(count + 1));
            },
        }, ['+ 옵션 추가']);
        formBody.appendChild(addBtn);

        // 만료일 입력 (선택)
        const expiryGroup = createElement('div', { className: 'input-group' }, [
            createElement('label', { for: 'poll-expires' }, ['만료일 (선택)' ]),
            createElement('input', {
                type: 'datetime-local',
                id: 'poll-expires',
            }),
        ]);
        formBody.appendChild(expiryGroup);

        section.appendChild(formBody);

        // DOM에 삽입
        if (insertAfter && insertAfter.parentNode) {
            insertAfter.parentNode.insertBefore(section, insertAfter.nextSibling);
        }

        return section;
    }

    /**
     * 투표 옵션 입력 행 생성
     * @param {number} index - 옵션 번호
     * @returns {HTMLElement}
     * @private
     */
    static _createOptionInput(index) {
        const row = createElement('div', { className: 'poll-option-input' });

        const input = createElement('input', {
            type: 'text',
            placeholder: `옵션 ${index}`,
            maxlength: '100',
            className: 'poll-option-text',
        });
        row.appendChild(input);

        // 3번째부터 삭제 버튼 표시 (최소 2개 유지)
        if (index > 2) {
            const removeBtn = createElement('button', {
                type: 'button',
                className: 'poll-option-remove-btn',
                onClick: () => {
                    row.remove();
                },
            }, ['X']);
            row.appendChild(removeBtn);
        }

        return row;
    }

    /**
     * @멘션 자동완성 드롭다운 초기화 (동적 import)
     * @private
     */
    async _initMentionDropdown() {
        if (!this.contentInput) return;
        const wrapper = this.contentInput.closest('.md-editor-wrapper');
        if (!wrapper) return;

        const { default: MentionDropdown } = await import('../components/MentionDropdown.js');
        this._mentionDropdown = new MentionDropdown(this.contentInput, wrapper);
    }

    /**
     * 리소스 정리 (페이지 이탈 시 호출)
     */
    destroy() {
        if (this._mentionDropdown) {
            this._mentionDropdown.destroy();
            this._mentionDropdown = null;
        }
    }

    /**
     * 투표 폼 데이터 읽기
     * @param {HTMLElement} container - 투표 섹션 컨테이너
     * @returns {{ question: string, options: string[], expires_at: string|null }|null}
     */
    static getPollData(container) {
        if (!container) return null;

        const checkbox = container.querySelector('#poll-toggle-checkbox');
        if (!checkbox || !checkbox.checked) return null;

        const question = container.querySelector('#poll-question')?.value?.trim() || '';
        if (!question) return null;

        const optionInputs = container.querySelectorAll('.poll-option-text');
        const options = [];
        optionInputs.forEach(input => {
            const val = input.value.trim();
            if (val) options.push(val);
        });

        // 최소 2개 옵션 필요
        if (options.length < 2) return null;

        const expiresInput = container.querySelector('#poll-expires');
        let expiresAt = null;
        if (expiresInput && expiresInput.value) {
            expiresAt = new Date(expiresInput.value).toISOString();
        }

        return { question, options, expires_at: expiresAt };
    }
}

export default PostFormView;
