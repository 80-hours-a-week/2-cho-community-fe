// js/controllers/SignupController.js
// 회원가입 페이지 컨트롤러 - 비즈니스 로직 및 이벤트 처리 담당

import UserModel from '../models/UserModel.js';
import SignupView from '../views/SignupView.js';
import FormValidator from '../views/FormValidator.js';
import Logger from '../utils/Logger.js';

const logger = Logger.createLogger('SignupController');

/**
 * 회원가입 컨트롤러
 * Model과 View를 연결하고 비즈니스 로직을 처리
 */
class SignupController {
    constructor() {
        this.view = new SignupView();
        this.state = {
            profile: { valid: false, touched: false },
            email: { valid: false, touched: false },
            password: { valid: false, touched: false },
            passwordConfirm: { valid: false, touched: false },
            nickname: { valid: false, touched: false }
        };
    }

    /**
     * 컨트롤러 초기화
     */
    init() {
        // View 초기화
        if (!this.view.initialize()) return;

        this._setupEventListeners();
        this.view.updateButtonState(false);
        this.view.setupBackButton();
    }

    /**
     * 이벤트 리스너 설정
     * @private
     */
    _setupEventListeners() {
        this.view.bindEvents({
            onProfileChange: (e) => this._handleProfileChange(e),
            onEmailInput: () => this._handleEmailInput(),
            onPasswordInput: () => this._handlePasswordInput(),
            onPasswordConfirmInput: () => this._handlePasswordConfirmInput(),
            onNicknameInput: () => this._handleNicknameInput(),
            onSubmit: (e) => this._handleSubmit(e)
        });
    }

    /**
     * 프로필 이미지 변경 처리
     * @private
     */
    _handleProfileChange(event) {
        this.state.profile.touched = true;
        const file = event.target.files[0];

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.view.showProfilePreview(e.target.result);
            };
            reader.readAsDataURL(file);
        } else {
            this.view.hideProfilePreview();
        }

        this._validateProfile();
        this._updateButtonState();
    }

    /**
     * 공통 입력 처리 핸들러
     * @param {string} field - 상태 필드명 (email, password, etc)
     * @param {Function} validator - 유효성 검사 메서드
     * @private
     * 
     * 반복되는 입력 처리 로직(상태 업데이트 -> 유효성 검사 -> 버튼 상태 업데이트)을 일반화하여
     * 코드 중복을 줄이고 유지보수성을 높임. `call(this)`를 사용하여 validator 내부의 `this` 컨텍스트를 유지함.
     */
    _handleInput(field, validator) {
        this.state[field].touched = true;
        validator.call(this);
        this._updateButtonState();
    }

    /* 이벤트 핸들러 - 공통 메서드 사용 */
    _handleEmailInput() { this._handleInput('email', this._validateEmail); }
    _handlePasswordInput() { this._handleInput('password', this._validatePassword); }
    _handlePasswordConfirmInput() { this._handleInput('passwordConfirm', this._validatePasswordConfirm); }
    _handleNicknameInput() { this._handleInput('nickname', this._validateNickname); }

    /**
     * 프로필 유효성 검사
     * @private
     */
    _validateProfile() {
        const file = this.view.getProfileFile();
        this.state.profile.valid = FormValidator.validateProfileImage(
            file,
            this.view.profileHelper
        );
    }

    /**
     * 이메일 유효성 검사
     * @private
     */
    _validateEmail() {
        const email = this.view.getEmail();
        this.state.email.valid = FormValidator.validateEmail(
            email,
            this.view.emailHelper
        );
    }

    /**
     * 비밀번호 유효성 검사
     * @private
     */
    _validatePassword() {
        const password = this.view.getPassword();
        this.state.password.valid = FormValidator.validatePassword(
            password,
            this.view.passwordHelper
        );

        // 비밀번호 확인도 다시 검사
        if (this.state.passwordConfirm.touched) {
            this._validatePasswordConfirm();
        }
    }

    /**
     * 비밀번호 확인 유효성 검사
     * @private
     */
    _validatePasswordConfirm() {
        const password = this.view.getPassword();
        const confirmPassword = this.view.getPasswordConfirm();
        this.state.passwordConfirm.valid = FormValidator.validatePasswordConfirm(
            password,
            confirmPassword,
            this.view.passwordConfirmHelper
        );
    }

    /**
     * 닉네임 유효성 검사
     * @private
     */
    _validateNickname() {
        const nickname = this.view.getNickname();
        this.state.nickname.valid = FormValidator.validateNickname(
            nickname,
            this.view.nicknameHelper
        );
    }

    /**
     * 버튼 상태 업데이트
     * @private
     */
    _updateButtonState() {
        const isValid =
            this.state.profile.valid &&
            this.state.email.valid &&
            this.state.password.valid &&
            this.state.passwordConfirm.valid &&
            this.state.nickname.valid;

        this.state.nickname.valid;

        this.view.updateButtonState(isValid);
    }

    /**
     * 폼 제출 처리
     * @private
     */
    async _handleSubmit(event) {
        event.preventDefault();

        // 모든 필드 검증
        this.state.profile.touched = true;
        this.state.email.touched = true;
        this.state.password.touched = true;
        this.state.passwordConfirm.touched = true;
        this.state.nickname.touched = true;

        this._validateProfile();
        this._validateEmail();
        this._validatePassword();
        this._validatePasswordConfirm();
        this._validateNickname();
        this._updateButtonState();

        const allValid =
            this.state.profile.valid &&
            this.state.email.valid &&
            this.state.password.valid &&
            this.state.passwordConfirm.valid &&
            this.state.nickname.valid;

        if (!allValid) {
            return;
        }

        // FormData 준비
        const formData = this.view.createFormData();

        try {
            const result = await UserModel.signup(formData);

            if (result.ok) {
                this.view.showToast('회원가입이 완료되었습니다!');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1500); // 토스트 보일 시간 확보
            } else {
                const errorData = result.data;

                if (errorData?.detail) {
                    if (errorData.detail.includes('email') || errorData.detail.includes('이메일')) {
                        this.view.showEmailError('* 중복된 이메일입니다');
                    } else if (errorData.detail.includes('nickname') || errorData.detail.includes('닉네임')) {
                        this.view.showNicknameError('* 중복된 닉네임입니다');
                    } else {
                        this.view.showToast(`회원가입 실패: ${errorData.detail}`);
                    }
                } else {
                    this.view.showToast(`회원가입 실패: ${errorData?.message || '알 수 없는 오류'}`);
                }
            }
        } catch (error) {
            logger.error('회원가입 실패', error);
            this.view.showToast('서버 통신 중 오류가 발생했습니다.');
        }
    }
}

export default SignupController;
