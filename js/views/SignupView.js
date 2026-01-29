// js/views/SignupView.js
// 회원가입 페이지 View - DOM 조작 담당

import { showError, hideError } from './helpers.js';

/**
 * 회원가입 페이지 View 클래스
 * DOM 요소 참조 및 UI 업데이트 담당
 */
class SignupView {
    constructor() {
        this.form = null;
        this.signupBtn = null;
        this.emailInput = null;
        this.passwordInput = null;
        this.passwordConfirmInput = null;
        this.nicknameInput = null;
        this.profileInput = null;
        this.previewImg = null;
        this.placeholder = null;
        this.profileHelper = null;
        this.emailHelper = null;
        this.passwordHelper = null;
        this.passwordConfirmHelper = null;
        this.nicknameHelper = null;
    }

    /**
     * DOM 요소 초기화
     * @returns {boolean} 초기화 성공 여부
     */
    initialize() {
        this.form = document.getElementById('signup-form');
        this.signupBtn = document.querySelector('.login-btn');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.passwordConfirmInput = document.getElementById('password-confirm');
        this.nicknameInput = document.getElementById('nickname');
        this.profileInput = document.getElementById('profile-upload');
        this.previewImg = document.getElementById('preview-img');
        this.placeholder = document.getElementById('preview-placeholder');
        this.profileHelper = document.getElementById('profile-helper');
        this.emailHelper = document.getElementById('email-helper');
        this.passwordHelper = document.getElementById('password-helper');
        this.passwordConfirmHelper = document.getElementById('password-confirm-helper');
        this.nicknameHelper = document.getElementById('nickname-helper');

        return !!this.form;
    }

    /**
     * 이메일 값 조회
     * @returns {string}
     */
    getEmail() {
        return this.emailInput?.value.trim() || '';
    }

    /**
     * 비밀번호 값 조회
     * @returns {string}
     */
    getPassword() {
        return this.passwordInput?.value || '';
    }

    /**
     * 비밀번호 확인 값 조회
     * @returns {string}
     */
    getPasswordConfirm() {
        return this.passwordConfirmInput?.value || '';
    }

    /**
     * 닉네임 값 조회
     * @returns {string}
     */
    getNickname() {
        return this.nicknameInput?.value.trim() || '';
    }

    /**
     * 프로필 이미지 파일 조회
     * @returns {File|null}
     */
    getProfileFile() {
        return this.profileInput?.files[0] || null;
    }

    /**
     * 프로필 에러 표시
     * @param {string} message - 에러 메시지
     */
    showProfileError(message) {
        showError(this.profileHelper, message);
    }

    /**
     * 프로필 에러 숨기기
     */
    hideProfileError() {
        hideError(this.profileHelper);
    }

    /**
     * 이메일 에러 표시
     * @param {string} message - 에러 메시지
     */
    showEmailError(message) {
        showError(this.emailHelper, message);
    }

    /**
     * 이메일 에러 숨기기
     */
    hideEmailError() {
        hideError(this.emailHelper);
    }

    /**
     * 비밀번호 에러 표시
     * @param {string} message - 에러 메시지
     */
    showPasswordError(message) {
        showError(this.passwordHelper, message);
    }

    /**
     * 비밀번호 에러 숨기기
     */
    hidePasswordError() {
        hideError(this.passwordHelper);
    }

    /**
     * 비밀번호 확인 에러 표시
     * @param {string} message - 에러 메시지
     */
    showPasswordConfirmError(message) {
        showError(this.passwordConfirmHelper, message);
    }

    /**
     * 비밀번호 확인 에러 숨기기
     */
    hidePasswordConfirmError() {
        hideError(this.passwordConfirmHelper);
    }

    /**
     * 닉네임 에러 표시
     * @param {string} message - 에러 메시지
     */
    showNicknameError(message) {
        showError(this.nicknameHelper, message);
    }

    /**
     * 닉네임 에러 숨기기
     */
    hideNicknameError() {
        hideError(this.nicknameHelper);
    }

    /**
     * 프로필 이미지 미리보기 표시
     * @param {string} dataUrl - 이미지 Data URL
     */
    showProfilePreview(dataUrl) {
        if (this.previewImg) {
            this.previewImg.src = dataUrl;
            this.previewImg.classList.remove('hidden');
        }
        if (this.placeholder) {
            this.placeholder.classList.add('hidden');
        }
    }

    /**
     * 프로필 이미지 미리보기 숨기기
     */
    hideProfilePreview() {
        if (this.previewImg) {
            this.previewImg.src = '';
            this.previewImg.classList.add('hidden');
        }
        if (this.placeholder) {
            this.placeholder.classList.remove('hidden');
        }
    }

    /**
     * 버튼 상태 업데이트
     * @param {boolean} isValid - 유효 여부
     * @param {string} [activeColor='#7F6AEE'] - 활성 색상
     * @param {string} [inactiveColor='#ACA0EB'] - 비활성 색상
     */
    updateButtonState(isValid, activeColor = '#7F6AEE', inactiveColor = '#ACA0EB') {
        if (!this.signupBtn) return;

        this.signupBtn.disabled = !isValid;
        this.signupBtn.style.backgroundColor = isValid ? activeColor : inactiveColor;

        if (isValid) {
            this.signupBtn.classList.add('active');
        } else {
            this.signupBtn.classList.remove('active');
        }
    }

    /**
     * 폼 데이터 생성
     * @returns {FormData}
     */
    createFormData() {
        const formData = new FormData();
        formData.append('email', this.getEmail());
        formData.append('password', this.getPassword());
        formData.append('nickname', this.getNickname());

        const profileFile = this.getProfileFile();
        if (profileFile) {
            formData.append('profile_image', profileFile);
        }

        return formData;
    }

    /**
     * 이벤트 리스너 바인딩
     * @param {object} handlers - 이벤트 핸들러 객체
     */
    bindEvents(handlers) {
        if (this.profileInput && handlers.onProfileChange) {
            this.profileInput.addEventListener('change', handlers.onProfileChange);
        }

        if (this.emailInput && handlers.onEmailInput) {
            this.emailInput.addEventListener('input', handlers.onEmailInput);
        }

        if (this.passwordInput && handlers.onPasswordInput) {
            this.passwordInput.addEventListener('input', handlers.onPasswordInput);
        }

        if (this.passwordConfirmInput && handlers.onPasswordConfirmInput) {
            this.passwordConfirmInput.addEventListener('input', handlers.onPasswordConfirmInput);
        }

        if (this.nicknameInput && handlers.onNicknameInput) {
            this.nicknameInput.addEventListener('input', handlers.onNicknameInput);
        }

        if (this.form && handlers.onSubmit) {
            this.form.addEventListener('submit', handlers.onSubmit);
        }
    }

    /**
     * 뒤로 가기 버튼 설정
     */
    setupBackButton() {
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.history.back();
                if (document.referrer === '') {
                    window.location.href = '/login';
                }
            });
        }
    }
}

export default SignupView;
