// js/controllers/DetailController.js
// 게시글 상세 페이지 컨트롤러

import AuthModel from '../models/AuthModel.js';
import PostModel from '../models/PostModel.js';
import PostDetailView from '../views/PostDetailView.js';
import ModalView from '../views/ModalView.js';
import CommentController from './CommentController.js';
import Logger from '../utils/Logger.js';
import { NAV_PATHS, UI_MESSAGES } from '../constants.js';

const logger = Logger.createLogger('DetailController');

/**
 * 게시글 상세 페이지 컨트롤러
 */
class DetailController {
    constructor() {
        this.currentPostId = null;
        this.currentUserId = null;
        this.deleteTargetId = null; // 오직 게시글 삭제 대상 ID만 저장
        this.isLiking = false;
        this.commentController = null;
    }

    /**
     * 컨트롤러 초기화
     */
    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('id');

        if (!postId) {
            PostDetailView.showToast(UI_MESSAGES.INVALID_ACCESS);
            setTimeout(() => {
                location.href = NAV_PATHS.MAIN;
            }, 1000);
            return;
        }

        this.currentPostId = postId;

        await this._checkLoginStatus();
        await this._loadPostDetail();
        this._setupEventListeners();
    }

    /**
     * 로그인 상태 확인
     * @private
     */
    async _checkLoginStatus() {
        try {
            const authStatus = await AuthModel.checkAuthStatus();
            if (authStatus.isAuthenticated) {
                this.currentUserId = authStatus.user.user_id || authStatus.user.id;
            } else {
                this.currentUserId = null;
            }
        } catch (error) {
            logger.warn('로그인 확인 실패', error);
            this.currentUserId = null;
        }
    }

    /**
     * 게시글 상세 로드
     * @private
     */
    async _loadPostDetail() {
        try {
            const result = await PostModel.getPost(this.currentPostId);

            if (!result.ok) {
                throw new Error(UI_MESSAGES.POST_DETAIL_FAIL);
            }

            const data = result.data?.data;
            const post = data?.post || result.data?.data;

            if (!post) {
                throw new Error(UI_MESSAGES.POST_NOT_FOUND);
            }

            // 댓글 별도 추출 (백엔드 응답 구조: data: { post: {...}, comments: [...] })
            const comments = data?.comments || post.comments || [];

            // 댓글 수 동기화 (post.comments_count가 0이어도 실제 댓글이 있으면 업데이트)
            if (comments.length > 0) {
                post.comments_count = comments.length;
            }

            // 게시글 렌더링
            PostDetailView.renderPost(post);

            // 작성자 액션 버튼 표시/숨기기
            const isOwner = this.currentUserId && post.author &&
                (this.currentUserId === post.author.user_id || this.currentUserId === post.author.id);
            PostDetailView.toggleActionButtons(isOwner);

            // 댓글 컨트롤러 초기화 및 렌더링 위임
            if (!this.commentController) {
                this.commentController = new CommentController(
                    this.currentPostId,
                    this.currentUserId,
                    {
                        onCommentChange: () => this._loadPostDetail() // 댓글 변경 시 전체 새로고침 (간단한 동기화)
                    }
                );
                // 입력창 이벤트는 DOM이 그려진 후 한 번만 설정
                this.commentController.setupInputEvents();
            }
            
            this.commentController.render(comments);

        } catch (error) {
            logger.error('게시글 로드 실패', error);
            PostDetailView.showToast(error.message);
            setTimeout(() => {
                location.href = NAV_PATHS.MAIN;
            }, 1500);
        }
    }

    /**
     * 이벤트 리스너 설정
     * @private
     */
    _setupEventListeners() {
        // 뒤로가기 버튼
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                location.href = NAV_PATHS.MAIN;
            });
        }

        // 수정 버튼
        const editBtn = document.getElementById('edit-post-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                location.href = NAV_PATHS.EDIT(this.currentPostId);
            });
        }

        // 삭제 버튼
        const deleteBtn = document.getElementById('delete-post-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this._openDeleteModal();
            });
        }

        // 좋아요
        const likeBox = document.getElementById('like-box');
        if (likeBox) {
            likeBox.addEventListener('click', () => this._handleLike());
        }

        // 댓글 관련 이벤트는 CommentController에서 처리함

        // 게시글 삭제 모달 설정
        // 주의: 댓글 삭제 모달은 CommentController에서 별도로 설정함
        // 여기서는 'confirm-modal' ID를 공유하더라도 콜백이 덮어씌워지는 구조임.
        // 따라서 모달을 열 때마다 콜백을 재설정하는 것이 안전함.
        // _openDeleteModal 에서 설정하도록 변경.
    }

    /**
     * 좋아요 처리
     * @private
     */
    async _handleLike() {
        if (this.isLiking) return;

        const likeBox = document.getElementById('like-box');
        const countEl = document.getElementById('like-count');
        const originalCount = parseInt(countEl.innerText) || 0;
        const wasLiked = likeBox.classList.contains('active');

        // 낙관적 UI 업데이트 (Optimistic UI Update)
        const newCount = wasLiked ? Math.max(0, originalCount - 1) : originalCount + 1;
        PostDetailView.updateLikeState(!wasLiked, newCount);
        
        this.isLiking = true;

        try {
            const result = wasLiked
                ? await PostModel.unlikePost(this.currentPostId)
                : await PostModel.likePost(this.currentPostId);

            if (!result.ok) {
                // API 실패 시 롤백
                PostDetailView.updateLikeState(wasLiked, originalCount);
                PostDetailView.showToast(UI_MESSAGES.LIKE_FAIL);
            }
        } catch (error) {
            // 네트워크 에러 시 롤백
            logger.error('좋아요 처리 실패', error);
            PostDetailView.updateLikeState(wasLiked, originalCount);
            PostDetailView.showToast(UI_MESSAGES.SERVER_ERROR);
        } finally {
            this.isLiking = false;
        }
    }

    /**
     * 게시글 삭제 모달 열기
     * @private
     */
    _openDeleteModal() {
        this.deleteTargetId = this.currentPostId;
        
        // 모달 콜백 설정 (게시글 삭제용)
        ModalView.setupDeleteModal({
            modalId: 'confirm-modal',
            cancelBtnId: 'modal-cancel-btn',
            confirmBtnId: 'modal-confirm-btn',
            onConfirm: () => this._executeDelete()
        });

        ModalView.openConfirmModal('confirm-modal', '게시글을 삭제하시겠습니까?');
    }

    /**
     * 게시글 삭제 실행
     * @private
     */
    async _executeDelete() {
        if (!this.deleteTargetId) return;

        try {
            const result = await PostModel.deletePost(this.deleteTargetId);
            if (result.ok) {
                PostDetailView.showToast(UI_MESSAGES.POST_DELETE_SUCCESS);
                setTimeout(() => {
                    location.href = NAV_PATHS.MAIN;
                }, 1000);
            } else {
                PostDetailView.showToast(UI_MESSAGES.DELETE_FAIL);
            }
        } catch (e) {
            logger.error('게시글 삭제 실패', e);
            PostDetailView.showToast(UI_MESSAGES.UNKNOWN_ERROR);
        }

        ModalView.closeModal('confirm-modal');
        this.deleteTargetId = null;
    }
}

export default DetailController;
