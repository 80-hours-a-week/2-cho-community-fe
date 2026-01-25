// js/controllers/DetailController.js
// 게시글 상세 페이지 컨트롤러

import AuthModel from '../models/AuthModel.js';
import PostModel from '../models/PostModel.js';
import CommentModel from '../models/CommentModel.js';
import PostDetailView from '../views/PostDetailView.js';
import CommentListView from '../views/CommentListView.js';
import ModalView from '../views/ModalView.js';

/**
 * 게시글 상세 페이지 컨트롤러
 */
class DetailController {
    constructor() {
        this.currentPostId = null;
        this.currentUserId = null;
        this.editingCommentId = null;
        this.deleteTarget = { type: null, id: null };
    }

    /**
     * 컨트롤러 초기화
     */
    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('id');

        if (!postId) {
            alert('잘못된 접근입니다.');
            location.href = 'index.html';
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
                this.currentUserId = authStatus.user.user_id;
            }
        } catch (error) {
            console.error('인증 확인 실패:', error);
        }
    }

    /**
     * 게시글 상세 로드
     * @private
     */
    async _loadPostDetail() {
        try {
            const result = await PostModel.getPost(this.currentPostId);

            if (!result.ok) throw new Error('게시글을 불러오지 못했습니다.');

            const postData = result.data?.data;
            const post = postData?.post;
            const comments = postData?.comments || [];

            PostDetailView.renderPost(post);
            this._renderComments(comments);
            PostDetailView.toggleActionButtons(this.currentUserId === post.author.user_id);

        } catch (error) {
            console.error(error);
            alert(error.message);
            location.href = 'index.html';
        }
    }

    /**
     * 댓글 렌더링
     * @private
     */
    _renderComments(comments) {
        const listEl = document.getElementById('comment-list');
        CommentListView.renderComments(listEl, comments, this.currentUserId, {
            onEdit: (comment) => this._startEditComment(comment),
            onDelete: (commentId) => this._openDeleteModal('comment', commentId)
        });
    }

    /**
     * 이벤트 리스너 설정
     * @private
     */
    _setupEventListeners() {
        // 수정 버튼
        const editBtn = document.getElementById('edit-post-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                location.href = `edit.html?id=${this.currentPostId}`;
            });
        }

        // 삭제 버튼
        const deleteBtn = document.getElementById('delete-post-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this._openDeleteModal('post', this.currentPostId);
            });
        }

        // 좋아요
        const likeBox = document.getElementById('like-box');
        if (likeBox) {
            likeBox.addEventListener('click', () => this._handleLike());
        }

        // 댓글 입력
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
            commentSubmitBtn.addEventListener('click', () => this._submitComment());
        }

        // 모달 설정
        ModalView.setupDeleteModal({
            modalId: 'confirm-modal',
            cancelBtnId: 'modal-cancel-btn',
            confirmBtnId: 'modal-confirm-btn',
            onConfirm: () => this._executeDelete()
        });
    }

    /**
     * 좋아요 처리
     * @private
     */
    async _handleLike() {
        const likeBox = document.getElementById('like-box');
        const countEl = document.getElementById('like-count');
        let count = parseInt(countEl.innerText) || 0;
        const isLiked = likeBox.classList.contains('active');

        // Optimistic UI update
        if (isLiked) {
            PostDetailView.updateLikeState(false, count > 0 ? count - 1 : 0);
            await PostModel.unlikePost(this.currentPostId);
        } else {
            PostDetailView.updateLikeState(true, count + 1);
            await PostModel.likePost(this.currentPostId);
        }
    }

    /**
     * 삭제 모달 열기
     * @private
     */
    _openDeleteModal(type, id) {
        this.deleteTarget = { type, id };
        const title = type === 'post' ? '게시글을 삭제하시겠습니까?' : '댓글을 삭제하시겠습니까?';
        ModalView.openConfirmModal('confirm-modal', title);
    }

    /**
     * 삭제 실행
     * @private
     */
    async _executeDelete() {
        if (!this.deleteTarget.id) return;

        if (this.deleteTarget.type === 'post') {
            try {
                const result = await PostModel.deletePost(this.deleteTarget.id);
                if (result.ok) {
                    alert('게시글이 삭제되었습니다.');
                    location.href = 'index.html';
                } else {
                    alert('삭제 실패');
                }
            } catch (e) {
                console.error(e);
            }
        } else if (this.deleteTarget.type === 'comment') {
            try {
                const result = await CommentModel.deleteComment(this.currentPostId, this.deleteTarget.id);
                if (result.ok) {
                    await this._loadPostDetail();
                } else {
                    alert('삭제 실패');
                }
            } catch (e) {
                console.error(e);
            }
        }

        ModalView.closeModal('confirm-modal');
        this.deleteTarget = { type: null, id: null };
    }

    /**
     * 댓글 수정 시작
     * @private
     */
    _startEditComment(comment) {
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
     * 댓글 제출
     * @private
     */
    async _submitComment() {
        const input = document.getElementById('comment-input');
        const content = input.value.trim();
        if (!content) return;

        try {
            let result;

            if (this.editingCommentId) {
                result = await CommentModel.updateComment(this.currentPostId, this.editingCommentId, content);
            } else {
                result = await CommentModel.createComment(this.currentPostId, content);
            }

            if (result.ok) {
                PostDetailView.resetCommentInput();
                this.editingCommentId = null;
                await this._loadPostDetail();
            } else {
                alert(this.editingCommentId ? '댓글 수정 실패' : '댓글 등록 실패');
            }
        } catch (e) {
            console.error(e);
        }
    }
}

export default DetailController;
