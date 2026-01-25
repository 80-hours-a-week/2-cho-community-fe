// js/controllers/ProfileController.js
// 프로필 수정 페이지 컨트롤러

import AuthModel from '../models/AuthModel.js';
import UserModel from '../models/UserModel.js';
import FormValidator from '../views/FormValidator.js';
import ModalView from '../views/ModalView.js';
import { showToast, showError } from '../views/helpers.js';

/**
 * 프로필 수정 페이지 컨트롤러
 */
class ProfileController {
    constructor() {
        this.originalNickname = '';
        this.currentProfileFile = null;
    }

    /**
     * 컨트롤러 초기화
     */
    async init() {
        await this._loadProfileData();
        this._setupEventListeners();
    }

    /**
     * 프로필 데이터 로드
     * @private
     */
    async _loadProfileData() {
        try {
            const result = await AuthModel.getCurrentUser();

            if (result.ok && result.data?.data?.user) {
                const user = result.data.data.user;

                const emailDisplay = document.getElementById('email-display');
                const nicknameInput = document.getElementById('nickname-input');
                const profileWrapper = document.getElementById('profile-img-wrapper');

                if (emailDisplay) emailDisplay.value = user.email;
                if (nicknameInput) {
                    nicknameInput.value = user.nickname;
                    this.originalNickname = user.nickname;
                }
                if (profileWrapper) {
                    if (user.profile_image) {
                        profileWrapper.style.backgroundImage = `url(${user.profile_image})`;
                    } else {
                        profileWrapper.style.backgroundColor = '#555';
                    }
                }

                this._validateNickname();

            } else {
                location.href = '/login';
            }
        } catch (error) {
            console.error('Profile Load Error:', error);
        }
    }

    /**
     * 이벤트 리스너 설정
     * @private
     */
    _setupEventListeners() {
        const nicknameInput = document.getElementById('nickname-input');
        const imgWrapper = document.getElementById('profile-img-wrapper');
        const fileInput = document.getElementById('profile-file-input');
        const profileForm = document.getElementById('profile-form');
        const withdrawBtn = document.getElementById('withdraw-btn');

        // 이미지 업로드
        if (imgWrapper && fileInput) {
            imgWrapper.addEventListener('click', () => fileInput.click());

            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.currentProfileFile = file;
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        imgWrapper.style.backgroundImage = `url(${e.target.result})`;
                    };
                    reader.readAsDataURL(file);
                }
                this._checkFormValidity();
            });
        }

        // 닉네임 입력
        if (nicknameInput) {
            nicknameInput.addEventListener('input', () => {
                this._validateNickname();
                this._checkFormValidity();
            });
        }

        // 폼 제출
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this._handleProfileUpdate();
            });
        }

        // 회원 탈퇴
        if (withdrawBtn) {
            withdrawBtn.addEventListener('click', () => {
                ModalView.openWithdrawModal('withdraw-modal');
            });
        }

        // 탈퇴 모달 이벤트
        const modalCancelBtn = document.getElementById('modal-cancel-btn');
        const modalConfirmBtn = document.getElementById('modal-confirm-btn');

        if (modalCancelBtn) {
            modalCancelBtn.addEventListener('click', () => {
                ModalView.closeModal('withdraw-modal');
            });
        }

        if (modalConfirmBtn) {
            modalConfirmBtn.addEventListener('click', () => this._handleWithdrawal());
        }
    }

    /**
     * 닉네임 유효성 검사
     * @private
     */
    _validateNickname() {
        const nicknameInput = document.getElementById('nickname-input');
        const helper = document.getElementById('validation-helper');
        const val = nicknameInput.value.trim();

        if (val.length === 0) {
            showError(helper, '*닉네임을 입력해주세요.');
            return false;
        } else if (val.length > 10) {
            showError(helper, '*닉네임은 최대 10자까지 작성 가능합니다.');
            return false;
        } else {
            if (helper) helper.style.display = 'none';
            return true;
        }
    }

    /**
     * 폼 유효성 확인
     * @private
     */
    _checkFormValidity() {
        const submitBtn = document.getElementById('submit-btn');
        const isValid = this._validateNickname();
        const nickname = document.getElementById('nickname-input').value.trim();

        if (isValid && nickname.length > 0) {
            submitBtn.disabled = false;
            submitBtn.classList.add('active');
        } else {
            submitBtn.disabled = true;
            submitBtn.classList.remove('active');
        }
    }

    /**
     * 프로필 업데이트 처리
     * @private
     */
    async _handleProfileUpdate() {
        const nickname = document.getElementById('nickname-input').value.trim();
        const helper = document.getElementById('validation-helper');

        let newImageUrl = null;

        // 이미지 업로드
        if (this.currentProfileFile) {
            try {
                const uploadResult = await UserModel.uploadProfileImage(this.currentProfileFile);
                if (uploadResult.ok) {
                    newImageUrl = uploadResult.data?.data;
                } else {
                    alert('이미지 업로드 실패');
                    return;
                }
            } catch (e) {
                console.error(e);
                return;
            }
        }

        const payload = {};
        if (nickname !== this.originalNickname) payload.nickname = nickname;
        if (newImageUrl) payload.profileImageUrl = newImageUrl;

        if (Object.keys(payload).length === 0) {
            alert('수정할 내용이 없습니다.');
            return;
        }

        try {
            const result = await UserModel.updateProfile(payload);

            if (result.ok) {
                showToast();
            } else {
                if (result.status === 409 || (result.data?.detail && result.data.detail.includes('exists'))) {
                    showError(helper, '*중복되는 닉네임입니다.');
                } else {
                    alert('수정 실패: ' + (result.data?.detail || '알 수 없는 오류'));
                }
            }
        } catch (e) {
            console.error(e);
            alert('오류 발생');
        }
    }

    /**
     * 회원 탈퇴 처리
     * @private
     */
    async _handleWithdrawal() {
        const password = document.getElementById('withdraw-password').value;

        if (!password) {
            ModalView.toggleWithdrawHelper('withdraw-helper', true);
            return;
        }
        ModalView.toggleWithdrawHelper('withdraw-helper', false);

        try {
            const result = await UserModel.withdraw(password);

            if (result.ok) {
                alert('회원탈퇴가 완료되었습니다.');
                location.href = '/login';
            } else {
                alert('탈퇴 실패. 비밀번호를 확인해주세요.');
            }
        } catch (e) {
            console.error(e);
            alert('오류 발생');
        }
    }
}

export default ProfileController;
