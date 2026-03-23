// js/controllers/DetailController.js
// 게시글 상세 페이지 컨트롤러
import PostModel from '../models/PostModel.js';
import UserModel from '../models/UserModel.js';
import ReportModel from '../models/ReportModel.js';
import PostDetailView from '../views/PostDetailView.js';
import ModalView from '../views/ModalView.js';
import CommentController from './CommentController.js';
import DetailPollHandler from './DetailPollHandler.js';
import Logger from '../utils/Logger.js';
import { NAV_PATHS, UI_MESSAGES } from '../constants.js';
import { showToastAndRedirect, showToast } from '../views/helpers.js';
import { resolveNavPath } from '../config.js';

const logger = Logger.createLogger('DetailController');

/** 게시글 상세 페이지 컨트롤러 */
class DetailController {
    constructor() {
        this.currentPostId = null;
        this.currentUserId = null;
        this.currentUser = null;
        this.deleteTargetId = null; // 오직 게시글 삭제 대상 ID만 저장
        this.isLiking = false;
        this.isBookmarking = false;
        this.commentController = null;
        this.currentPost = null; // 현재 게시글 데이터 (pin 상태 등)
        this.reportTarget = null; // { type: 'post'|'comment', id: number }
        this.pollHandler = null;
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
        this.pollHandler = new DetailPollHandler(postId);
        this._setCurrentUser(currentUser);
        await this._loadPostDetail();
        this._setupEventListeners();
        window.addEventListener('pagehide', () => {
            if (this.commentController) this.commentController.destroy();
        });
    }
    /** @private */
    _setCurrentUser(user) {
        this.currentUser = user;
        this.currentUserId = user ? (user.user_id || user.id) : null;
    }
    get _isAdmin() {
        return this.currentUser?.role === 'admin';
    }
    /**
     * 트리 구조 댓글 배열에서 삭제되지 않은 댓글 수를 반환합니다.
     * @param {Array} comments
     * @returns {number}
     * @private
     */
    _countVisibleComments(comments) {
        let count = 0;
        comments.forEach(c => {
            if (!c.is_deleted) count++;
            if (c.replies) count += c.replies.filter(r => !r.is_deleted).length;
        });
        return count;
    }
    /**
     * API 응답에서 post/comments를 추출합니다.
     * @private
     */
    _extractPostData(result) {
        const data = result.data?.data;
        const post = data?.post;
        if (!post) throw new Error(UI_MESSAGES.POST_NOT_FOUND);
        return { post, comments: data?.comments };
    }
    /**
     * 게시글 상세 정보를 로드하고 화면에 렌더링합니다.
     * 댓글 데이터도 함께 처리하며, 현재 사용자가 작성자인지 확인하여
     * 수정/삭제 버튼의 노출 여부를 결정합니다.
     * @private
     */
    async _loadPostDetail() {
        try {
            const result = await PostModel.getPost(this.currentPostId);
            if (!result.ok) throw new Error(UI_MESSAGES.POST_DETAIL_FAIL);
            const { post, comments: rawComments } = this._extractPostData(result);
            const comments = rawComments || [];
            post.comments_count = this._countVisibleComments(comments);
            this.currentPost = post;
            PostDetailView.renderPost(post);
            const isOwner = this.currentUserId && post.author &&
                (this.currentUserId === post.author.user_id || this.currentUserId === post.author.id);
            PostDetailView.toggleActionButtons(isOwner, this._isAdmin);
            PostDetailView.toggleReportButton(this.currentUserId && !isOwner);
            PostDetailView.togglePinButton(this._isAdmin, post.is_pinned);
            PostDetailView.toggleBlockButton(this.currentUserId && !isOwner, post.is_blocked);
            this.pollHandler.setPollData(post.poll);
            this.pollHandler.setupListeners();
            if (!this.commentController) {
                this.commentController = new CommentController(
                    this.currentPostId, this.currentUserId,
                    {
                        onCommentChange: () => this._reloadComments(),
                        onReport: (t, id) => this._openReportModal(t, id),
                    },
                    this._isAdmin
                );
                this.commentController.setupInputEvents();
            }
            this.commentController.render(comments);
            this._loadRelatedPosts(this.currentPostId);
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
            const sort = this.commentController?.commentSort || 'oldest';
            const result = await PostModel.getPost(this.currentPostId, sort);
            if (!result.ok) return;
            const comments = result.data?.data?.comments || [];
            const el = document.getElementById('comment-count');
            if (el) el.textContent = this._countVisibleComments(comments);
            this.commentController.render(comments);
        } catch (error) {
            logger.error('댓글 목록 새로고침 실패', error);
            showToast('댓글을 불러오지 못했습니다.');
        }
    }
    /** @private */
    async _loadRelatedPosts(postId) {
        try {
            const result = await PostModel.getRelatedPosts(postId);
            if (result.ok && result.data?.data?.posts) {
                PostDetailView.renderRelatedPosts(result.data.data.posts);
            }
        } catch {
            // 연관 게시글 실패는 무시 (핵심 기능 아님)
        }
    }
    /** @private */
    _setupEventListeners() {
        this._bindClick('back-btn', () => { location.href = resolveNavPath(NAV_PATHS.MAIN); });
        this._bindClick('edit-post-btn', () => { location.href = resolveNavPath(NAV_PATHS.EDIT(this.currentPostId)); });
        this._bindClick('delete-post-btn', () => this._openDeleteModal());
        this._bindClick('like-box', () => this._handleLike());
        this._bindClick('bookmark-box', () => this._handleBookmark());
        this._bindClick('share-post-btn', () => this._handleShare());
        this._bindClick('pin-post-btn', () => this._handlePinToggle());
        this._bindClick('block-user-btn', () => this._handleBlock());
        this._bindClick('report-post-btn', () => this._openReportModal('post'));
        this._bindClick('report-submit-btn', () => this._submitReport());
        this._bindClick('report-cancel-btn', () => ModalView.closeModal('report-modal'));
    }
    /**
     * getElementById + addEventListener('click') 조합 헬퍼
     * @private
     */
    _bindClick(id, handler) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', handler);
    }
    /**
     * 좋아요 토글 처리 — 낙관적 UI 업데이트(Optimistic UI Update) 적용.
     * API 응답을 기다리지 않고 즉시 UI를 변경한 후 실패 시 원래 상태로 롤백합니다.
     * @private
     */
    async _handleLike() {
        if (this.isLiking) return;
        const likeBox = document.getElementById('like-box');
        const countEl = document.getElementById('like-count');
        if (!likeBox || !countEl) return;
        const originalCount = parseInt(countEl.innerText) || 0;
        const wasLiked = likeBox.classList.contains('active');
        PostDetailView.updateLikeState(!wasLiked, wasLiked ? Math.max(0, originalCount - 1) : originalCount + 1);
        this.isLiking = true;
        try {
            const result = wasLiked
                ? await PostModel.unlikePost(this.currentPostId)
                : await PostModel.likePost(this.currentPostId);
            if (!result.ok) {
                PostDetailView.updateLikeState(wasLiked, originalCount);
                PostDetailView.showToast(UI_MESSAGES.LIKE_FAIL);
            }
        } catch (error) {
            logger.error('좋아요 처리 실패', error);
            PostDetailView.updateLikeState(wasLiked, originalCount);
            PostDetailView.showToast(UI_MESSAGES.SERVER_ERROR);
        } finally {
            this.isLiking = false;
        }
    }
    /**
     * 북마크 토글 처리 (낙관적 UI)
     * @private
     */
    async _handleBookmark() {
        if (this.isBookmarking) return;
        const bookmarkBox = document.getElementById('bookmark-box');
        const countEl = document.getElementById('bookmark-count');
        if (!bookmarkBox || !countEl) return;
        const originalCount = parseInt(countEl.innerText) || 0;
        const wasBookmarked = bookmarkBox.classList.contains('active');
        PostDetailView.updateBookmarkState(!wasBookmarked, wasBookmarked ? Math.max(0, originalCount - 1) : originalCount + 1);
        this.isBookmarking = true;
        try {
            const result = wasBookmarked
                ? await PostModel.unbookmarkPost(this.currentPostId)
                : await PostModel.bookmarkPost(this.currentPostId);
            if (!result.ok) {
                PostDetailView.updateBookmarkState(wasBookmarked, originalCount);
                PostDetailView.showToast(UI_MESSAGES.BOOKMARK_FAIL);
            }
        } catch (error) {
            logger.error('북마크 처리 실패', error);
            PostDetailView.updateBookmarkState(wasBookmarked, originalCount);
            PostDetailView.showToast(UI_MESSAGES.SERVER_ERROR);
        } finally {
            this.isBookmarking = false;
        }
    }
    /**
     * 공유 처리 (Web Share API 또는 클립보드)
     * @private
     */
    async _handleShare() {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({ title: this.currentPost?.title || '게시글', url });
                return;
            } catch {
                // 사용자 취소 등 — 무시
            }
        }
        try {
            await navigator.clipboard.writeText(url);
            PostDetailView.showToast(UI_MESSAGES.SHARE_COPIED);
        } catch {
            PostDetailView.showToast(UI_MESSAGES.UNKNOWN_ERROR);
        }
    }
    /**
     * 사용자 차단/해제 토글
     * @private
     */
    async _handleBlock() {
        if (!this.currentPost?.author?.user_id) return;
        const authorId = this.currentPost.author.user_id;
        const isBlocked = document.getElementById('block-user-btn')?.textContent === '차단 해제';
        try {
            const result = isBlocked
                ? await UserModel.unblockUser(authorId)
                : await UserModel.blockUser(authorId);
            if (result.ok) {
                PostDetailView.toggleBlockButton(true, !isBlocked);
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
    /** @private */
    _openDeleteModal() {
        this.deleteTargetId = this.currentPostId;
        ModalView.setupDeleteModal({
            modalId: 'confirm-modal',
            cancelBtnId: 'modal-cancel-btn',
            confirmBtnId: 'modal-confirm-btn',
            onConfirm: () => this._executeDelete(),
        });
        ModalView.openConfirmModal('confirm-modal', '게시글을 삭제하시겠습니까?');
    }
    /**
     * 게시글 고정/해제 토글 (관리자)
     * @private
     */
    async _handlePinToggle() {
        if (!this.currentPost) return;
        const isPinned = this.currentPost.is_pinned;
        try {
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
     * @param {number|null} [targetId=null] - 대상 ID (생략 시 현재 게시글)
     * @private
     */
    _openReportModal(targetType = 'post', targetId = null) {
        const modal = document.getElementById('report-modal');
        if (!modal) return;
        this.reportTarget = { type: targetType, id: targetId || Number(this.currentPostId) };
        const titleEl = modal.querySelector('h3');
        if (titleEl) titleEl.textContent = targetType === 'comment' ? '댓글 신고' : '게시글 신고';
        const reasonSelect = document.getElementById('report-reason');
        const descInput = document.getElementById('report-description');
        if (reasonSelect) reasonSelect.value = 'spam';
        if (descInput) descInput.value = '';
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    /**
     * 신고 제출 (게시글 또는 댓글)
     * @private
     */
    async _submitReport() {
        if (!this.reportTarget) return;
        const reason = document.getElementById('report-reason')?.value;
        const description = document.getElementById('report-description')?.value?.trim() || null;
        try {
            const result = await ReportModel.createReport({
                target_type: this.reportTarget.type,
                target_id: this.reportTarget.id,
                reason, description,
            });
            ModalView.closeModal('report-modal');
            if (result.ok) showToast(UI_MESSAGES.REPORT_SUCCESS);
            else if (result.status === 409) showToast(UI_MESSAGES.REPORT_DUPLICATE);
            else if (result.status === 400) showToast(UI_MESSAGES.REPORT_OWN_CONTENT);
            else showToast(UI_MESSAGES.UNKNOWN_ERROR);
        } catch (error) {
            logger.error('신고 제출 실패', error);
            ModalView.closeModal('report-modal');
            showToast(UI_MESSAGES.UNKNOWN_ERROR);
        } finally {
            this.reportTarget = null;
        }
    }
    /** @private */
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
