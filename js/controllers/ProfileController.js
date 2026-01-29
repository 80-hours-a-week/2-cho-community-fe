// js/controllers/ProfileController.js
// 프로필 수정 페이지 컨트롤러 - 비즈니스 로직 및 이벤트 처리 담당

import AuthModel from '../models/AuthModel.js';
import UserModel from '../models/UserModel.js';
import ProfileView from '../views/ProfileView.js';
import ModalView from '../views/ModalView.js';
import Logger from '../utils/Logger.js';

const logger = Logger.createLogger('ProfileController');

/**
 * 프로필 수정 페이지 컨트롤러
 * Model과 View를 연결하고 비즈니스 로직을 처리
 */
class ProfileController {
    constructor() {
        this.view = new ProfileView();
        this.originalNickname = '';
        this.currentProfileFile = null;
    }

    /**
     * 컨트롤러 초기화
     */
    async init() {
        // View 초기화
        if (!this.view.initialize()) return;

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

                this.view.setEmail(user.email);
                this.view.setNickname(user.nickname);
                this.view.setProfileImage(user.profileImageUrl);

                this.originalNickname = user.nickname;
                this._validateNickname();
            } else {
                location.href = '/login';
            }
        } catch (error) {
            logger.error('프로필 데이터 로드 실패', error);
        }
    }

    /**
     * 이벤트 리스너 설정
     * @private
     */
    _setupEventListeners() {
        this.view.bindEvents({
            onFileChange: (e) => this._handleFileChange(e),
            onNicknameInput: () => this._handleNicknameInput(),
            onSubmit: (e) => this._handleSubmit(e),
            onWithdrawClick: () => this._handleWithdrawClick()
        });

        // 탈퇴 모달 이벤트
        this._setupWithdrawModal();

        // 뒤로가기 버튼
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                history.back();
            });
        }
    }

    /**
     * 파일 변경 처리
     * @private
     */
    _handleFileChange(event) {
        const file = event.target.files[0];
        if (file) {
            this.currentProfileFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                this.view.showProfilePreview(e.target.result);
            };
            reader.readAsDataURL(file);
        }
        this._checkFormValidity();
    }

    /**
     * 닉네임 입력 처리
     * @private
     */
    _handleNicknameInput() {
        this._validateNickname();
        this._checkFormValidity();
    }

    /**
     * 닉네임 유효성 검사
     * @private
     * @returns {boolean}
     */
    _validateNickname() {
        const nickname = this.view.getNickname();

        if (nickname.length === 0) {
            this.view.showNicknameError('*닉네임을 입력해주세요.');
            return false;
        } else if (nickname.length > 10) {
            this.view.showNicknameError('*닉네임은 최대 10자까지 작성 가능합니다.');
            return false;
        } else {
            this.view.hideNicknameError();
            return true;
        }
    }

    /**
     * 폼 유효성 확인
     * @private
     */
    _checkFormValidity() {
        const isValid = this._validateNickname();
        const nickname = this.view.getNickname();

        this.view.updateButtonState(isValid && nickname.length > 0);
    }

    /**
     * 폼 제출 처리
     * @private
     */
    async _handleSubmit(event) {
        event.preventDefault();

        const nickname = this.view.getNickname();
        let newImageUrl = null;

        // 이미지 업로드
        if (this.currentProfileFile) {
            try {
                const uploadResult = await UserModel.uploadProfileImage(this.currentProfileFile);
                if (uploadResult.ok) {
                    const data = uploadResult.data?.data;
                    // 객체인 경우 url 프로퍼티 사용, 아니면 값 자체 사용
                    newImageUrl = (data && typeof data === 'object' && data.url) ? data.url : data;
                } else {
                    this.view.showToast('이미지 업로드 실패');
                    return;
                }
            } catch (e) {
                logger.error('프로필 이미지 업로드 실패', e);
                return;
            }
        }

        const payload = {};
        if (nickname !== this.originalNickname) payload.nickname = nickname;
        if (newImageUrl) payload.profileImageUrl = newImageUrl;

        if (Object.keys(payload).length === 0) {
            this.view.showToast('수정할 내용이 없습니다.');
            return;
        }

        try {
            const result = await UserModel.updateProfile(payload);

            if (result.ok) {
                this.view.showSuccessToast();
                setTimeout(() => {
                    location.href = '/';
                }, 1000);
            } else {
                const detail = result.data?.detail;
                // 닉네임 중복 오류 확인
                if (result.status === 409 || (typeof detail === 'string' && detail.includes('exists'))) {
                    this.view.showNicknameError('*중복되는 닉네임입니다.');
                } else {
                    let msg = '알 수 없는 오류';
                    if (typeof detail === 'string') {
                        msg = detail;
                    } else if (typeof detail === 'object') {
                        msg = JSON.stringify(detail);
                    }
                    this.view.showToast('수정 실패: ' + msg);
                }
            }
        } catch (e) {
            logger.error('프로필 수정 실패', e);
            this.view.showToast('오류 발생');
        }
    }
    // ...
    async _handleWithdrawal() {
        // ...
        try {
            const result = await UserModel.withdraw(password);

            if (result.ok) {
                // To display toast before redirect, we need to ensure toast is visible.
                // However, withdrawal redirects to login.
                // Alert is blocking, Toast is non-blocking.
                // Using alert for withdrawal success might be better to force user acknowledgement before redirect?
                // Or show toast then delay redirect.
                this.view.showToast('회원탈퇴가 완료되었습니다.');
                setTimeout(() => {
                    location.href = '/login';
                }, 1000);
            } else {
                this.view.showToast('탈퇴 실패. 비밀번호를 확인해주세요.');
            }
        } catch (e) {
            logger.error('회원 탈퇴 실패', e);
            this.view.showToast('오류 발생');
        }
    }
}

export default ProfileController;
