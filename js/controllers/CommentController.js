// js/controllers/CommentController.js
// 댓글 관리 컨트롤러

import CommentModel from '../models/CommentModel.js';
import PostModel from '../models/PostModel.js';
import CommentListView from '../views/CommentListView.js';
import PostDetailView from '../views/PostDetailView.js'; // 토스트 메시지 및 입력창 제어용
import ModalView from '../views/ModalView.js';
import Logger from '../utils/Logger.js';
import { UI_MESSAGES } from '../constants.js';
import MarkdownEditor from '../components/MarkdownEditor.js';

const logger = Logger.createLogger('CommentController');

const COMMENT_MODE = Object.freeze({
    VIEW: 'view',
    EDIT: 'edit',
    REPLY: 'reply',
});

class CommentController {
    /**
     * @param {string|number} postId - 게시글 ID
     * @param {string|number} currentUserId - 현재 사용자 ID
     * @param {object} callbacks - 콜백 함수
     * @param {Function} callbacks.onCommentChange - 댓글 변경 시 호출 (삭제, 추가 등)
     * @param {boolean} [isAdmin=false] - 관리자 여부
     */
    constructor(postId, currentUserId, callbacks = {}, isAdmin = false) {
        this.postId = postId;
        this.currentUserId = currentUserId;
        this.callbacks = callbacks;
        this.isAdmin = isAdmin;
        this._mode = COMMENT_MODE.VIEW;
        this._modeTarget = null;
        this.isSubmitting = false; // 중복 제출 방지 플래그
        this.commentSort = 'oldest'; // 댓글 정렬 상태
        /** @type {object|null} 게시글 컨텍스트 (Q&A 답변 채택용) */
        this.postContext = null;
    }

    /**
     * 게시글 컨텍스트 설정 (Q&A 답변 채택 UI용)
     * @param {object} context - { categoryId, authorId }
     */
    setPostContext(context) {
        this.postContext = context;
    }

    // 하위 호환 getter — 외부에서 this.editingCommentId / this.replyingToComment 읽기 지원
    get editingCommentId() {
        return this._mode === COMMENT_MODE.EDIT ? this._modeTarget : null;
    }

    get replyingToComment() {
        return this._mode === COMMENT_MODE.REPLY ? this._modeTarget : null;
    }

    /**
     * 모드 전환 — 이전 모드의 UI를 정리하고 새 모드로 설정
     * @param {string} mode - COMMENT_MODE 값
     * @param {*} [target=null] - 모드별 대상 (EDIT: commentId, REPLY: {id, nickname})
     * @private
     */
    _setMode(mode, target = null) {
        // 이전 모드의 UI 정리
        if (this._mode === COMMENT_MODE.REPLY) {
            this._cleanupReplyUI();
        }
        this._mode = mode;
        this._modeTarget = target;
    }

    /**
     * 답글 모드 UI 정리
     * @private
     */
    _cleanupReplyUI() {
        const commentInput = document.getElementById('comment-input');
        const replyIndicator = document.getElementById('reply-indicator');

        if (commentInput) {
            commentInput.placeholder = '댓글을 남겨주세요!';
            commentInput.value = '';
        }
        if (replyIndicator) {
            replyIndicator.classList.add('hidden');
        }
    }

    /**
     * 댓글 목록 렌더링
     * @param {Array} comments - 댓글 데이터 배열
     */
    render(comments) {
        const listEl = document.getElementById('comment-list');
        if (!listEl) return;

        CommentListView.renderComments(listEl, comments, this.currentUserId, {
            onEdit: (comment) => this.startEdit(comment),
            onDelete: (commentId) => this.confirmDelete(commentId),
            onReply: (comment) => this.startReply(comment),
            onReport: (comment) => this._reportComment(comment),
            onLike: (comment) => this._handleCommentLike(comment),
            onAcceptAnswer: (comment, isAccepted) => this._handleAcceptAnswer(comment, isAccepted),
        }, this.isAdmin, this.commentSort, this.postContext);

        // 정렬 버튼 이벤트 바인딩 (최초 1회만)
        if (!this._sortBound) {
            this._bindSortEvents(listEl);
            this._sortBound = true;
        }
    }

    /**
     * 정렬 버튼 클릭 이벤트 바인딩 (이벤트 위임, 1회만 호출)
     * @param {HTMLElement} container
     * @private
     */
    _bindSortEvents(container) {
        container.addEventListener('click', (e) => {
            const sortBtn = e.target.closest('.comment-sort-btn');
            if (!sortBtn) return;

            const sort = sortBtn.dataset.sort;
            if (sort === this.commentSort) return;

            this.commentSort = sort;
            this._notifyChange();
        });
    }

    /**
     * 리소스 정리
     */
    destroy() {
        if (this.mentionDropdown) {
            this.mentionDropdown.destroy();
            this.mentionDropdown = null;
        }
    }

    /**
     * 댓글 입력 관련 이벤트 설정
     */
    async setupInputEvents() {
        const commentInput = document.getElementById('comment-input');
        const commentSubmitBtn = document.getElementById('comment-submit-btn');

        // 댓글 입력에 컴팩트 마크다운 에디터 적용
        if (commentInput && !this.commentEditor) {
            this.commentEditor = new MarkdownEditor(commentInput, { compact: true });
        }

        if (commentInput) {
            commentInput.addEventListener('input', () => {
                PostDetailView.updateCommentButtonState(
                    commentInput.value,
                    commentSubmitBtn,
                    !!this.editingCommentId
                );
            });
        }

        if (commentSubmitBtn) {
            // 기존 리스너 제거가 어려우므로, 컨트롤러 교체 시 새 요소로 교체하거나
            // 여기서는 DetailController에서 한 번만 호출된다고 가정함.
            // 안전을 위해 cloneNode로 리스너 초기화 패턴을 쓸 수도 있으나,
            // 지금은 addEventListener만 함 (SPA 네비게이션 시 주의 필요)
            commentSubmitBtn.addEventListener('click', () => this.submitComment());
        }

        // 답글 취소 버튼
        const replyCancelBtn = document.getElementById('reply-cancel-btn');
        if (replyCancelBtn) {
            replyCancelBtn.addEventListener('click', () => this.cancelReply());
        }

        // 멘션 자동완성 드롭다운
        if (commentInput && !this.mentionDropdown) {
            const wrapper = commentInput.closest('.comment-input-wrapper');
            if (wrapper) {
                const { default: MentionDropdown } = await import('../components/MentionDropdown.js');
                this.mentionDropdown = new MentionDropdown(commentInput, wrapper);
            }
        }
    }

    /**
     * 댓글 수정 모드 시작
     * @param {object} comment - 수정할 댓글 객체
     */
    startEdit(comment) {
        this._setMode(COMMENT_MODE.EDIT, comment.comment_id);

        const commentInput = document.getElementById('comment-input');
        const commentSubmitBtn = document.getElementById('comment-submit-btn');

        if (commentInput) {
            commentInput.value = comment.content;
            commentInput.focus();
        }

        PostDetailView.updateCommentButtonState(comment.content, commentSubmitBtn, true);
    }

    /**
     * 답글 모드 시작
     * @param {object} comment - 답글 대상 댓글 객체
     */
    startReply(comment) {
        const replyTarget = {
            id: comment.comment_id,
            nickname: comment.author?.nickname || '알 수 없음',
        };
        this._setMode(COMMENT_MODE.REPLY, replyTarget);

        const commentInput = document.getElementById('comment-input');
        const commentSubmitBtn = document.getElementById('comment-submit-btn');
        const replyIndicator = document.getElementById('reply-indicator');

        PostDetailView.updateCommentButtonState('', commentSubmitBtn, false);

        if (commentInput) {
            commentInput.value = '';
            commentInput.placeholder = `${replyTarget.nickname}님에게 답글...`;
            commentInput.focus();
        }

        if (replyIndicator) {
            const indicatorText = document.getElementById('reply-indicator-text');
            if (indicatorText) {
                indicatorText.textContent = `${replyTarget.nickname}님에게 답글 작성 중`;
            }
            replyIndicator.classList.remove('hidden');
        }
    }

    /**
     * 답글 모드 취소
     */
    cancelReply() {
        this._setMode(COMMENT_MODE.VIEW);
    }

    /**
     * 댓글 삭제 확인 모달 열기
     * @param {string|number} commentId
     */
    confirmDelete(commentId) {
        // 모달 콜백 설정
        ModalView.setupDeleteModal({
            modalId: 'confirm-modal',
            cancelBtnId: 'modal-cancel-btn',
            confirmBtnId: 'modal-confirm-btn',
            onConfirm: () => this.executeDelete(commentId)
        });

        ModalView.openConfirmModal('confirm-modal', '댓글을 삭제하시겠습니까?');
    }

    /**
     * 댓글 삭제 실행
     * @param {string|number} commentId
     */
    async executeDelete(commentId) {
        try {
            const result = await CommentModel.deleteComment(this.postId, commentId);
            if (result.ok) {
                ModalView.closeModal('confirm-modal');
                this._notifyChange();
            } else {
                PostDetailView.showToast(UI_MESSAGES.DELETE_FAIL);
            }
        } catch (e) {
            logger.error('댓글 삭제 실패', e);
            PostDetailView.showToast(UI_MESSAGES.UNKNOWN_ERROR);
        }
    }

    /**
     * 댓글 제출 (생성 또는 수정)
     * 중복 제출 방지: 제출 중에는 추가 요청 차단
     */
    async submitComment() {
        // 중복 제출 방지
        if (this.isSubmitting) return;

        const input = document.getElementById('comment-input');
        const submitBtn = document.getElementById('comment-submit-btn');
        const content = input.value.trim();
        if (!content) return;

        // 제출 중 상태로 전환
        this.isSubmitting = true;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.add('btn-loading');
        }

        try {
            let result;

            if (this.editingCommentId) {
                result = await CommentModel.updateComment(this.postId, this.editingCommentId, content);
            } else {
                const parentId = this.replyingToComment?.id || null;
                result = await CommentModel.createComment(this.postId, content, parentId);
            }

            if (result.ok) {
                PostDetailView.resetCommentInput();
                this._setMode(COMMENT_MODE.VIEW);
                this._notifyChange();
            } else {
                PostDetailView.showToast(this.editingCommentId ? UI_MESSAGES.COMMENT_UPDATE_FAIL : UI_MESSAGES.COMMENT_CREATE_FAIL);
            }
        } catch (e) {
            logger.error('댓글 제출 실패', e);
            PostDetailView.showToast(UI_MESSAGES.UNKNOWN_ERROR);
        } finally {
            // 제출 완료 후 상태 복원
            this.isSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.classList.remove('btn-loading');
            }
        }
    }

    /**
     * 댓글 좋아요 토글 — 전체 목록 새로고침으로 상태 반영
     * @param {object} comment - 좋아요 대상 댓글
     * @private
     */
    async _handleCommentLike(comment) {
        const commentId = comment.comment_id;

        // 1. 즉시 UI 업데이트 (낙관적)
        CommentListView.toggleLikeOptimistic(commentId);

        try {
            const result = comment.is_liked
                ? await CommentModel.unlikeComment(this.postId, commentId)
                : await CommentModel.likeComment(this.postId, commentId);

            if (!result.ok) {
                // 실패 시 롤백
                CommentListView.toggleLikeOptimistic(commentId);
                PostDetailView.showToast(UI_MESSAGES.COMMENT_LIKE_FAIL);
            }
            // 성공 시: 전체 새로고침 불필요 — 낙관적 UI가 이미 반영됨
        } catch (error) {
            // 에러 시 롤백
            CommentListView.toggleLikeOptimistic(commentId);
            logger.error('댓글 좋아요 처리 실패', error);
            PostDetailView.showToast(UI_MESSAGES.COMMENT_LIKE_FAIL);
        }
    }

    /**
     * 답변 채택/해제 처리
     * @param {object} comment - 대상 댓글
     * @param {boolean} isAccepted - 현재 채택 상태
     * @private
     */
    async _handleAcceptAnswer(comment, isAccepted) {
        try {
            const result = isAccepted
                ? await PostModel.unsetAcceptedAnswer(this.postId)
                : await PostModel.setAcceptedAnswer(this.postId, comment.comment_id);

            if (result.ok) {
                PostDetailView.showToast(
                    isAccepted ? UI_MESSAGES.UNACCEPT_ANSWER_SUCCESS : UI_MESSAGES.ACCEPT_ANSWER_SUCCESS
                );
                this._notifyChange();
            } else {
                PostDetailView.showToast(UI_MESSAGES.ACCEPT_ANSWER_FAIL);
            }
        } catch (error) {
            logger.error('답변 채택 처리 실패', error);
            PostDetailView.showToast(UI_MESSAGES.ACCEPT_ANSWER_FAIL);
        }
    }

    /**
     * 댓글 신고 — DetailController의 신고 모달로 위임
     * @param {object} comment - 신고 대상 댓글
     * @private
     */
    _reportComment(comment) {
        if (this.callbacks.onReport) {
            this.callbacks.onReport('comment', comment.comment_id);
        }
    }

    /**
     * 변경 사항 알림
     * @private
     */
    _notifyChange() {
        if (this.callbacks.onCommentChange) {
            this.callbacks.onCommentChange();
        }
    }
}

export default CommentController;
