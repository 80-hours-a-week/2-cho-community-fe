// js/controllers/SocialSignupController.js
import ApiService from '../services/ApiService.js';
import FormValidator from '../views/FormValidator.js';
import { showToast, showError, hideError, updateButtonState } from '../views/helpers.js';
import { resolveNavPath } from '../config.js';
import { NAV_PATHS } from '../constants.js';
import Logger from '../utils/Logger.js';

const logger = Logger.createLogger('SocialSignupController');

class SocialSignupController {
    constructor() {
        this.nicknameInput = null;
        this.nicknameHelper = null;
        this.submitBtn = null;
        this.form = null;
        this.isValid = false;
    }

    init() {
        this.form = document.getElementById('social-signup-form');
        this.nicknameInput = document.getElementById('nickname');
        this.nicknameHelper = document.getElementById('nickname-helper');
        this.submitBtn = document.querySelector('.social-signup-btn');

        if (!this.form) return;

        this.nicknameInput?.addEventListener('input', () => this._validateNickname());
        this.form.addEventListener('submit', (e) => this._handleSubmit(e));
    }

    _validateNickname() {
        const nickname = this.nicknameInput?.value.trim() || '';
        this.isValid = FormValidator.validateNickname(nickname, this.nicknameHelper);
        updateButtonState(this.submitBtn, this.isValid);
    }

    async _handleSubmit(e) {
        e.preventDefault();
        this._validateNickname();
        if (!this.isValid) return;

        const nickname = this.nicknameInput.value.trim();

        try {
            const result = await ApiService.post('/v1/auth/social/complete-signup', { nickname });

            if (result.ok) {
                showToast('닉네임이 설정되었습니다!');
                setTimeout(() => {
                    location.href = resolveNavPath(NAV_PATHS.MAIN);
                }, 1000);
            } else {
                const detail = result.data?.detail;
                if (detail?.error === 'nickname_already_exists') {
                    showError(this.nicknameHelper, '* 이미 사용 중인 닉네임입니다');
                } else {
                    showToast(detail?.message || '닉네임 설정에 실패했습니다.');
                }
            }
        } catch (error) {
            logger.error('닉네임 설정 실패', error);
            showToast('서버 오류가 발생했습니다.');
        }
    }
}

export default SocialSignupController;
