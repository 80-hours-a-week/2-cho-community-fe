// js/views/FormValidator.js
// 폼 유효성 검사 View 헬퍼 (DOM 조작과 유효성 검사 결합)

import { showError, hideError } from './helpers.js';
import Validators from '../utils/validators.js';

/**
 * 폼 유효성 검사 View 헬퍼 클래스
 * 유효성 검사 결과를 DOM에 반영하는 역할
 */
class FormValidator {
    /**
     * 이메일 유효성 검사 및 에러 표시
     * @param {string} value - 이메일 값
     * @param {HTMLElement} helperEl - 헬퍼 텍스트 요소
     * @returns {boolean} - 유효 여부
     */
    static validateEmail(value, helperEl) {
        const result = Validators.validateEmail(value);

        if (result.valid) {
            hideError(helperEl);
        } else {
            showError(helperEl, result.message);
        }

        return result.valid;
    }

    /**
     * 비밀번호 유효성 검사 및 에러 표시
     * @param {string} value - 비밀번호 값
     * @param {HTMLElement} helperEl - 헬퍼 텍스트 요소
     * @returns {boolean} - 유효 여부
     */
    static validatePassword(value, helperEl) {
        const result = Validators.validatePassword(value);

        if (result.valid) {
            hideError(helperEl);
        } else {
            showError(helperEl, result.message);
        }

        return result.valid;
    }

    /**
     * 비밀번호 확인 유효성 검사 및 에러 표시
     * @param {string} password - 비밀번호 값
     * @param {string} confirmPassword - 비밀번호 확인 값
     * @param {HTMLElement} helperEl - 헬퍼 텍스트 요소
     * @returns {boolean} - 유효 여부
     */
    static validatePasswordConfirm(password, confirmPassword, helperEl) {
        const result = Validators.validatePasswordConfirm(password, confirmPassword);

        if (result.valid) {
            hideError(helperEl);
        } else {
            showError(helperEl, result.message);
        }

        return result.valid;
    }

    /**
     * 닉네임 유효성 검사 및 에러 표시
     * @param {string} value - 닉네임 값
     * @param {HTMLElement} helperEl - 헬퍼 텍스트 요소
     * @returns {boolean} - 유효 여부
     */
    static validateNickname(value, helperEl) {
        const result = Validators.validateNickname(value);

        if (result.valid) {
            hideError(helperEl);
        } else {
            showError(helperEl, result.message);
        }

        return result.valid;
    }

    /**
     * 프로필 이미지 유효성 검사 및 에러 표시
     * @param {File|null} file - 파일 객체
     * @param {HTMLElement} helperEl - 헬퍼 텍스트 요소
     * @returns {boolean} - 유효 여부
     */
    static validateProfileImage(file, helperEl) {
        const result = Validators.validateProfileImage(file);

        if (result.valid) {
            hideError(helperEl);
        } else {
            showError(helperEl, result.message);
        }

        return result.valid;
    }

    /**
     * 버튼 상태 업데이트
     * @param {boolean} isValid - 유효 여부
     * @param {HTMLButtonElement} button - 버튼 요소
     * @param {string} [activeColor='#7F6AEE'] - 활성 색상
     * @param {string} [inactiveColor='#ACA0EB'] - 비활성 색상
     */
    static updateButtonState(isValid, button, activeColor = '#7F6AEE', inactiveColor = '#ACA0EB') {
        button.disabled = !isValid;
        button.style.backgroundColor = isValid ? activeColor : inactiveColor;

        if (isValid) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    }
}

export default FormValidator;
