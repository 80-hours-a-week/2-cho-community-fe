// js/views/LoginView.js
// 로그인 페이지 View - DOM 조작 담당

import { showError, hideError } from './helpers.js';

/**
 * 로그인 페이지 View 클래스
 * DOM 요소 참조 및 UI 업데이트 담당
 */
class LoginView {
    constructor() {
        this.form = null;
        this.emailInput = null;
        this.passwordInput = null;
        this.loginBtn = null;
        this.emailHelper = null;
        this.passwordHelper = null;
    }

    /**
     * DOM 요소 초기화
     * @returns {boolean} 초기화 성공 여부
     */
    initialize() {
        this.form = document.getElementById('login-form');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.loginBtn = document.querySelector('.login-btn');
        this.emailHelper = document.getElementById('email-helper');
        this.passwordHelper = document.getElementById('password-helper');

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
     * 버튼 상태 업데이트
     * @param {boolean} isValid - 유효 여부
     * @param {string} [activeColor='#7F6AEE'] - 활성 색상
     * @param {string} [inactiveColor='#ACA0EB'] - 비활성 색상
     */
    updateButtonState(isValid, activeColor = '#7F6AEE', inactiveColor = '#ACA0EB') {
        if (!this.loginBtn) return;

        this.loginBtn.disabled = !isValid;
        this.loginBtn.style.backgroundColor = isValid ? activeColor : inactiveColor;

        if (isValid) {
            this.loginBtn.classList.add('active');
        } else {
            this.loginBtn.classList.remove('active');
        }
    }

    /**
     * 버튼 로딩 상태 설정
     * @param {boolean} isLoading - 로딩 중 여부
     */
    setButtonLoading(isLoading) {
        if (!this.loginBtn) return;

        if (isLoading) {
            this.loginBtn.disabled = true;
            this.loginBtn.textContent = '로그인 중...';
        } else {
            this.loginBtn.disabled = false;
            this.loginBtn.textContent = '로그인';
            this.loginBtn.style.backgroundColor = '#7F6AEE';
        }
    }

    /**
     * 이벤트 리스너 바인딩
     * @param {object} handlers - 이벤트 핸들러 객체
     * @param {Function} handlers.onEmailInput - 이메일 입력 핸들러
     * @param {Function} handlers.onPasswordInput - 비밀번호 입력 핸들러
     * @param {Function} handlers.onSubmit - 폼 제출 핸들러
     */
    bindEvents(handlers) {
        if (this.emailInput) {
            this.emailInput.addEventListener('input', handlers.onEmailInput);
            this.emailInput.addEventListener('blur', handlers.onEmailInput);
        }

        if (this.passwordInput) {
            this.passwordInput.addEventListener('input', handlers.onPasswordInput);
            this.passwordInput.addEventListener('blur', handlers.onPasswordInput);
        }

        if (this.form) {
            this.form.addEventListener('submit', handlers.onSubmit);
        }
    }
}

export default LoginView;
