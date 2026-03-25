// js/views/PostDetailView.js
// 게시글 상세 렌더링 관련 로직

import { formatDate, formatCount, escapeCssUrl } from '../utils/formatters.js';
import { getImageUrl, handleImageError, showToast } from './helpers.js';
import { resolveNavPath } from '../config.js';
import { NAV_PATHS, CATEGORY_LABELS } from '../constants.js';
import { renderMarkdownTo } from '../utils/markdown.js';
import { createElement } from '../utils/dom.js';
import { highlightMentions } from '../utils/mention.js';
import { Icons } from '../utils/icons.js';
import { createDistroBadge } from '../utils/distro.js';

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

        // 태그 표시
        const tagsContainer = document.getElementById('post-tags');
        if (tagsContainer) {
            tagsContainer.textContent = '';
            if (post.tags && post.tags.length > 0) {
                post.tags.forEach(tag => {
                    const badge = createElement('span', {
                        className: 'tag-badge',
                        onClick: () => {
                            location.href = resolveNavPath(`${NAV_PATHS.MAIN}?tag=${encodeURIComponent(tag.name)}`);
                        },
                    }, [`#${tag.name}`]);
                    tagsContainer.appendChild(badge);
                });
            }
        }

        // 제목
        const titleEl = document.getElementById('post-title');
        if (titleEl) titleEl.innerText = post.title;

        // 본문 (마크다운 렌더링 — DOMPurify sanitized)
        const contentEl = document.getElementById('post-content');
        if (contentEl) {
            renderMarkdownTo(contentEl, post.content);
            highlightMentions(contentEl);
        }

        // 투표 렌더링 (기존 투표 UI 제거 후 재생성)
        const existingPoll = document.getElementById('poll-container');
        if (existingPoll) existingPoll.remove();

        if (post.poll) {
            const pollEl = PostDetailView.renderPoll(post.poll, post.post_id);
            const postBody = document.querySelector('.post-body');
            if (postBody && pollEl) {
                postBody.appendChild(pollEl);
            }
        }

        // 작성자
        const authorNickname = document.getElementById('post-author-nickname');
        if (authorNickname) authorNickname.innerText = post.author.nickname;

        // 배포판 뱃지 표시
        const distroBadge = createDistroBadge(post.author?.distro, 'normal');
        if (distroBadge && authorNickname?.parentElement) {
            // 기존 뱃지 제거 (중복 방지)
            authorNickname.parentElement.querySelectorAll('.distro-badge').forEach(el => el.remove());
            authorNickname.parentElement.insertBefore(distroBadge, authorNickname.nextSibling);
        }

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
            handleImageError(img);
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
     * 투표 UI 렌더링
     * @param {object} poll - 투표 데이터
     * @param {string|number} postId - 게시글 ID
     * @returns {HTMLElement} - 투표 컨테이너 DOM
     */
    static renderPoll(poll, postId) {
        const container = createElement('div', { className: 'poll-container', id: 'poll-container' });

        // 질문
        const question = createElement('div', { className: 'poll-question' }, [poll.question]);
        container.appendChild(question);

        const showResults = (poll.my_vote !== null && poll.my_vote !== undefined) || poll.is_expired;

        if (showResults) {
            // 결과 보기 모드 (투표 완료 또는 만료)
            const optionsList = createElement('div', { className: 'poll-options-results' });

            poll.options.forEach(opt => {
                const pct = poll.total_votes > 0
                    ? Math.round((opt.vote_count / poll.total_votes) * 100)
                    : 0;

                const isVoted = poll.my_vote === opt.option_id;

                const optionRow = createElement('div', {
                    className: isVoted ? 'poll-option voted' : 'poll-option',
                });

                // 배경 바 (퍼센트 너비)
                const bar = createElement('div', {
                    className: 'poll-bar',
                    style: { width: `${pct}%` },
                });
                optionRow.appendChild(bar);

                // 옵션 텍스트
                const label = createElement('span', { className: 'poll-option-label' }, [opt.option_text]);
                optionRow.appendChild(label);

                // 퍼센트 + 투표 수
                const stats = createElement('span', { className: 'poll-option-stats' }, [
                    `${pct}% (${opt.vote_count})`,
                ]);
                optionRow.appendChild(stats);

                optionsList.appendChild(optionRow);
            });

            container.appendChild(optionsList);

            // 투표 완료 + 미만료: 변경/취소 버튼 표시
            if (poll.my_vote !== null && poll.my_vote !== undefined && !poll.is_expired) {
                const actionRow = createElement('div', { className: 'poll-vote-actions' });

                const changeBtn = createElement('button', {
                    className: 'poll-change-btn',
                    id: 'poll-change-btn',
                    dataset: { postId: String(postId) },
                }, ['투표 변경']);
                actionRow.appendChild(changeBtn);

                const cancelBtn = createElement('button', {
                    className: 'poll-cancel-btn',
                    id: 'poll-cancel-btn',
                    dataset: { postId: String(postId) },
                }, ['투표 취소']);
                actionRow.appendChild(cancelBtn);

                container.appendChild(actionRow);
            }
        } else {
            // 투표 모드 (라디오 버튼)
            const form = createElement('div', { className: 'poll-vote-form', id: 'poll-vote-form' });

            poll.options.forEach(opt => {
                const radioId = `poll-opt-${opt.option_id}`;
                const row = createElement('label', {
                    className: 'poll-vote-option',
                    for: radioId,
                }, [
                    createElement('input', {
                        type: 'radio',
                        name: 'poll-vote',
                        id: radioId,
                        value: String(opt.option_id),
                    }),
                    createElement('span', {}, [opt.option_text]),
                ]);
                form.appendChild(row);
            });

            container.appendChild(form);

            // 투표 버튼
            const voteBtn = createElement('button', {
                className: 'poll-vote-btn',
                id: 'poll-vote-btn',
                dataset: { postId: String(postId) },
            }, ['투표']);
            container.appendChild(voteBtn);
        }

        // 하단 정보 (총 투표 수 + 만료 정보)
        const infoItems = [`${poll.total_votes}명 참여`];

        if (poll.expires_at) {
            if (poll.is_expired) {
                infoItems.push('투표 마감');
            } else {
                const expiryDate = formatDate(new Date(poll.expires_at));
                infoItems.push(`${expiryDate} 마감`);
            }
        }

        const totalInfo = createElement('div', { className: 'poll-total' }, [infoItems.join(' · ')]);
        container.appendChild(totalInfo);

        return container;
    }

    /**
     * 연관 게시글 렌더링
     * @param {Array} posts - 연관 게시글 배열
     */
    static renderRelatedPosts(posts) {
        const section = document.getElementById('related-posts-section');
        const listEl = document.getElementById('related-posts-list');

        if (!section || !listEl) return;

        if (!posts || posts.length === 0) {
            section.classList.add('hidden');
            return;
        }

        listEl.textContent = '';

        posts.forEach(post => {
            const titleSpan = createElement('span', {
                className: 'related-post-title',
            }, [post.title]);

            const metaSpan = createElement('span', {
                className: 'related-post-meta',
            }, [`좋아요 ${post.likes_count || 0} · 댓글 ${post.comments_count || 0}`]);

            const children = [titleSpan, metaSpan];

            // 태그 칩 (최대 3개)
            if (post.tags && post.tags.length > 0) {
                const tagsSpan = createElement('span', { className: 'related-post-tags' });
                post.tags.slice(0, 3).forEach(tag => {
                    const tagName = typeof tag === 'string' ? tag : tag.name;
                    const chip = createElement('span', {
                        className: 'tag-badge-sm',
                    }, [`#${tagName}`]);
                    tagsSpan.appendChild(chip);
                });
                children.push(tagsSpan);
            }

            const card = createElement('a', {
                className: 'related-post-card',
                href: resolveNavPath(NAV_PATHS.DETAIL(post.post_id)),
            }, children);

            listEl.appendChild(card);
        });

        section.classList.remove('hidden');
    }

    /**
     * 구독 버튼 상태 업데이트
     * @param {string} level - 구독 레벨 ('normal' | 'watching' | 'muted')
     */
    static updateSubscriptionState(level) {
        const btn = document.getElementById('subscription-btn');
        if (!btn) return;
        const iconEl = btn.querySelector('.subscription-icon');
        const textEl = btn.querySelector('.subscription-text');
        // 클래스 초기화 후 현재 상태 적용
        btn.classList.remove('watching', 'muted');
        // Lucide SVG 아이콘 교체
        if (iconEl) {
            iconEl.textContent = '';
            if (level === 'watching') {
                iconEl.appendChild(Icons.bellRing(16));
            } else if (level === 'muted') {
                iconEl.appendChild(Icons.bellOff(16));
            } else {
                iconEl.appendChild(Icons.bell(16));
            }
        }
        if (level === 'watching') {
            btn.classList.add('watching');
            if (textEl) textEl.textContent = '구독 중';
        } else if (level === 'muted') {
            btn.classList.add('muted');
            if (textEl) textEl.textContent = '음소거';
        } else {
            if (textEl) textEl.textContent = '구독';
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
