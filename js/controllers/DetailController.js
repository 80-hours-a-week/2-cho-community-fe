// js/controllers/DetailController.js
// 게시글 상세 페이지 컨트롤러

import PostModel from '../models/PostModel.js';
import ReportModel from '../models/ReportModel.js';
import PostDetailView from '../views/PostDetailView.js';
import ModalView from '../views/ModalView.js';
import CommentController from './CommentController.js';
import Logger from '../utils/Logger.js';
import { NAV_PATHS, UI_MESSAGES } from '../constants.js';
import { showToastAndRedirect, showToast } from '../views/helpers.js';
import { resolveNavPath } from '../config.js';

const logger = Logger.createLogger('DetailController');

/**
 * 게시글 상세 페이지 컨트롤러
 */
class DetailController {
    constructor() {
        this.currentPostId = null;
        this.currentUserId = null;
        this.currentUser = null;
        this.deleteTargetId = null; // 오직 게시글 삭제 대상 ID만 저장
        this.isLiking = false;
        this.commentController = null;
        this.currentPost = null; // 현재 게시글 데이터 (pin 상태 등)
        this.reportTarget = null; // { type: 'post'|'comment', id: number }
    }

    /**
     * 컨트롤러 초기화
     * @param {object|null} [currentUser=null] - HeaderController에서 전달받은 사용자 정보
     */
    async init(currentUser = null) {
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('id');

        if (!postId) {
            showToastAndRedirect(UI_MESSAGES.INVALID_ACCESS, NAV_PATHS.MAIN);
            return;
        }

        this.currentPostId = postId;

        this._setCurrentUser(currentUser);
        await this._loadPostDetail();
        this._setupEventListeners();
    }

    /**
     * 현재 사용자 설정
     * @param {object|null} user - 사용자 객체 또는 null
     * @private
     */
    _setCurrentUser(user) {
        this.currentUser = user;
        if (user) {
            this.currentUserId = user.user_id || user.id;
        } else {
            this.currentUserId = null;
        }
    }

    /**
     * 관리자 여부 확인
     * @returns {boolean}
     * @private
     */
    get _isAdmin() {
        return this.currentUser?.role === 'admin';
    }

    /**
     * 게시글 상세 정보를 로드하고 화면에 렌더링합니다.
     * 댓글 데이터도 함께 처리하며, 현재 사용자가 작성자인지 확인하여 
     * 수정/삭제 버튼의 노출 여부를 결정합니다.
     * 
     * @private
     * @returns {Promise<void>}
     */
    async _loadPostDetail() {
        try {
            const result = await PostModel.getPost(this.currentPostId);

            if (!result.ok) {
                throw new Error(UI_MESSAGES.POST_DETAIL_FAIL);
            }

            const data = result.data?.data;
            const post = data?.post;

            if (!post) {
                throw new Error(UI_MESSAGES.POST_NOT_FOUND);
            }

            // 댓글 별도 추출 (백엔드 응답 구조: data: { post: {...}, comments: [...] })
            const comments = data?.comments || [];

            // 트리 구조에서 총 댓글 수 계산 (삭제된 댓글 제외)
            let totalComments = 0;
            comments.forEach(c => {
                if (!c.is_deleted) totalComments++;
                if (c.replies) {
                    totalComments += c.replies.filter(r => !r.is_deleted).length;
                }
            });
            post.comments_count = totalComments;

            // 게시글 렌더링
            this.currentPost = post;
            PostDetailView.renderPost(post);

            // 작성자/관리자 액션 버튼 표시/숨기기
            const isOwner = this.currentUserId && post.author &&
                (this.currentUserId === post.author.user_id || this.currentUserId === post.author.id);
            PostDetailView.toggleActionButtons(isOwner, this._isAdmin);

            // 신고 버튼 (로그인 + 본인 게시글 아닌 경우)
            PostDetailView.toggleReportButton(this.currentUserId && !isOwner);

            // 고정/해제 버튼 (관리자만)
            PostDetailView.togglePinButton(this._isAdmin, post.is_pinned);

            // 댓글 컨트롤러 초기화 및 렌더링 위임
            if (!this.commentController) {
                this.commentController = new CommentController(
                    this.currentPostId,
                    this.currentUserId,
                    {
                        onCommentChange: () => this._reloadComments(),
                        onReport: (targetType, targetId) => this._openReportModal(targetType, targetId),
                    },
                    this._isAdmin
                );
                // 입력창 이벤트는 DOM이 그려진 후 한 번만 설정
                this.commentController.setupInputEvents();
            }

            this.commentController.render(comments);

        } catch (error) {
            logger.error('게시글 로드 실패', error);
            showToastAndRedirect(error.message, NAV_PATHS.MAIN, 1500);
        }
    }

    /**
     * 댓글 목록만 다시 로드 (게시글 전체를 다시 렌더링하지 않음)
     * @private
     */
    async _reloadComments() {
        try {
            const result = await PostModel.getPost(this.currentPostId);
            if (!result.ok) return;

            const data = result.data?.data;
            const comments = data?.comments || [];

            // 총 댓글 수 계산 (삭제된 댓글 제외)
            let totalCount = 0;
            comments.forEach(c => {
                if (!c.is_deleted) totalCount++;
                if (c.replies) {
                    totalCount += c.replies.filter(r => !r.is_deleted).length;
                }
            });
            const commentCount = document.getElementById('comment-count');
            if (commentCount) commentCount.textContent = totalCount;

            // 댓글 목록만 다시 렌더링
            this.commentController.render(comments);
        } catch (error) {
            logger.error('댓글 목록 새로고침 실패', error);
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
                location.href = resolveNavPath(NAV_PATHS.MAIN);
            });
        }

        // 수정 버튼
        const editBtn = document.getElementById('edit-post-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                location.href = resolveNavPath(NAV_PATHS.EDIT(this.currentPostId));
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

        // 고정/해제 버튼 (관리자)
        const pinBtn = document.getElementById('pin-post-btn');
        if (pinBtn) {
            pinBtn.addEventListener('click', () => this._handlePinToggle());
        }

        // 신고 버튼
        const reportBtn = document.getElementById('report-post-btn');
        if (reportBtn) {
            reportBtn.addEventListener('click', () => this._openReportModal('post'));
        }

        // 신고 모달 제출
        const reportSubmitBtn = document.getElementById('report-submit-btn');
        if (reportSubmitBtn) {
            reportSubmitBtn.addEventListener('click', () => this._submitReport());
        }

        // 신고 모달 취소
        const reportCancelBtn = document.getElementById('report-cancel-btn');
        if (reportCancelBtn) {
            reportCancelBtn.addEventListener('click', () => {
                ModalView.closeModal('report-modal');
            });
        }
    }

    /**
     * 좋아요 토글 처리를 수행합니다.
     * 
     * 낙관적 UI 업데이트(Optimistic UI Update)를 적용하여
     * API 응답을 기다리지 않고 즉시 UI를 변경한 후,
     * 실패 시 원래 상태로 롤백합니다.
     * 
     * @private
     * @returns {Promise<void>}
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
     * 게시글 고정/해제 토글 (관리자)
     * @private
     */
    async _handlePinToggle() {
        if (!this.currentPost) return;

        try {
            const isPinned = this.currentPost.is_pinned;
            const result = isPinned
                ? await PostModel.unpinPost(this.currentPostId)
                : await PostModel.pinPost(this.currentPostId);

            if (result.ok) {
                this.currentPost.is_pinned = !isPinned;
                PostDetailView.togglePinButton(true, !isPinned);
                showToast(isPinned ? UI_MESSAGES.UNPIN_SUCCESS : UI_MESSAGES.PIN_SUCCESS);
            } else {
                showToast(UI_MESSAGES.UNKNOWN_ERROR);
            }
        } catch (error) {
            logger.error('고정/해제 실패', error);
            showToast(UI_MESSAGES.UNKNOWN_ERROR);
        }
    }

    /**
     * 신고 모달 열기 (게시글 또는 댓글)
     * @param {string} [targetType='post'] - 'post' 또는 'comment'
     * @param {number} [targetId] - 대상 ID (생략 시 현재 게시글)
     * @private
     */
    _openReportModal(targetType = 'post', targetId = null) {
        const modal = document.getElementById('report-modal');
        if (modal) {
            this.reportTarget = {
                type: targetType,
                id: targetId || Number(this.currentPostId),
            };

            // 모달 제목 변경
            const titleEl = modal.querySelector('h3');
            if (titleEl) {
                titleEl.textContent = targetType === 'comment' ? '댓글 신고' : '게시글 신고';
            }

            // 폼 초기화
            const reasonSelect = document.getElementById('report-reason');
            const descInput = document.getElementById('report-description');
            if (reasonSelect) reasonSelect.value = 'spam';
            if (descInput) descInput.value = '';

            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * 신고 제출 (게시글 또는 댓글)
     * @private
     */
    async _submitReport() {
        if (!this.reportTarget) return;

        const reasonSelect = document.getElementById('report-reason');
        const descInput = document.getElementById('report-description');

        const reason = reasonSelect?.value;
        const description = descInput?.value?.trim() || null;

        try {
            const result = await ReportModel.createReport({
                target_type: this.reportTarget.type,
                target_id: this.reportTarget.id,
                reason,
                description,
            });

            ModalView.closeModal('report-modal');

            if (result.ok) {
                showToast(UI_MESSAGES.REPORT_SUCCESS);
            } else if (result.status === 409) {
                showToast(UI_MESSAGES.REPORT_DUPLICATE);
            } else if (result.status === 400) {
                showToast(UI_MESSAGES.REPORT_OWN_CONTENT);
            } else {
                showToast(UI_MESSAGES.UNKNOWN_ERROR);
            }
        } catch (error) {
            logger.error('신고 제출 실패', error);
            ModalView.closeModal('report-modal');
            showToast(UI_MESSAGES.UNKNOWN_ERROR);
        } finally {
            this.reportTarget = null;
        }
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
                showToastAndRedirect(UI_MESSAGES.POST_DELETE_SUCCESS, NAV_PATHS.MAIN);
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
