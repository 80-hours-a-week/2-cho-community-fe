// js/controllers/LoginController.js
// 로그인 페이지 컨트롤러

import AuthModel from '../models/AuthModel.js';
import FormValidator from '../views/FormValidator.js';
import { showError } from '../views/helpers.js';

/**
 * 로그인 컨트롤러
 */
class LoginController {
    constructor() {
        this.state = {
            email: { valid: false, touched: false },
            password: { valid: false, touched: false }
        };
    }

    /**
     * 컨트롤러 초기화
     */
    async init() {
        // 이미 로그인된 경우 메인 페이지로 리다이렉트
        try {
            const authStatus = await AuthModel.checkAuthStatus();
            if (authStatus.isAuthenticated) {
                window.location.href = '/main';
                return;
            }
        } catch (error) {
            // 인증 확인 실패 시 로그인 페이지 유지
            console.log('Auth check failed, staying on login page');
        }

        this.loginForm = document.getElementById('login-form');
        this.loginBtn = document.querySelector('.login-btn');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.emailHelper = document.getElementById('email-helper');
        this.passwordHelper = document.getElementById('password-helper');

        if (!this.loginForm) return;

        this._setupEventListeners();
        this._initButtonState();
    }

    /**
     * 이벤트 리스너 설정
     * @private
     */
    _setupEventListeners() {
        // 이메일 입력
        this.emailInput.addEventListener('input', () => {
            this.state.email.touched = true;
            this._validateEmail();
            this._updateButtonState();
        });

        this.emailInput.addEventListener('blur', () => {
            this.state.email.touched = true;
            this._validateEmail();
            this._updateButtonState();
        });

        // 비밀번호 입력
        this.passwordInput.addEventListener('input', () => {
            this.state.password.touched = true;
            this._validatePassword();
            this._updateButtonState();
        });

        this.passwordInput.addEventListener('blur', () => {
            this.state.password.touched = true;
            this._validatePassword();
            this._updateButtonState();
        });

        // 폼 제출
        this.loginForm.addEventListener('submit', (e) => this._handleSubmit(e));
    }

    /**
     * 버튼 초기 상태 설정
     * @private
     */
    _initButtonState() {
        this.loginBtn.disabled = true;
        this.loginBtn.style.backgroundColor = '#ACA0EB';
    }

    /**
     * 이메일 유효성 검사
     * @private
     */
    _validateEmail() {
        this.state.email.valid = FormValidator.validateEmail(
            this.emailInput.value,
            this.emailHelper
        );
    }

    /**
     * 비밀번호 유효성 검사
     * @private
     */
    _validatePassword() {
        this.state.password.valid = FormValidator.validatePassword(
            this.passwordInput.value,
            this.passwordHelper
        );
    }

    /**
     * 버튼 상태 업데이트
     * @private
     */
    _updateButtonState() {
        const isValid = this.state.email.valid && this.state.password.valid;
        FormValidator.updateButtonState(isValid, this.loginBtn);
    }

    /**
     * 폼 제출 처리
     * @private
     */
    async _handleSubmit(event) {
        event.preventDefault();

        this._validateEmail();
        this._validatePassword();

        if (!this.state.email.valid || !this.state.password.valid) {
            return;
        }

        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;

        this.loginBtn.disabled = true;
        this.loginBtn.textContent = '로그인 중...';

        try {
            const result = await AuthModel.login(email, password);

            if (result.ok) {
                window.location.href = '/main';
            } else {
                showError(this.passwordHelper, '* 아이디 또는 비밀번호를 확인해주세요');
                this.loginBtn.disabled = false;
                this.loginBtn.textContent = '로그인';
                this.loginBtn.style.backgroundColor = '#7F6AEE';
            }
        } catch (error) {
            console.error('로그인 에러:', error);
            showError(this.passwordHelper, '* 서버와 통신할 수 없습니다.');
            this.loginBtn.disabled = false;
            this.loginBtn.textContent = '로그인';
        }
    }
}

export default LoginController;
