// js/controllers/PasswordController.js
// 비밀번호 변경 페이지 컨트롤러

import UserModel from '../models/UserModel.js';
import FormValidator from '../views/FormValidator.js';
import { showToast, showError, hideError } from '../views/helpers.js';

/**
 * 비밀번호 변경 페이지 컨트롤러
 */
class PasswordController {
    constructor() {
        this.state = {
            newPassword: { valid: false, touched: false },
            confirmPassword: { valid: false, touched: false }
        };
    }

    /**
     * 컨트롤러 초기화
     */
    init() {
        this.passwordForm = document.getElementById('password-form');
        this.newPasswordInput = document.getElementById('new-password');
        this.confirmPasswordInput = document.getElementById('confirm-password');
        this.submitBtn = document.getElementById('submit-btn');
        this.newPasswordHelper = document.getElementById('new-password-helper');
        this.confirmPasswordHelper = document.getElementById('confirm-password-helper');

        if (!this.passwordForm) return;

        this._setupEventListeners();
    }

    /**
     * 이벤트 리스너 설정
     * @private
     */
    _setupEventListeners() {
        // 새 비밀번호 입력
        this.newPasswordInput.addEventListener('input', () => {
            this.state.newPassword.touched = true;
            this._validateNewPassword();
            this._updateButtonState();
        });

        // 비밀번호 확인 입력
        this.confirmPasswordInput.addEventListener('input', () => {
            this.state.confirmPassword.touched = true;
            this._validateConfirmPassword();
            this._updateButtonState();
        });

        // 폼 제출
        this.passwordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this._handleSubmit();
        });
    }

    /**
     * 새 비밀번호 유효성 검사
     * @private
     */
    _validateNewPassword() {
        this.state.newPassword.valid = FormValidator.validatePassword(
            this.newPasswordInput.value,
            this.newPasswordHelper
        );

        // 확인 비밀번호도 다시 검사
        if (this.state.confirmPassword.touched) {
            this._validateConfirmPassword();
        }
    }

    /**
     * 비밀번호 확인 유효성 검사
     * @private
     */
    _validateConfirmPassword() {
        const newPass = this.newPasswordInput.value;
        const confirmPass = this.confirmPasswordInput.value;

        if (!confirmPass) {
            showError(this.confirmPasswordHelper, '* 비밀번호를 한번 더 입력해주세요');
            this.state.confirmPassword.valid = false;
        } else if (newPass !== confirmPass) {
            showError(this.confirmPasswordHelper, '* 비밀번호가 다릅니다');
            showError(this.newPasswordHelper, '* 비밀번호가 다릅니다');
            this.state.confirmPassword.valid = false;
        } else {
            hideError(this.confirmPasswordHelper);
            this.state.confirmPassword.valid = true;
        }
    }

    /**
     * 버튼 상태 업데이트
     * @private
     */
    _updateButtonState() {
        const isValid = this.state.newPassword.valid && this.state.confirmPassword.valid;
        FormValidator.updateButtonState(isValid, this.submitBtn);
    }

    /**
     * 폼 제출 처리
     * @private
     */
    async _handleSubmit() {
        if (this.submitBtn.disabled) return;

        const newPassword = this.newPasswordInput.value;
        const confirmPassword = this.confirmPasswordInput.value;

        if (newPassword !== confirmPassword) {
            showError(this.confirmPasswordHelper, '* 비밀번호가 다릅니다');
            return;
        }

        try {
            const result = await UserModel.changePassword(newPassword, confirmPassword);

            if (result.ok) {
                showToast();
            } else {
                showError(this.newPasswordHelper, result.data?.message || '* 비밀번호 변경에 실패했습니다.');
            }
        } catch (error) {
            console.error('Error:', error);
            showError(this.newPasswordHelper, '* 서버 통신 중 오류가 발생했습니다.');
        }
    }
}

export default PasswordController;
