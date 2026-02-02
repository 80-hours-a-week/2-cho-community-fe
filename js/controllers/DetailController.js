// js/controllers/DetailController.js
// 게시글 상세 페이지 컨트롤러

import AuthModel from '../models/AuthModel.js';
import PostModel from '../models/PostModel.js';
import CommentModel from '../models/CommentModel.js';
import PostDetailView from '../views/PostDetailView.js';
import CommentListView from '../views/CommentListView.js';
import ModalView from '../views/ModalView.js';
import Logger from '../utils/Logger.js';

const logger = Logger.createLogger('DetailController');

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
            PostDetailView.showToast('잘못된 접근입니다.');
            setTimeout(() => {
                location.href = '/main';
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
                // user object structure depends on backend. Usually it has id or userId.
                // Based on previous code analysis or standard, let's assume userId or id.
                // Looking at AuthModel it just returns the user object.
                // Let's console log or check logic used elsewhere.
                // In HeaderController it uses user to create profile.
                // In CommentListView it uses currentUserId vs comment.author.id.
                // So we need to ensure we get the ID.
                // Let's assume the user object has `userId` or just `id`.
                // Checking previous ViewFile of UserModel or typical response...
                // AuthModel.checkAuthStatus returns `result.data.data.user`.
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
                throw new Error('게시글을 불러오지 못했습니다.');
            }

            const data = result.data?.data;
            const post = data?.post || result.data?.data;

            if (!post) {
                throw new Error('게시글 데이터가 없습니다.');
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

            // 댓글 렌더링 (이미 위에서 선언됨)
            this._renderComments(comments);

        } catch (error) {
            logger.error('게시글 로드 실패', error);
            PostDetailView.showToast(error.message);
            setTimeout(() => {
                location.href = '/main';
            }, 1500);
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
        // 뒤로가기 버튼
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                location.href = '/main';
            });
        }

        // 수정 버튼
        const editBtn = document.getElementById('edit-post-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                location.href = `/edit?id=${this.currentPostId}`;
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
        const originalCount = parseInt(countEl.innerText) || 0;
        const wasLiked = likeBox.classList.contains('active');

        // 낙관적 UI 업데이트 (Optimistic UI Update)
        const newCount = wasLiked ? Math.max(0, originalCount - 1) : originalCount + 1;
        PostDetailView.updateLikeState(!wasLiked, newCount);

        try {
            const result = wasLiked
                ? await PostModel.unlikePost(this.currentPostId)
                : await PostModel.likePost(this.currentPostId);

            if (!result.ok) {
                // API 실패 시 롤백
                PostDetailView.updateLikeState(wasLiked, originalCount);
                PostDetailView.showToast('좋아요 처리에 실패했습니다.');
            }
        } catch (error) {
            // 네트워크 에러 시 롤백
            logger.error('좋아요 처리 실패', error);
            PostDetailView.updateLikeState(wasLiked, originalCount);
            PostDetailView.showToast('네트워크 오류가 발생했습니다.');
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
                    PostDetailView.showToast('게시글이 삭제되었습니다.');
                    setTimeout(() => {
                        location.href = '/main';
                    }, 1000);
                } else {
                    PostDetailView.showToast('삭제 실패');
                }
            } catch (e) {
                logger.error('게시글 삭제 실패', e);
                PostDetailView.showToast('오류가 발생했습니다.');
            }
        } else if (this.deleteTarget.type === 'comment') {
            try {
                const result = await CommentModel.deleteComment(this.currentPostId, this.deleteTarget.id);
                if (result.ok) {
                    await this._loadPostDetail();
                } else {
                    PostDetailView.showToast('삭제 실패');
                }
            } catch (e) {
                logger.error('댓글 삭제 실패', e);
                PostDetailView.showToast('오류가 발생했습니다.');
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
                PostDetailView.showToast(this.editingCommentId ? '댓글 수정 실패' : '댓글 등록 실패');
            }
        } catch (e) {
            logger.error('댓글 제출 실패', e);
            PostDetailView.showToast('오류가 발생했습니다.');
        }
    }
}

export default DetailController;
