// js/controllers/SignupController.js
// 회원가입 페이지 컨트롤러

import UserModel from '../models/UserModel.js';
import FormValidator from '../views/FormValidator.js';
import { showError } from '../views/helpers.js';

/**
 * 회원가입 컨트롤러
 */
class SignupController {
    constructor() {
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
        this.signupForm = document.getElementById('signup-form');
        this.signupBtn = document.querySelector('.login-btn');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.passwordConfirmInput = document.getElementById('password-confirm');
        this.nicknameInput = document.getElementById('nickname');
        this.profileInput = document.getElementById('profile-upload');
        this.previewImg = document.getElementById('preview-img');
        this.placeholder = document.getElementById('preview-placeholder');

        // 헬퍼 요소
        this.profileHelper = document.getElementById('profile-helper');
        this.emailHelper = document.getElementById('email-helper');
        this.passwordHelper = document.getElementById('password-helper');
        this.passwordConfirmHelper = document.getElementById('password-confirm-helper');
        this.nicknameHelper = document.getElementById('nickname-helper');

        if (!this.signupForm) return;

        this._setupEventListeners();
        this._initButtonState();
        this._setupBackButton();
    }

    /**
     * 이벤트 리스너 설정
     * @private
     */
    _setupEventListeners() {
        // 프로필 이미지
        this.profileInput.addEventListener('change', (e) => this._handleProfileChange(e));

        // 이메일
        this.emailInput.addEventListener('input', () => {
            this.state.email.touched = true;
            this._validateEmail();
            this._updateButtonState();
        });

        // 비밀번호
        this.passwordInput.addEventListener('input', () => {
            this.state.password.touched = true;
            this._validatePassword();
            this._updateButtonState();
        });

        // 비밀번호 확인
        this.passwordConfirmInput.addEventListener('input', () => {
            this.state.passwordConfirm.touched = true;
            this._validatePasswordConfirm();
            this._updateButtonState();
        });

        // 닉네임
        this.nicknameInput.addEventListener('input', () => {
            this.state.nickname.touched = true;
            this._validateNickname();
            this._updateButtonState();
        });

        // 폼 제출
        this.signupForm.addEventListener('submit', (e) => this._handleSubmit(e));
    }

    /**
     * 버튼 초기 상태 설정
     * @private
     */
    _initButtonState() {
        this.signupBtn.disabled = true;
        this.signupBtn.style.backgroundColor = '#ACA0EB';
    }

    /**
     * 뒤로 가기 버튼 설정
     * @private
     */
    _setupBackButton() {
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
                this.previewImg.src = e.target.result;
                this.previewImg.classList.remove('hidden');
                this.placeholder.classList.add('hidden');
            };
            reader.readAsDataURL(file);
        } else {
            this.previewImg.src = '';
            this.previewImg.classList.add('hidden');
            this.placeholder.classList.remove('hidden');
        }

        this._validateProfile();
        this._updateButtonState();
    }

    /**
     * 프로필 유효성 검사
     * @private
     */
    _validateProfile() {
        this.state.profile.valid = FormValidator.validateProfileImage(
            this.profileInput.files[0],
            this.profileHelper
        );
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
        this.state.passwordConfirm.valid = FormValidator.validatePasswordConfirm(
            this.passwordInput.value,
            this.passwordConfirmInput.value,
            this.passwordConfirmHelper
        );
    }

    /**
     * 닉네임 유효성 검사
     * @private
     */
    _validateNickname() {
        this.state.nickname.valid = FormValidator.validateNickname(
            this.nicknameInput.value,
            this.nicknameHelper
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

        FormValidator.updateButtonState(isValid, this.signupBtn);
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
        const formData = new FormData();
        formData.append('email', this.emailInput.value.trim());
        formData.append('password', this.passwordInput.value);
        formData.append('nickname', this.nicknameInput.value.trim());

        if (this.profileInput.files[0]) {
            formData.append('profile_image', this.profileInput.files[0]);
        }

        try {
            const result = await UserModel.signup(formData);

            if (result.ok) {
                alert('회원가입이 완료되었습니다!');
                window.location.href = '/login';
            } else {
                const errorData = result.data;

                if (errorData?.detail) {
                    if (errorData.detail.includes('email') || errorData.detail.includes('이메일')) {
                        showError(this.emailHelper, '* 중복된 이메일입니다');
                    } else if (errorData.detail.includes('nickname') || errorData.detail.includes('닉네임')) {
                        showError(this.nicknameHelper, '* 중복된 닉네임입니다');
                    } else {
                        alert(`회원가입 실패: ${errorData.detail}`);
                    }
                } else {
                    alert(`회원가입 실패: ${errorData?.message || '알 수 없는 오류'}`);
                }
            }
        } catch (error) {
            console.error('회원가입 에러:', error);
            alert('서버 통신 중 오류가 발생했습니다.');
        }
    }
}

export default SignupController;
