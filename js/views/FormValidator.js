// js/views/FormValidator.js
// 폼 유효성 검사 클래스

import { showError, hideError } from './helpers.js';

/**
 * 유효성 검사 정규식 패턴
 */
export const VALIDATION_PATTERNS = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,20}$/
};

/**
 * 폼 유효성 검사 클래스
 */
class FormValidator {
    /**
     * 이메일 유효성 검사
     * @param {string} value - 이메일 값
     * @param {HTMLElement} helperEl - 헬퍼 텍스트 요소
     * @returns {boolean} - 유효 여부
     */
    static validateEmail(value, helperEl) {
        const trimmed = value.trim();

        if (!trimmed) {
            showError(helperEl, '* 이메일을 입력해주세요.');
            return false;
        }

        if (!VALIDATION_PATTERNS.email.test(trimmed)) {
            showError(helperEl, '* 올바른 이메일 주소 형식을 입력해주세요. (예: example@adapterz.kr)');
            return false;
        }

        hideError(helperEl);
        return true;
    }

    /**
     * 비밀번호 유효성 검사
     * @param {string} value - 비밀번호 값
     * @param {HTMLElement} helperEl - 헬퍼 텍스트 요소
     * @returns {boolean} - 유효 여부
     */
    static validatePassword(value, helperEl) {
        if (!value) {
            showError(helperEl, '* 비밀번호를 입력해주세요');
            return false;
        }

        if (!VALIDATION_PATTERNS.password.test(value)) {
            showError(helperEl, '* 비밀번호는 8자 이상 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다');
            return false;
        }

        hideError(helperEl);
        return true;
    }

    /**
     * 비밀번호 확인 유효성 검사
     * @param {string} password - 비밀번호 값
     * @param {string} confirmPassword - 비밀번호 확인 값
     * @param {HTMLElement} helperEl - 헬퍼 텍스트 요소
     * @returns {boolean} - 유효 여부
     */
    static validatePasswordConfirm(password, confirmPassword, helperEl) {
        if (!confirmPassword) {
            showError(helperEl, '* 비밀번호를 한번 더 입력해주세요');
            return false;
        }

        if (password !== confirmPassword) {
            showError(helperEl, '* 비밀번호가 다릅니다');
            return false;
        }

        hideError(helperEl);
        return true;
    }

    /**
     * 닉네임 유효성 검사
     * @param {string} value - 닉네임 값
     * @param {HTMLElement} helperEl - 헬퍼 텍스트 요소
     * @returns {boolean} - 유효 여부
     */
    static validateNickname(value, helperEl) {
        const trimmed = value.trim();

        if (!trimmed) {
            showError(helperEl, '* 닉네임을 입력해주세요');
            return false;
        }

        if (value.includes(' ')) {
            showError(helperEl, '* 띄어쓰기를 없애주세요');
            return false;
        }

        if (value.length > 10) {
            showError(helperEl, '* 닉네임은 최대 10자까지 작성 가능합니다.');
            return false;
        }

        hideError(helperEl);
        return true;
    }

    /**
     * 프로필 이미지 유효성 검사
     * @param {File|null} file - 파일 객체
     * @param {HTMLElement} helperEl - 헬퍼 텍스트 요소
     * @returns {boolean} - 유효 여부
     */
    static validateProfileImage(file, helperEl) {
        if (!file) {
            showError(helperEl, '* 프로필 사진을 추가해주세요');
            return false;
        }

        hideError(helperEl);
        return true;
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
