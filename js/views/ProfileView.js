// js/views/ProfileView.js
// 프로필 수정 페이지 View - DOM 조작 담당

import { showError, hideError, showToast, getImageUrl } from './helpers.js';

/**
 * 프로필 수정 페이지 View 클래스
 * DOM 요소 참조 및 UI 업데이트 담당
 */
class ProfileView {
    constructor() {
        this.form = null;
        this.emailDisplay = null;
        this.nicknameInput = null;
        this.imgWrapper = null;
        this.fileInput = null;
        this.submitBtn = null;
        this.validationHelper = null;
        this.withdrawBtn = null;
    }

    /**
     * DOM 요소 초기화
     * @returns {boolean} 초기화 성공 여부
     */
    initialize() {
        this.form = document.getElementById('profile-form');
        this.emailDisplay = document.getElementById('email-display');
        this.nicknameInput = document.getElementById('nickname-input');
        this.imgWrapper = document.getElementById('profile-img-wrapper');
        this.fileInput = document.getElementById('profile-file-input');
        this.submitBtn = document.getElementById('submit-btn');
        this.validationHelper = document.getElementById('validation-helper');
        this.withdrawBtn = document.getElementById('withdraw-btn');

        return !!this.form;
    }

    /**
     * 닉네임 값 조회
     * @returns {string}
     */
    getNickname() {
        return this.nicknameInput?.value.trim() || '';
    }

    /**
     * 이메일 표시
     * @param {string} email - 이메일 주소
     */
    setEmail(email) {
        if (this.emailDisplay) {
            this.emailDisplay.value = email;
        }
    }

    /**
     * 닉네임 설정
     * @param {string} nickname - 닉네임
     */
    setNickname(nickname) {
        if (this.nicknameInput) {
            this.nicknameInput.value = nickname;
        }
    }

    /**
     * 프로필 이미지 설정
     * @param {string|null} imageUrl - 이미지 URL
     */
    setProfileImage(imageUrl) {
        if (!this.imgWrapper) return;

        if (imageUrl) {
            const fullUrl = getImageUrl(imageUrl);
            this.imgWrapper.style.backgroundImage = `url(${fullUrl})`;
        } else {
            this.imgWrapper.style.backgroundColor = '#555';
        }
    }

    /**
     * 프로필 이미지 미리보기 표시
     * @param {string} dataUrl - 이미지 Data URL
     */
    showProfilePreview(dataUrl) {
        if (this.imgWrapper) {
            this.imgWrapper.style.backgroundImage = `url(${dataUrl})`;
        }
    }

    /**
     * 닉네임 에러 표시
     * @param {string} message - 에러 메시지
     */
    showNicknameError(message) {
        showError(this.validationHelper, message);
    }

    /**
     * 닉네임 에러 숨기기
     */
    hideNicknameError() {
        if (this.validationHelper) {
            this.validationHelper.style.display = 'none';
        }
    }

    /**
     * 버튼 상태 업데이트
     * @param {boolean} isValid - 유효 여부
     */
    updateButtonState(isValid) {
        if (!this.submitBtn) return;

        if (isValid) {
            this.submitBtn.disabled = false;
            this.submitBtn.classList.add('active');
        } else {
            this.submitBtn.disabled = true;
            this.submitBtn.classList.remove('active');
        }
    }

    /**
     * 성공 토스트 표시
     */
    /**
     * 성공 토스트 표시
     */
    showSuccessToast() {
        showToast('회원정보가 수정되었습니다.');
    }

    /**
     * 토스트 메시지 표시
     * @param {string} message - 메세지
     */
    showToast(message) {
        showToast(message);
    }

    /**
     * 이벤트 리스너 바인딩
     * @param {object} handlers - 이벤트 핸들러 객체
     */
    bindEvents(handlers) {
        // 이미지 업로드 클릭
        if (this.imgWrapper && this.fileInput) {
            this.imgWrapper.addEventListener('click', () => this.fileInput.click());
        }

        if (this.fileInput && handlers.onFileChange) {
            this.fileInput.addEventListener('change', handlers.onFileChange);
        }

        if (this.nicknameInput && handlers.onNicknameInput) {
            this.nicknameInput.addEventListener('input', handlers.onNicknameInput);
        }

        if (this.form && handlers.onSubmit) {
            this.form.addEventListener('submit', handlers.onSubmit);
        }

        if (this.withdrawBtn && handlers.onWithdrawClick) {
            this.withdrawBtn.addEventListener('click', handlers.onWithdrawClick);
        }
    }
}

export default ProfileView;
