// js/views/CommentListView.js
// 댓글 목록 렌더링 관련 로직

import { formatDate, escapeHtml, escapeCssUrl } from '../utils/formatters.js';
import { getImageUrl } from './helpers.js';

/**
 * 댓글 목록 View 클래스
 */
class CommentListView {
    /**
     * 댓글 요소 생성
     * @param {object} comment - 댓글 데이터
     * @param {string|number|null} currentUserId - 현재 로그인한 사용자 ID
     * @param {object} handlers - 이벤트 핸들러 객체
     * @param {Function} handlers.onEdit - 수정 버튼 클릭 핸들러
     * @param {Function} handlers.onDelete - 삭제 버튼 클릭 핸들러
     * @returns {HTMLElement} - 댓글 요소
     */
    static createCommentElement(comment, currentUserId, handlers) {
        const li = document.createElement('li');
        li.className = 'comment-item';

        const isOwner = currentUserId && currentUserId === comment.author.user_id;
        const safeContent = escapeHtml(comment.content);
        const safeNickname = escapeHtml(comment.author.nickname);
        const safeProfileImg = escapeCssUrl(getImageUrl(comment.author.profileImageUrl));

        li.innerHTML = `
            <div class="comment-author-img" style="background-image: url('${safeProfileImg}'); background-size: cover;"></div>
            <div class="comment-content-wrapper">
                <div class="comment-header">
                    <span class="comment-author-name">${safeNickname}</span>
                    <span class="comment-date">${formatDate(new Date(comment.created_at))}</span>
                    ${isOwner ? `
                    <div class="comment-actions">
                        <button class="small-btn edit-cmt-btn" data-id="${comment.comment_id}">수정</button>
                        <button class="small-btn delete-cmt-btn" data-id="${comment.comment_id}">삭제</button>
                    </div>` : ''}
                </div>
                <p class="comment-text">${safeContent}</p>
            </div>
        `;

        // 이벤트 바인딩
        if (isOwner) {
            const deleteBtn = li.querySelector('.delete-cmt-btn');
            const editBtn = li.querySelector('.edit-cmt-btn');

            if (deleteBtn && handlers.onDelete) {
                deleteBtn.addEventListener('click', () => handlers.onDelete(comment.comment_id));
            }
            if (editBtn && handlers.onEdit) {
                editBtn.addEventListener('click', () => handlers.onEdit(comment));
            }
        }

        return li;
    }

    /**
     * 댓글 목록 렌더링
     * @param {HTMLElement} container - 목록 컨테이너
     * @param {Array} comments - 댓글 배열
     * @param {string|number|null} currentUserId - 현재 로그인한 사용자 ID
     * @param {object} handlers - 이벤트 핸들러 객체
     */
    static renderComments(container, comments, currentUserId, handlers) {
        container.innerHTML = '';
        
        const fragment = document.createDocumentFragment();
        comments.forEach(comment => {
            const element = CommentListView.createCommentElement(comment, currentUserId, handlers);
            fragment.appendChild(element);
        });
        
        container.appendChild(fragment);
    }
}

export default CommentListView;
