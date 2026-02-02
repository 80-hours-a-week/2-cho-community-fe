// js/controllers/CommentController.js
// 댓글 관리 컨트롤러

import CommentModel from '../models/CommentModel.js';
import CommentListView from '../views/CommentListView.js';
import PostDetailView from '../views/PostDetailView.js'; // 토스트 메시지 및 입력창 제어용
import ModalView from '../views/ModalView.js';
import Logger from '../utils/Logger.js';
import { UI_MESSAGES } from '../constants.js';

const logger = Logger.createLogger('CommentController');

class CommentController {
    /**
     * @param {string|number} postId - 게시글 ID
     * @param {string|number} currentUserId - 현재 사용자 ID
     * @param {object} callbacks - 콜백 함수
     * @param {Function} callbacks.onCommentChange - 댓글 변경 시 호출 (삭제, 추가 등)
     */
    constructor(postId, currentUserId, callbacks = {}) {
        this.postId = postId;
        this.currentUserId = currentUserId;
        this.callbacks = callbacks;
        this.editingCommentId = null;
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
            onDelete: (commentId) => this.confirmDelete(commentId)
        });
    }

    /**
     * 댓글 입력 관련 이벤트 설정
     */
    setupInputEvents() {
        const commentInput = document.getElementById('comment-input');
        const commentSubmitBtn = document.getElementById('comment-submit-btn');

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
    }

    /**
     * 댓글 수정 모드 시작
     * @param {object} comment - 수정할 댓글 객체
     */
    startEdit(comment) {
        const commentInput = document.getElementById('comment-input');
        const commentSubmitBtn = document.getElementById('comment-submit-btn');

        if (commentInput) {
            commentInput.value = comment.content;
            commentInput.focus();
        }

        this.editingCommentId = comment.comment_id;
        PostDetailView.updateCommentButtonState(comment.content, commentSubmitBtn, true);
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
     */
    async submitComment() {
        const input = document.getElementById('comment-input');
        const content = input.value.trim();
        if (!content) return;

        try {
            let result;

            if (this.editingCommentId) {
                result = await CommentModel.updateComment(this.postId, this.editingCommentId, content);
            } else {
                result = await CommentModel.createComment(this.postId, content);
            }

            if (result.ok) {
                PostDetailView.resetCommentInput();
                this.editingCommentId = null;
                this._notifyChange();
            } else {
                PostDetailView.showToast(this.editingCommentId ? UI_MESSAGES.COMMENT_UPDATE_FAIL : UI_MESSAGES.COMMENT_CREATE_FAIL);
            }
        } catch (e) {
            logger.error('댓글 제출 실패', e);
            PostDetailView.showToast(UI_MESSAGES.UNKNOWN_ERROR);
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
