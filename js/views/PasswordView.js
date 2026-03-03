// js/views/PasswordView.js
// 비밀번호 변경 페이지 View - DOM 조작 담당

import { showError, hideError, showToast, updateButtonState as updateBtnState } from './helpers.js';

/**
 * 비밀번호 변경 페이지 View 클래스
 * DOM 요소 참조 및 UI 업데이트 담당
 */
class PasswordView {
    constructor() {
        this.form = null;
        this.currentPasswordInput = null;
        this.newPasswordInput = null;
        this.confirmPasswordInput = null;
        this.submitBtn = null;
        this.currentPasswordHelper = null;
        this.newPasswordHelper = null;
        this.confirmPasswordHelper = null;
    }

    /**
     * DOM 요소 초기화
     * @returns {boolean} 초기화 성공 여부
     */
    initialize() {
        this.form = document.getElementById('password-form');
        this.currentPasswordInput = document.getElementById('current-password');
        this.newPasswordInput = document.getElementById('new-password');
        this.confirmPasswordInput = document.getElementById('confirm-password');
        this.submitBtn = document.getElementById('submit-btn');
        this.currentPasswordHelper = document.getElementById('current-password-helper');
        this.newPasswordHelper = document.getElementById('new-password-helper');
        this.confirmPasswordHelper = document.getElementById('confirm-password-helper');

        return !!this.form;
    }

    /**
     * 현재 비밀번호 값 조회
     * @returns {string}
     */
    getCurrentPassword() {
        return this.currentPasswordInput?.value || '';
    }

    /**
     * 새 비밀번호 값 조회
     * @returns {string}
     */
    getNewPassword() {
        return this.newPasswordInput?.value || '';
    }

    /**
     * 비밀번호 확인 값 조회
     * @returns {string}
     */
    getConfirmPassword() {
        return this.confirmPasswordInput?.value || '';
    }

    /**
     * 현재 비밀번호 에러 표시
     * @param {string} message - 에러 메시지
     */
    showCurrentPasswordError(message) {
        showError(this.currentPasswordHelper, message);
    }

    /**
     * 현재 비밀번호 에러 숨기기
     */
    hideCurrentPasswordError() {
        hideError(this.currentPasswordHelper);
    }

    /**
     * 새 비밀번호 에러 표시
     * @param {string} message - 에러 메시지
     */
    showNewPasswordError(message) {
        showError(this.newPasswordHelper, message);
    }

    /**
     * 새 비밀번호 에러 숨기기
     */
    hideNewPasswordError() {
        hideError(this.newPasswordHelper);
    }

    /**
     * 비밀번호 확인 에러 표시
     * @param {string} message - 에러 메시지
     */
    showConfirmPasswordError(message) {
        showError(this.confirmPasswordHelper, message);
    }

    /**
     * 비밀번호 확인 에러 숨기기
     */
    hideConfirmPasswordError() {
        hideError(this.confirmPasswordHelper);
    }

    /**
     * 버튼 상태 업데이트
     * @param {boolean} isValid - 유효 여부
     * @param {string} [activeColor='var(--color-primary-hover)'] - 활성 색상
     * @param {string} [inactiveColor='var(--color-primary)'] - 비활성 색상
     */
    updateButtonState(isValid, activeColor = 'var(--color-primary-hover)', inactiveColor = 'var(--color-primary)') {
        updateBtnState(this.submitBtn, isValid, activeColor, inactiveColor);
    }

    /**
     * 성공 토스트 표시
     */
    showSuccessToast() {
        showToast('비밀번호가 변경되었습니다.');
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
        if (this.currentPasswordInput && handlers.onCurrentPasswordInput) {
            this.currentPasswordInput.addEventListener('input', handlers.onCurrentPasswordInput);
        }

        if (this.newPasswordInput && handlers.onNewPasswordInput) {
            this.newPasswordInput.addEventListener('input', handlers.onNewPasswordInput);
        }

        if (this.confirmPasswordInput && handlers.onConfirmPasswordInput) {
            this.confirmPasswordInput.addEventListener('input', handlers.onConfirmPasswordInput);
        }

        if (this.form && handlers.onSubmit) {
            this.form.addEventListener('submit', handlers.onSubmit);
        }
    }
}

export default PasswordView;
