// js/views/PostDetailView.js
// 게시글 상세 렌더링 관련 로직

import { formatDate, formatCount, escapeCssUrl } from '../utils/formatters.js';
import { getImageUrl, showToast } from './helpers.js';
import { resolveNavPath } from '../config.js';
import { NAV_PATHS, CATEGORY_LABELS } from '../constants.js';
import { renderMarkdownTo } from '../utils/markdown.js';

/**
 * 게시글 상세 View 클래스
 */
class PostDetailView {
    /**
     * 게시글 상세 정보 렌더링
     * @param {object} post - 게시글 데이터
     */
    static renderPost(post) {
        // 카테고리 + 고정 배지
        const badgeArea = document.getElementById('post-badges');
        if (badgeArea) {
            badgeArea.textContent = '';
            if (post.is_pinned) {
                const pinBadge = document.createElement('span');
                pinBadge.className = 'pin-badge';
                pinBadge.textContent = '고정';
                badgeArea.appendChild(pinBadge);
            }
            if (post.category_id) {
                const catBadge = document.createElement('span');
                catBadge.className = 'category-badge';
                catBadge.textContent = post.category_name || CATEGORY_LABELS[post.category_id] || '';
                badgeArea.appendChild(catBadge);
            }
        }

        // 제목
        const titleEl = document.getElementById('post-title');
        if (titleEl) titleEl.innerText = post.title;

        // 본문 (마크다운 렌더링 — DOMPurify sanitized)
        const contentEl = document.getElementById('post-content');
        if (contentEl) renderMarkdownTo(contentEl, post.content);

        // 작성자
        const authorNickname = document.getElementById('post-author-nickname');
        if (authorNickname) authorNickname.innerText = post.author.nickname;

        // 닉네임 클릭 시 사용자 프로필로 이동
        if (authorNickname && post.author?.user_id) {
            authorNickname.classList.add('clickable-nickname');
            authorNickname.addEventListener('click', () => {
                location.href = resolveNavPath(NAV_PATHS.USER_PROFILE(post.author.user_id));
            });
        }

        const authorImg = document.getElementById('post-author-img');
        if (authorImg) {
            const profileUrl = escapeCssUrl(getImageUrl(post.author.profileImageUrl));
            authorImg.style.backgroundImage = `url('${profileUrl}')`;
            authorImg.style.backgroundSize = 'cover';
        }

        // 날짜
        const dateEl = document.getElementById('post-date');
        if (dateEl) {
            const dateText = formatDate(new Date(post.created_at));
            dateEl.innerText = dateText;

            if (post.updated_at && post.updated_at !== post.created_at) {
                const editBadge = document.createElement('span');
                editBadge.className = 'post-edited-badge';
                editBadge.textContent = '(수정됨)';
                editBadge.title = `수정일: ${formatDate(new Date(post.updated_at))}`;
                dateEl.appendChild(editBadge);
            }
        }

        // 이미지 (다중 이미지 우선, 단일 이미지 폴백)
        const imageUrls = post.image_urls || (post.image_url ? [post.image_url] : []);
        if (imageUrls.length > 0) {
            PostDetailView.renderImageGallery(imageUrls);
        } else {
            const imgEl = document.getElementById('post-image');
            if (imgEl) imgEl.classList.add('hidden');
        }

        // 통계
        const likeCount = document.getElementById('like-count');
        if (likeCount) likeCount.innerText = formatCount(post.likes_count);

        const bookmarkCount = document.getElementById('bookmark-count');
        if (bookmarkCount) bookmarkCount.innerText = formatCount(post.bookmarks_count || 0);

        const viewCount = document.getElementById('view-count');
        if (viewCount) viewCount.innerText = formatCount(post.views_count);

        const commentCount = document.getElementById('comment-count');
        if (commentCount) commentCount.innerText = formatCount(post.comments_count);

        // 좋아요 상태
        const likeBox = document.getElementById('like-box');
        if (likeBox && post.is_liked) {
            likeBox.classList.add('active');
        }

        // 북마크 상태
        const bookmarkBox = document.getElementById('bookmark-box');
        if (bookmarkBox && post.is_bookmarked) {
            bookmarkBox.classList.add('active');
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
     * 작성자/관리자 액션 버튼 표시/숨기기
     * @param {boolean} isOwner - 작성자 여부
     * @param {boolean} [isAdmin=false] - 관리자 여부
     */
    static toggleActionButtons(isOwner, isAdmin = false) {
        const actionsDiv = document.getElementById('post-actions');
        if (!actionsDiv) return;

        const editBtn = document.getElementById('edit-post-btn');
        const deleteBtn = document.getElementById('delete-post-btn');

        if (isOwner) {
            // 작성자: 수정 + 삭제
            actionsDiv.style.display = 'flex';
            if (editBtn) editBtn.style.display = '';
            if (deleteBtn) deleteBtn.style.display = '';
        } else if (isAdmin) {
            // 관리자: 삭제만 (수정 권한 없음)
            actionsDiv.style.display = 'flex';
            if (editBtn) editBtn.style.display = 'none';
            if (deleteBtn) deleteBtn.style.display = '';
        } else {
            actionsDiv.style.display = 'none';
        }
    }

    /**
     * 신고 버튼 표시/숨기기
     * @param {boolean} show - 표시 여부
     */
    static toggleReportButton(show) {
        const reportBtn = document.getElementById('report-post-btn');
        if (reportBtn) {
            reportBtn.style.display = show ? '' : 'none';
        }
    }

    /**
     * 고정/해제 버튼 표시/숨기기
     * @param {boolean} show - 표시 여부
     * @param {boolean} isPinned - 현재 고정 상태
     */
    static togglePinButton(show, isPinned) {
        const pinBtn = document.getElementById('pin-post-btn');
        if (pinBtn) {
            pinBtn.style.display = show ? '' : 'none';
            pinBtn.textContent = isPinned ? '고정 해제' : '고정';
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
            button.style.backgroundColor = 'var(--color-primary-hover)';
        } else {
            button.style.backgroundColor = 'var(--color-primary)';
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
            button.style.backgroundColor = 'var(--color-primary)';
        }
    }
    /**
     * 북마크 상태 업데이트
     * @param {boolean} isBookmarked - 북마크 여부
     * @param {number} count - 북마크 수
     */
    static updateBookmarkState(isBookmarked, count) {
        const bookmarkBox = document.getElementById('bookmark-box');
        const countEl = document.getElementById('bookmark-count');

        if (bookmarkBox) {
            if (isBookmarked) {
                bookmarkBox.classList.add('active');
            } else {
                bookmarkBox.classList.remove('active');
            }
        }

        if (countEl) {
            countEl.innerText = count;
        }
    }

    /**
     * 이미지 갤러리 렌더링
     * @param {string[]} imageUrls - 이미지 URL 배열
     */
    static renderImageGallery(imageUrls) {
        const gallery = document.getElementById('image-gallery');
        const singleImg = document.getElementById('post-image');

        // 단일 이미지 요소 숨기기
        if (singleImg) singleImg.classList.add('hidden');

        if (!gallery || imageUrls.length === 0) return;

        gallery.textContent = '';
        gallery.className = imageUrls.length === 1
            ? 'image-gallery single-image'
            : 'image-gallery multi-image';

        imageUrls.forEach(url => {
            const img = document.createElement('img');
            img.src = getImageUrl(url);
            img.alt = 'Post Image';
            img.loading = 'lazy';
            gallery.appendChild(img);
        });

        gallery.classList.remove('hidden');
    }

    /**
     * 차단 버튼 표시/숨기기
     * @param {boolean} show - 표시 여부
     * @param {boolean} isBlocked - 현재 차단 상태
     */
    static toggleBlockButton(show, isBlocked = false) {
        const blockBtn = document.getElementById('block-user-btn');
        if (blockBtn) {
            blockBtn.style.display = show ? '' : 'none';
            blockBtn.textContent = isBlocked ? '차단 해제' : '차단';
        }
    }

    /**
     * 토스트 메시지 표시
     * @param {string} message - 메세지
     */
    static showToast(message) {
        showToast(message);
    }
}

export default PostDetailView;
