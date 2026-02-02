// js/views/PostListView.js
// 게시글 목록 렌더링 관련 로직

import { formatDate, formatCount, truncateTitle } from '../utils/formatters.js';
import { getImageUrl } from './helpers.js';
import { createElement } from '../utils/dom.js';

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
        // 제목 자르기
        const titleText = truncateTitle(post.title);
        
        // 날짜 포맷팅
        const dateStr = formatDate(new Date(post.created_at));

        // 통계
        const likes = post.likes_count || 0;
        const comments = post.comments_count || 0;
        const views = post.views_count || 0;

        // 작성자 프로필 이미지
        const profileImgUrl = getImageUrl(post.author?.profileImageUrl);
        const nickname = post.author?.nickname || '';

        // DOM 생성 (createElement 사용)
        const card = createElement('li', { className: 'post-card' }, [
            // Header: Title & Date
            createElement('div', { className: 'post-card-header' }, [
                createElement('h3', { className: 'post-title' }, [titleText]),
                createElement('span', { className: 'post-date' }, [dateStr])
            ]),
            
            // Stats: Likes, Comments, Views
            createElement('div', { className: 'post-stats' }, [
                createElement('span', {}, [`좋아요 ${formatCount(likes)}`]),
                createElement('span', {}, [`댓글 ${formatCount(comments)}`]),
                createElement('span', {}, [`조회수 ${formatCount(views)}`])
            ]),
            
            // Divider
            createElement('div', { className: 'post-divider' }),
            
            // Author: Profile Img & Nickname
            createElement('div', { className: 'post-author' }, [
                createElement('div', { 
                    className: 'author-profile-img',
                    style: { 
                        backgroundImage: `url('${profileImgUrl}')`,
                        backgroundSize: 'cover'
                    }
                }),
                createElement('span', { className: 'author-nickname' }, [nickname])
            ])
        ]);

        if (onClick) {
            card.addEventListener('click', () => onClick(post.post_id));
        }

        return card;
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
        container.innerHTML = ''; // 기존 내용 제거
        container.appendChild(
            createElement('div', { className: 'empty-state' }, [
                createElement('p', {}, ['등록된 게시글이 없습니다.'])
            ])
        );
    }
}

export default PostListView;
