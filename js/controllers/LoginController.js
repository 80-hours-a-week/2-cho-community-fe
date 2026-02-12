// js/controllers/LoginController.js
// 로그인 페이지 컨트롤러 - 비즈니스 로직 및 이벤트 처리 담당

import AuthModel from '../models/AuthModel.js';
import LoginView from '../views/LoginView.js';
import FormValidator from '../views/FormValidator.js';
import Logger from '../utils/Logger.js';
import { resolveNavPath } from '../config.js';

const logger = Logger.createLogger('LoginController');

/**
 * 로그인 컨트롤러
 * Model과 View를 연결하고 비즈니스 로직을 처리
 */
class LoginController {
    constructor() {
        this.view = new LoginView();
        this.state = {
            email: { valid: false, touched: false },
            password: { valid: false, touched: false }
        };
    }

    /**
     * 컨트롤러 초기화
     */
    async init() {
        logger.info('컨트롤러 초기화');
        // 이미 로그인된 경우 메인 페이지로 리다이렉트
        try {
            const authStatus = await AuthModel.checkAuthStatus();
            if (authStatus.isAuthenticated) {
                logger.info('이미 로그인됨, 메인 페이지로 리다이렉트');
                window.location.href = resolveNavPath('/main');
                return;
            }
        } catch (error) {
            // 인증 확인 실패 시 로그인 페이지 유지
            logger.debug('인증 확인 실패, 로그인 페이지 유지');
        }

        // View 초기화
        if (!this.view.initialize()) return;

        this._setupEventListeners();
        this.view.updateButtonState(false);

        // 세션 만료 메시지 확인
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('session') === 'expired') {
            this.view.showToast('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
        }
    }

    /**
     * 이벤트 리스너 설정
     * @private
     */
    _setupEventListeners() {
        this.view.bindEvents({
            onEmailInput: () => this._handleEmailInput(),
            onPasswordInput: () => this._handlePasswordInput(),
            onSubmit: (e) => this._handleSubmit(e)
        });
    }

    /**
     * 공통 입력 처리 핸들러
     * @param {string} field - 상태 필드명
     * @param {Function} validator - 유효성 검사 메서드
     * @private
     */
    _handleInput(field, validator) {
        this.state[field].touched = true;
        validator.call(this);
        this._updateButtonState();
    }

    /* 이벤트 핸들러 */
    _handleEmailInput() { this._handleInput('email', this._validateEmail); }
    _handlePasswordInput() { this._handleInput('password', this._validatePassword); }

    /**
     * 이메일 유효성 검사
     * @private
     */
    _validateEmail() {
        const email = this.view.getEmail();
        const helperEl = this.view.emailHelper;
        this.state.email.valid = FormValidator.validateEmail(email, helperEl);
    }

    /**
     * 비밀번호 유효성 검사
     * @private
     */
    _validatePassword() {
        const password = this.view.getPassword();
        const helperEl = this.view.passwordHelper;
        this.state.password.valid = FormValidator.validatePassword(password, helperEl);
    }

    /**
     * 버튼 상태 업데이트
     * @private
     */
    _updateButtonState() {
        const isValid = this.state.email.valid && this.state.password.valid;
        this.view.updateButtonState(isValid);
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

        const email = this.view.getEmail();
        const password = this.view.getPassword();

        this.view.setButtonLoading(true);

        try {
            const result = await AuthModel.login(email, password);

            if (result.ok) {
                window.location.href = resolveNavPath('/main');
            } else {
                this.view.showPasswordError('* 아이디 또는 비밀번호를 확인해주세요');
                this.view.setButtonLoading(false);
            }
        } catch (error) {
            logger.error('로그인 에러', error);
            this.view.showPasswordError('* 서버와 통신할 수 없습니다.');
            this.view.setButtonLoading(false);
        }
    }
}

export default LoginController;
