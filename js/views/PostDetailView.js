// js/views/PostDetailView.js
// 게시글 상세 렌더링 관련 로직

import { formatDate, formatCount } from './helpers.js';

/**
 * 게시글 상세 View 클래스
 */
class PostDetailView {
    /**
     * 게시글 상세 정보 렌더링
     * @param {object} post - 게시글 데이터
     */
    static renderPost(post) {
        // 제목
        const titleEl = document.getElementById('post-title');
        if (titleEl) titleEl.innerText = post.title;

        // 본문
        const contentEl = document.getElementById('post-content');
        if (contentEl) contentEl.innerText = post.content;

        // 작성자
        const authorNickname = document.getElementById('post-author-nickname');
        if (authorNickname) authorNickname.innerText = post.author.nickname;

        const authorImg = document.getElementById('post-author-img');
        if (authorImg) {
            authorImg.style.backgroundImage = `url('${post.author.profileImageUrl || ''}')`;
            authorImg.style.backgroundSize = 'cover';
        }

        // 날짜
        const dateEl = document.getElementById('post-date');
        if (dateEl) dateEl.innerText = formatDate(new Date(post.created_at));

        // 이미지
        const imgEl = document.getElementById('post-image');
        if (imgEl && post.image_urls && post.image_urls.length > 0) {
            imgEl.src = post.image_urls[0];
            imgEl.classList.remove('hidden');
        }

        // 통계
        const likeCount = document.getElementById('like-count');
        if (likeCount) likeCount.innerText = formatCount(post.likes_count);

        const viewCount = document.getElementById('view-count');
        if (viewCount) viewCount.innerText = formatCount(post.views_count);

        const commentCount = document.getElementById('comment-count');
        if (commentCount) commentCount.innerText = formatCount(post.comments_count);

        // 좋아요 상태
        const likeBox = document.getElementById('like-box');
        if (likeBox && post.is_liked) {
            likeBox.classList.add('active');
        }
    }

    /**
     * 좋아요 상태 업데이트
     * @param {boolean} isLiked - 좋아요 여부
     * @param {number} count - 좋아요 수
     */
    static updateLikeState(isLiked, count) {
        const likeBox = document.getElementById('like-box');
        const countEl = document.getElementById('like-count');

        if (likeBox) {
            if (isLiked) {
                likeBox.classList.add('active');
            } else {
                likeBox.classList.remove('active');
            }
        }

        if (countEl) {
            countEl.innerText = count;
        }
    }

    /**
     * 작성자 액션 버튼 표시/숨기기
     * @param {boolean} isOwner - 작성자 여부
     */
    static toggleActionButtons(isOwner) {
        const actionsDiv = document.getElementById('post-actions');
        if (actionsDiv) {
            actionsDiv.style.display = isOwner ? 'flex' : 'none';
        }
    }

    /**
     * 댓글 입력 버튼 상태 업데이트
     * @param {string} content - 입력된 내용
     * @param {HTMLElement} button - 버튼 요소
     * @param {boolean} [isEditing=false] - 수정 모드 여부
     */
    static updateCommentButtonState(content, button, isEditing = false) {
        const hasContent = content.trim().length > 0;

        if (hasContent) {
            button.style.backgroundColor = '#7F6AEE';
        } else {
            button.style.backgroundColor = '#ACA0EB';
        }

        button.textContent = isEditing ? '댓글 수정' : '댓글 등록';
    }

    /**
     * 댓글 입력 초기화
     */
    static resetCommentInput() {
        const input = document.getElementById('comment-input');
        const button = document.getElementById('comment-submit-btn');

        if (input) input.value = '';
        if (button) {
            button.textContent = '댓글 등록';
            button.style.backgroundColor = '#ACA0EB';
        }
    }
}

export default PostDetailView;
