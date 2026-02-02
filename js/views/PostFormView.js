// js/views/PostFormView.js
// 게시글 작성/수정 페이지 공통 View

import { showToast, updateButtonState as updateBtnState } from './helpers.js';

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
    }

    /**
     * DOM 요소 초기화
     * @returns {boolean} 초기화 성공 여부
     */
    initialize() {
        this.form = document.getElementById(this.formId);
        this.titleInput = document.getElementById('post-title');
        this.contentInput = document.getElementById('post-content');
        this.submitBtn = document.getElementById('submit-btn');
        this.validationHelper = document.getElementById('validation-helper');
        this.fileInput = document.getElementById('file-input');
        this.fileNameEl = document.getElementById('file-name');
        this.previewContainer = document.getElementById('image-preview');

        return !!this.form;
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
     * 선택된 파일 조회
     * @returns {File|null}
     */
    getSelectedFile() {
        return this.fileInput?.files[0] || null;
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
            this.previewContainer.innerHTML = `<img src="${imageUrl}" alt="Preview" class="preview-img">`;
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
            this.previewContainer.innerHTML = '';
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
}

export default PostFormView;
