// js/controllers/PasswordController.js
// 비밀번호 변경 페이지 컨트롤러 - 비즈니스 로직 및 이벤트 처리 담당

import UserModel from '../models/UserModel.js';
import AuthModel from '../models/AuthModel.js';
import PasswordView from '../views/PasswordView.js';
import FormValidator from '../views/FormValidator.js';
import Logger from '../utils/Logger.js';

const logger = Logger.createLogger('PasswordController');

/**
 * 비밀번호 변경 페이지 컨트롤러
 * Model과 View를 연결하고 비즈니스 로직을 처리
 */
class PasswordController {
    constructor() {
        this.view = new PasswordView();
        this.state = {
            newPassword: { valid: false, touched: false },
            confirmPassword: { valid: false, touched: false }
        };
    }

    /**
     * 컨트롤러 초기화
     */
    init() {
        // View 초기화
        if (!this.view.initialize()) return;

        this._setupEventListeners();
    }

    /**
     * 이벤트 리스너 설정
     * @private
     */
    _setupEventListeners() {
        this.view.bindEvents({
            onNewPasswordInput: () => this._handleNewPasswordInput(),
            onConfirmPasswordInput: () => this._handleConfirmPasswordInput(),
            onSubmit: (e) => this._handleSubmit(e)
        });

        // 뒤로가기 버튼
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                history.back();
            });
        }
    }

    /**
     * 새 비밀번호 입력 처리
     * @private
     */
    _handleNewPasswordInput() {
        this.state.newPassword.touched = true;
        this._validateNewPassword();
        this._updateButtonState();
    }

    /**
     * 비밀번호 확인 입력 처리
     * @private
     */
    _handleConfirmPasswordInput() {
        this.state.confirmPassword.touched = true;
        this._validateConfirmPassword();
        this._updateButtonState();
    }

    /**
     * 새 비밀번호 유효성 검사
     * @private
     */
    _validateNewPassword() {
        const password = this.view.getNewPassword();
        this.state.newPassword.valid = FormValidator.validatePassword(
            password,
            this.view.newPasswordHelper
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
        const newPass = this.view.getNewPassword();
        const confirmPass = this.view.getConfirmPassword();

        if (!confirmPass) {
            this.view.showConfirmPasswordError('* 비밀번호를 한번 더 입력해주세요');
            this.state.confirmPassword.valid = false;
        } else if (newPass !== confirmPass) {
            this.view.showConfirmPasswordError('* 비밀번호가 다릅니다');
            this.view.showNewPasswordError('* 비밀번호가 다릅니다');
            this.state.confirmPassword.valid = false;
        } else {
            this.view.hideConfirmPasswordError();
            this.state.confirmPassword.valid = true;
        }
    }

    /**
     * 버튼 상태 업데이트
     * @private
     */
    _updateButtonState() {
        const isValid = this.state.newPassword.valid && this.state.confirmPassword.valid;
        this.view.updateButtonState(isValid);
    }

    /**
     * 폼 제출 처리
     * @private
     */
    async _handleSubmit(event) {
        event.preventDefault();

        const newPassword = this.view.getNewPassword();
        const confirmPassword = this.view.getConfirmPassword();

        if (newPassword !== confirmPassword) {
            this.view.showConfirmPasswordError('* 비밀번호가 다릅니다');
            return;
        }

        try {
            const result = await UserModel.changePassword(newPassword, confirmPassword);

            if (result.ok) {
                // 비밀번호 변경 성공 시 로그아웃 처리 및 리다이렉트
                try {
                    await AuthModel.logout();
                } catch (logoutError) {
                    logger.warn('로그아웃 처리 중 오류 발생 (무시함)', logoutError);
                }

                this.view.showSuccessToast();
                setTimeout(() => {
                    location.href = '/login';
                }, 1000);
            } else {
                this.view.showNewPasswordError(result.data?.message || '* 비밀번호 변경에 실패했습니다.');
                this.view.showToast('비밀번호 변경 실패');
            }
        } catch (error) {
            logger.error('비밀번호 변경 실패', error);
            this.view.showNewPasswordError('* 서버 통신 중 오류가 발생했습니다.');
            this.view.showToast('오류가 발생했습니다.');
        }
    }
}

export default PasswordController;
