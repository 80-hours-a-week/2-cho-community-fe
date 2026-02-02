// js/views/PostListView.js
// 게시글 목록 렌더링 관련 로직

import { formatDate, formatCount, truncateTitle, escapeHtml, escapeCssUrl } from '../utils/formatters.js';
import { getImageUrl } from './helpers.js';

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

        // 제목 자르기 및 이스케이프 (중요: 자르기 전에 이스케이프 하면 길이가 달라질 수 있으나, 일반적으로는 원본을 자르고 이스케이프하거나, 이스케이프 후 자르는게 안전. 
        // truncateTitle implementation just substrings. So if I escape first, '&' becomes '&amp;' (5 chars).
        // If I truncate first, valid HTML entities might be broken.
        // SAFE APPROACH: Escape first, then truncate? No, users see rendered text.
        // Actually, CSS truncation is better but here we use JS.
        // Let's assume content is plain text.
        const safeTitle = escapeHtml(post.title);
        const title = truncateTitle(safeTitle); // This might truncate '&amp;' to '&am...', rendering broken entity.
        // Better: Truncate first (assuming native length), then escape? 
        // If user inputs '<script>', truncate might make it '<scrip...'. Then escape -> '&lt;scrip...'. This is safe.
        // So Truncate -> Escape is safer for entities integrity? No.
        // Correct way for length limits: Ideally count chars, but here simply:
        // `truncateTitle` accepts string.
        // Let's use `escapeHtml` on the result of `truncateTitle`. User input '<script>' -> truncated '<script>' -> escaped '&lt;script&gt;'. Safe.
        // User input 'AAAA...' -> truncated 'AAAA...' -> escaped 'AAAA...'. Safe.

        const titleText = truncateTitle(post.title);
        const safeTitleStr = escapeHtml(titleText);

        const safeNickname = escapeHtml(post.author?.nickname || '');

        // 날짜 포맷팅
        const dateStr = formatDate(new Date(post.created_at));

        // 통계
        const likes = post.likes_count || 0;
        const comments = post.comments_count || 0;
        const views = post.views_count || 0;

        // 작성자 프로필 이미지
        const profileImg = escapeCssUrl(getImageUrl(post.author?.profileImageUrl));

        li.innerHTML = `
            <div class="post-card-header">
                <h3 class="post-title">${safeTitleStr}</h3>
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
                <span class="author-nickname">${safeNickname}</span>
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
        const fragment = document.createDocumentFragment();
        posts.forEach(post => {
            const card = PostListView.createPostCard(post, onPostClick);
            fragment.appendChild(card);
        });
        container.appendChild(fragment);
    }

    /**
     * 로딩 센티널 표시/숨기기
     * @param {HTMLElement} sentinel - 센티널 요소
     * @param {boolean} show - 표시 여부
     */
    static toggleLoadingSentinel(sentinel, show) {
        if (sentinel) {
            // display: none 대신 visibility를 사용하여 IntersectionObserver가 계속 감지할 수 있도록 함
            sentinel.style.visibility = show ? 'visible' : 'hidden';
            sentinel.style.display = 'block';
            sentinel.innerText = show ? 'loading...' : '';
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
    /**
     * 빈 목록 메시지 표시
     * @param {HTMLElement} container - 목록 컨테이너
     */
    static showEmptyState(container) {
        container.innerHTML = `
            <div class="empty-state">
                <p>등록된 게시글이 없습니다.</p>
            </div>
        `;
    }
}

export default PostListView;
