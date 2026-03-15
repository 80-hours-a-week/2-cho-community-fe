// js/controllers/DetailController.js
// 게시글 상세 페이지 컨트롤러

import PostModel from '../models/PostModel.js';
import UserModel from '../models/UserModel.js';
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
        this.isBookmarking = false;
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

            // 차단 버튼 (로그인 + 본인 게시글 아닌 경우)
            PostDetailView.toggleBlockButton(this.currentUserId && !isOwner, post.is_blocked);

            // 투표 데이터 저장 (변경 시 사용)
            this._currentPollData = post.poll || null;

            // 투표 버튼 이벤트 바인딩
            this._setupPollVoteListener();

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

            // 연관 게시글 lazy load (핵심 기능 아님)
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
            const commentSort = this.commentController?.commentSort || 'oldest';
            const result = await PostModel.getPost(this.currentPostId, commentSort);
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
            showToast('댓글을 불러오지 못했습니다.');
        }
    }

    /**
     * 연관 게시글 로드
     * @param {string|number} postId - 게시글 ID
     * @private
     */
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

        // 북마크
        const bookmarkBox = document.getElementById('bookmark-box');
        if (bookmarkBox) {
            bookmarkBox.addEventListener('click', () => this._handleBookmark());
        }

        // 공유
        const shareBtn = document.getElementById('share-post-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => this._handleShare());
        }

        // 고정/해제 버튼 (관리자)
        const pinBtn = document.getElementById('pin-post-btn');
        if (pinBtn) {
            pinBtn.addEventListener('click', () => this._handlePinToggle());
        }

        // 차단 버튼
        const blockBtn = document.getElementById('block-user-btn');
        if (blockBtn) {
            blockBtn.addEventListener('click', () => this._handleBlock());
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
        if (!likeBox || !countEl) return;
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

        // 낙관적 UI 업데이트
        const newCount = wasBookmarked ? Math.max(0, originalCount - 1) : originalCount + 1;
        PostDetailView.updateBookmarkState(!wasBookmarked, newCount);

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

        // 모바일: Web Share API 지원 시 사용
        if (navigator.share) {
            try {
                await navigator.share({
                    title: this.currentPost?.title || '게시글',
                    url: url,
                });
                return;
            } catch {
                // 사용자 취소 등 — 무시
            }
        }

        // 데스크톱: 클립보드 복사
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
        const blockBtn = document.getElementById('block-user-btn');
        const isBlocked = blockBtn?.textContent === '차단 해제';

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
     * 투표 버튼 이벤트 리스너 설정
     * @private
     */
    _setupPollVoteListener() {
        const voteBtn = document.getElementById('poll-vote-btn');
        if (voteBtn) {
            voteBtn.addEventListener('click', () => this._handlePollVote());
        }

        const changeBtn = document.getElementById('poll-change-btn');
        if (changeBtn) {
            changeBtn.addEventListener('click', () => this._handlePollChange());
        }

        const cancelBtn = document.getElementById('poll-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this._handlePollCancel());
        }
    }

    /**
     * 투표 처리
     * @private
     */
    async _handlePollVote() {
        const form = document.getElementById('poll-vote-form');
        if (!form) return;

        const selected = form.querySelector('input[name="poll-vote"]:checked');
        if (!selected) {
            showToast(UI_MESSAGES.POLL_SELECT_REQUIRED);
            return;
        }

        const optionId = Number(selected.value);

        try {
            const result = await PostModel.votePoll(this.currentPostId, optionId);

            if (result.ok) {
                showToast(UI_MESSAGES.POLL_VOTE_SUCCESS);
                // 게시글 다시 로드하여 투표 결과 표시
                await this._loadPostDetail();
            } else {
                showToast(UI_MESSAGES.POLL_VOTE_FAIL);
            }
        } catch (error) {
            logger.error('투표 처리 실패', error);
            showToast(UI_MESSAGES.POLL_VOTE_FAIL);
        }
    }

    /**
     * 투표 변경: 결과 뷰 → 투표 폼으로 전환
     * @private
     */
    _handlePollChange() {
        // 현재 게시글 데이터에서 poll 정보를 가져와 투표 모드로 다시 렌더링
        const pollContainer = document.getElementById('poll-container');
        if (!pollContainer || !this._currentPollData) return;

        // my_vote를 null로 덮어써서 투표 모드로 전환
        const pollCopy = { ...this._currentPollData, my_vote: null };
        const newPoll = PostDetailView.renderPoll(pollCopy, this.currentPostId);
        pollContainer.replaceWith(newPoll);

        // 투표 폼의 이벤트 리스너를 재설정 (변경 전용)
        const voteBtn = document.getElementById('poll-vote-btn');
        if (voteBtn) {
            voteBtn.textContent = '변경';
            voteBtn.addEventListener('click', () => this._submitPollChange());
        }
    }

    /**
     * 투표 변경 제출
     * @private
     */
    async _submitPollChange() {
        const form = document.getElementById('poll-vote-form');
        if (!form) return;

        const selected = form.querySelector('input[name="poll-vote"]:checked');
        if (!selected) {
            showToast(UI_MESSAGES.POLL_SELECT_REQUIRED);
            return;
        }

        const optionId = Number(selected.value);

        try {
            const result = await PostModel.changePollVote(this.currentPostId, optionId);
            if (result.ok) {
                showToast(UI_MESSAGES.POLL_VOTE_CHANGE_SUCCESS);
                await this._loadPostDetail();
            } else {
                showToast(UI_MESSAGES.POLL_VOTE_CHANGE_FAIL);
            }
        } catch (error) {
            logger.error('투표 변경 실패', error);
            showToast(UI_MESSAGES.POLL_VOTE_CHANGE_FAIL);
        }
    }

    /**
     * 투표 취소 처리
     * @private
     */
    async _handlePollCancel() {
        try {
            const result = await PostModel.cancelPollVote(this.currentPostId);
            if (result.ok) {
                showToast(UI_MESSAGES.POLL_VOTE_CANCEL_SUCCESS);
                await this._loadPostDetail();
            } else {
                showToast(UI_MESSAGES.POLL_VOTE_CANCEL_FAIL);
            }
        } catch (error) {
            logger.error('투표 취소 실패', error);
            showToast(UI_MESSAGES.POLL_VOTE_CANCEL_FAIL);
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
