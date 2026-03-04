// js/controllers/UserProfileController.js
// 타 사용자 프로필 페이지 컨트롤러

import UserModel from '../models/UserModel.js';
import PostModel from '../models/PostModel.js';
import UserProfileView from '../views/UserProfileView.js';
import PostListView from '../views/PostListView.js';
import { showToast } from '../views/helpers.js';
import { resolveNavPath } from '../config.js';
import ModalView from '../views/ModalView.js';
import { NAV_PATHS, UI_MESSAGES } from '../constants.js';
import Logger from '../utils/Logger.js';

const logger = Logger.createLogger('UserProfileController');

/**
 * 타 사용자 프로필 페이지 컨트롤러
 * 프로필 정보와 작성한 게시글 목록을 무한 스크롤로 표시한다.
 */
class UserProfileController {
    constructor() {
        this.userId = null;
        this.currentOffset = 0;
        this.LIMIT = 10;
        this.isLoading = false;
        this.hasMore = true;
        this._scrollHandler = null;
        this.profileData = null;
    }

    /**
     * 컨트롤러 초기화
     * @param {object|null} currentUser - 현재 로그인한 사용자 정보
     */
    async init(currentUser) {
        const params = new URLSearchParams(location.search);
        this.userId = parseInt(params.get('id'));

        if (!this.userId || isNaN(this.userId)) {
            showToast('잘못된 접근입니다.');
            return;
        }

        // 자기 프로필이면 edit-profile로 리다이렉트
        if (currentUser && (currentUser.user_id === this.userId || currentUser.id === this.userId)) {
            location.href = resolveNavPath(NAV_PATHS.EDIT_PROFILE);
            return;
        }

        this.currentUser = currentUser;
        this.listEl = document.getElementById('user-posts-list');
        this.emptyEl = document.getElementById('user-posts-empty');

        await this._loadProfile();
        this._setupBlockButton();
        this._setupSuspendButton();
        this._setupInfiniteScroll();
        await this._loadPosts();
    }

    /**
     * 사용자 프로필 정보 로드
     * @private
     */
    async _loadProfile() {
        try {
            const result = await UserModel.getUserById(this.userId);

            if (!result.ok) {
                showToast('프로필을 불러오지 못했습니다.');
                return;
            }

            const user = result.data?.data;
            if (user) {
                this.profileData = user;
                UserProfileView.renderProfile(user);
            }
        } catch (error) {
            logger.error('프로필 로드 실패', error);
            showToast('프로필을 불러오지 못했습니다.');
        }
    }

    /**
     * 차단 버튼 설정
     * @private
     */
    _setupBlockButton() {
        const blockBtn = document.getElementById('block-user-btn');
        if (!blockBtn || !this.currentUser) return;

        // 자기 자신 차단 방지
        const myId = this.currentUser.user_id || this.currentUser.id;
        if (myId === this.userId) return;

        blockBtn.classList.remove('hidden');
        blockBtn.addEventListener('click', () => this._handleBlock());
    }

    /**
     * 사용자 차단/해제 토글
     * @private
     */
    async _handleBlock() {
        const blockBtn = document.getElementById('block-user-btn');
        if (!blockBtn) return;

        const isBlocked = blockBtn.textContent === '차단 해제';

        try {
            const result = isBlocked
                ? await UserModel.unblockUser(this.userId)
                : await UserModel.blockUser(this.userId);

            if (result.ok) {
                blockBtn.textContent = isBlocked ? '차단' : '차단 해제';
                showToast(isBlocked ? UI_MESSAGES.UNBLOCK_SUCCESS : UI_MESSAGES.BLOCK_SUCCESS);
            } else if (result.status === 400) {
                showToast(UI_MESSAGES.BLOCK_SELF);
            } else {
                showToast(UI_MESSAGES.BLOCK_FAIL);
            }
        } catch (error) {
            logger.error('차단 처리 실패', error);
            showToast(UI_MESSAGES.BLOCK_FAIL);
        }
    }

    /**
     * 정지 버튼 설정 (관리자만 표시)
     * @private
     */
    _setupSuspendButton() {
        const suspendBtn = document.getElementById('suspend-user-btn');
        if (!suspendBtn || !this.currentUser) return;

        // 관리자만 정지 버튼 표시
        if (this.currentUser.role !== 'admin') return;

        const isSuspended = !!this.profileData?.suspended_until;
        suspendBtn.textContent = isSuspended ? '정지 해제' : '정지';
        suspendBtn.classList.remove('hidden');
        suspendBtn.addEventListener('click', () => this._handleSuspend());
    }

    /**
     * 정지/해제 토글 처리
     * @private
     */
    async _handleSuspend() {
        const suspendBtn = document.getElementById('suspend-user-btn');
        if (!suspendBtn) return;

        const isSuspended = !!this.profileData?.suspended_until;

        if (isSuspended) {
            await this._executeUnsuspend();
        } else {
            this._openSuspendModal();
        }
    }

    /**
     * 정지 모달 열기
     * @private
     */
    _openSuspendModal() {
        // 입력값 초기화
        const daysInput = document.getElementById('suspend-days');
        const reasonInput = document.getElementById('suspend-reason');
        if (daysInput) daysInput.value = '7';
        if (reasonInput) reasonInput.value = '';

        // ModalView로 리스너 관리 (이전 리스너 자동 제거)
        ModalView.setupDeleteModal({
            modalId: 'suspend-modal',
            cancelBtnId: 'suspend-cancel-btn',
            confirmBtnId: 'suspend-confirm-btn',
            onConfirm: async () => {
                await this._executeSuspend();
                ModalView.closeModal('suspend-modal');
            },
        });

        // suspend-modal은 자체 title ID 사용 (ModalView.openConfirmModal이 #modal-title을 하드코딩하므로 직접 열기)
        const modal = document.getElementById('suspend-modal');
        if (modal) {
            document.body.style.overflow = 'hidden';
            modal.classList.remove('hidden');
        }
    }

    /**
     * 정지 실행
     * @private
     */
    async _executeSuspend() {
        const daysInput = document.getElementById('suspend-days');
        const reasonInput = document.getElementById('suspend-reason');
        const days = parseInt(daysInput?.value) || 7;
        const reason = reasonInput?.value?.trim() || '';

        try {
            const result = await UserModel.suspendUser(this.userId, days, reason);
            if (result.ok) {
                showToast(UI_MESSAGES.SUSPEND_SUCCESS);
                await this._loadProfile();
                this._updateSuspendButton();
            } else {
                showToast(UI_MESSAGES.SUSPEND_FAIL);
            }
        } catch (error) {
            logger.error('정지 처리 실패', error);
            showToast(UI_MESSAGES.SUSPEND_FAIL);
        }
    }

    /**
     * 정지 해제 실행
     * @private
     */
    async _executeUnsuspend() {
        try {
            const result = await UserModel.unsuspendUser(this.userId);
            if (result.ok) {
                showToast(UI_MESSAGES.UNSUSPEND_SUCCESS);
                await this._loadProfile();
                this._updateSuspendButton();
            } else {
                showToast(UI_MESSAGES.SUSPEND_FAIL);
            }
        } catch (error) {
            logger.error('정지 해제 실패', error);
            showToast(UI_MESSAGES.SUSPEND_FAIL);
        }
    }

    /**
     * 정지 버튼 상태 업데이트
     * @private
     */
    _updateSuspendButton() {
        const suspendBtn = document.getElementById('suspend-user-btn');
        if (!suspendBtn) return;
        const isSuspended = !!this.profileData?.suspended_until;
        suspendBtn.textContent = isSuspended ? '정지 해제' : '정지';
    }

    /**
     * 무한 스크롤 설정
     * @private
     */
    _setupInfiniteScroll() {
        this._scrollHandler = () => {
            if (this.isLoading || !this.hasMore) return;
            const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
            if (scrollTop + clientHeight >= scrollHeight - 100) {
                this._loadPosts();
            }
        };
        window.addEventListener('scroll', this._scrollHandler);
    }

    /**
     * 사용자 게시글 목록 로드
     * @private
     */
    async _loadPosts() {
        if (this.isLoading || !this.hasMore) return;
        this.isLoading = true;

        try {
            const result = await PostModel.getPosts(
                this.currentOffset, this.LIMIT, null, 'latest', this.userId
            );

            if (!result.ok) {
                showToast('게시글 목록을 불러오지 못했습니다.');
                this.isLoading = false;
                return;
            }

            const responseData = result.data?.data;
            const posts = responseData?.posts || [];
            const pagination = responseData?.pagination;

            // 첫 페이지인데 항목이 없으면 빈 상태 표시
            if (posts.length === 0 && this.currentOffset === 0) {
                UserProfileView.showEmptyPosts(this.emptyEl);
            }

            // 게시글 클릭 핸들러
            const onPostClick = (postId) => {
                location.href = resolveNavPath(NAV_PATHS.DETAIL(postId));
            };

            // 게시글 렌더링
            if (posts.length > 0) {
                UserProfileView.hideEmptyPosts(this.emptyEl);
                PostListView.renderPosts(this.listEl, posts, onPostClick);
            }

            // 페이지네이션 상태 업데이트
            this.hasMore = pagination?.has_more || false;
            this.currentOffset += posts.length;
        } catch (error) {
            logger.error('게시글 목록 로드 실패', error);
            showToast('게시글 목록을 불러오지 못했습니다.');
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * 컨트롤러 정리 (메모리 누수 방지)
     */
    destroy() {
        if (this._scrollHandler) {
            window.removeEventListener('scroll', this._scrollHandler);
            this._scrollHandler = null;
        }
    }
}

export default UserProfileController;
