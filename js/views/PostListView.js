// js/views/PostListView.js
// 게시글 목록 렌더링 관련 로직

import { formatDate, formatCount, truncateTitle } from './helpers.js';

/**
 * 게시글 목록 View 클래스
 */
class PostListView {
    /**
     * 게시글 카드 요소 생성
     * @param {object} post - 게시글 데이터
     * @param {Function} onClick - 클릭 핸들러
     * @returns {HTMLElement} - 게시글 카드 요소
     */
    static createPostCard(post, onClick) {
        const li = document.createElement('li');
        li.className = 'post-card';

        // 제목 자르기
        const title = truncateTitle(post.title);

        // 날짜 포맷팅
        const dateStr = formatDate(new Date(post.created_at));

        // 통계
        const likes = post.likes_count || 0;
        const comments = post.comments_count || 0;
        const views = post.views_count || 0;

        // 작성자 프로필 이미지
        const profileImg = post.author?.profileImageUrl || '';

        li.innerHTML = `
            <div class="post-card-header">
                <h3 class="post-title">${title}</h3>
                <span class="post-date">${dateStr}</span>
            </div>
            <div class="post-stats">
                <span>좋아요 ${formatCount(likes)}</span>
                <span>댓글 ${formatCount(comments)}</span>
                <span>조회수 ${formatCount(views)}</span>
            </div>
            <div class="post-divider"></div>
            <div class="post-author">
                <div class="author-profile-img" style="background-image: url('${profileImg}'); background-size: cover;"></div>
                <span class="author-nickname">${post.author?.nickname || ''}</span>
            </div>
        `;

        if (onClick) {
            li.addEventListener('click', () => onClick(post.post_id));
        }

        return li;
    }

    /**
     * 게시글 목록 렌더링
     * @param {HTMLElement} container - 목록 컨테이너
     * @param {Array} posts - 게시글 배열
     * @param {Function} onPostClick - 게시글 클릭 핸들러
     */
    static renderPosts(container, posts, onPostClick) {
        posts.forEach(post => {
            const card = PostListView.createPostCard(post, onPostClick);
            container.appendChild(card);
        });
    }

    /**
     * 로딩 센티널 표시/숨기기
     * @param {HTMLElement} sentinel - 센티널 요소
     * @param {boolean} show - 표시 여부
     */
    static toggleLoadingSentinel(sentinel, show) {
        if (sentinel) {
            sentinel.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * 로딩 센티널 에러 표시
     * @param {HTMLElement} sentinel - 센티널 요소
     * @param {string} message - 에러 메시지
     */
    static showSentinelError(sentinel, message) {
        if (sentinel) {
            sentinel.innerText = message;
        }
    }
}

export default PostListView;
