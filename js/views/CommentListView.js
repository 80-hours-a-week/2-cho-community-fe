// js/views/CommentListView.js
// 댓글 목록 렌더링 관련 로직 (트리 구조 지원)

import { formatDate, escapeCssUrl } from '../utils/formatters.js';
import { getImageUrl } from './helpers.js';
import { createElement } from '../utils/dom.js';
import { resolveNavPath } from '../config.js';
import { NAV_PATHS } from '../constants.js';
import { renderMarkdown } from '../utils/markdown.js';
import { highlightMentions } from '../utils/mention.js';
import { createDistroBadge } from '../utils/distro.js';

/**
 * 댓글 목록 View 클래스
 */
class CommentListView {
    /**
     * 댓글 요소 생성
     * @param {object} comment - 댓글 데이터
     * @param {string|number|null} currentUserId - 현재 로그인한 사용자 ID
     * @param {object} handlers - 이벤트 핸들러 객체
     * @param {boolean} isReply - 대댓글 여부
     * @param {boolean} isAdmin - 관리자 여부
     * @returns {HTMLElement} - 댓글 요소
     */
    static createCommentElement(comment, currentUserId, handlers, isReply = false, isAdmin = false) {
        const isOwner = currentUserId && !comment.is_deleted &&
            comment.author && currentUserId === comment.author.user_id;

        // 삭제된 댓글 플레이스홀더
        if (comment.is_deleted) {
            return createElement('li', {
                className: `comment-item ${isReply ? 'comment-reply' : ''}`
            }, [
                createElement('div', { className: 'comment-deleted' }, [
                    createElement('p', { className: 'comment-deleted-text' }, ['삭제된 댓글입니다.'])
                ])
            ]);
        }

        const profileImgUrl = getImageUrl(comment.author.profileImageUrl);
        const nickname = comment.author.nickname;
        const content = comment.content;
        const dateStr = formatDate(new Date(comment.created_at));
        const isEdited = comment.updated_at && comment.updated_at !== comment.created_at;

        const actionButtons = [];

        // 답글 버튼 (루트 댓글에만, 로그인 시에만)
        if (!isReply && currentUserId) {
            actionButtons.push(
                createElement('button', {
                    className: 'small-btn reply-btn',
                    onClick: () => handlers.onReply(comment),
                }, ['답글'])
            );
        }

        // 수정/삭제 (본인 또는 관리자)
        if (isOwner) {
            actionButtons.push(
                createElement('button', {
                    className: 'small-btn edit-cmt-btn',
                    onClick: () => handlers.onEdit(comment),
                }, ['수정']),
                createElement('button', {
                    className: 'small-btn delete-cmt-btn',
                    onClick: () => handlers.onDelete(comment.comment_id),
                }, ['삭제'])
            );
        } else if (isAdmin && !comment.is_deleted) {
            // 관리자: 삭제만 (수정 권한 없음)
            actionButtons.push(
                createElement('button', {
                    className: 'small-btn delete-cmt-btn',
                    onClick: () => handlers.onDelete(comment.comment_id),
                }, ['삭제'])
            );
        }

        // 신고 버튼 (본인 댓글 제외, 로그인 시에만)
        if (currentUserId && !isOwner && !comment.is_deleted && handlers.onReport) {
            actionButtons.push(
                createElement('button', {
                    className: 'small-btn report-btn',
                    onClick: () => handlers.onReport(comment),
                }, ['신고'])
            );
        }

        // 댓글 좋아요 버튼
        const likeBtn = currentUserId && !comment.is_deleted
            ? createElement('button', {
                className: `comment-like-btn${comment.is_liked ? ' active' : ''}`,
                dataset: { commentId: String(comment.comment_id) },
                onClick: (e) => {
                    e.stopPropagation();
                    if (handlers.onLike) handlers.onLike(comment);
                },
            }, [
                createElement('span', { className: 'like-icon' }, [comment.is_liked ? '♥' : '♡']),
                createElement('span', { className: 'like-count' }, [
                    String(comment.likes_count || 0)
                ]),
            ])
            : null;

        const children = [
            createElement('div', {
                className: 'comment-author-img',
                style: {
                    backgroundImage: `url('${escapeCssUrl(profileImgUrl)}')`,
                    backgroundSize: 'cover',
                },
            }),
            createElement('div', { className: 'comment-content-wrapper' }, [
                (() => {
                    const headerChildren = [
                        createElement('span', {
                            className: `comment-author-name${comment.author?.user_id ? ' clickable-nickname' : ''}`,
                            ...(comment.author?.user_id ? {
                                onClick: (e) => {
                                    e.stopPropagation();
                                    location.href = resolveNavPath(NAV_PATHS.USER_PROFILE(comment.author.user_id));
                                },
                            } : {}),
                        }, [nickname]),
                    ];
                    const commentDistroBadge = createDistroBadge(comment.author?.distro, 'small');
                    if (commentDistroBadge) headerChildren.push(commentDistroBadge);
                    headerChildren.push(
                        createElement('span', { className: 'comment-date' }, [
                            dateStr,
                            ...(isEdited ? [createElement('span', {
                                className: 'comment-edited-badge',
                                title: `수정일: ${formatDate(new Date(comment.updated_at))}`,
                            }, ['(수정됨)'])] : []),
                        ]),
                    );
                    if (actionButtons.length > 0) {
                        headerChildren.push(
                            createElement('div', { className: 'comment-actions' }, actionButtons)
                        );
                    }
                    return createElement('div', { className: 'comment-header' }, headerChildren);
                })(),
                CommentListView._createCommentText(content),
                ...(likeBtn ? [likeBtn] : []),
            ]),
        ];

        return createElement('li', {
            className: `comment-item ${isReply ? 'comment-reply' : ''}`
        }, children);
    }

    /**
     * 댓글 텍스트 요소 생성 (마크다운 렌더링 — DOMPurify sanitized)
     * @param {string} content - 댓글 내용
     * @returns {HTMLElement}
     * @private
     */
    static _createCommentText(content) {
        const el = document.createElement('div');
        el.className = 'comment-text markdown-body markdown-body--compact';
        // renderMarkdown()은 DOMPurify sanitization을 거친 안전한 HTML 반환
        const sanitized = renderMarkdown(content);
        const tpl = document.createElement('template');
        tpl.innerHTML = sanitized; // DOMPurify-sanitized HTML — XSS safe
        el.appendChild(tpl.content);
        highlightMentions(el);
        return el;
    }

    /**
     * 댓글 목록을 트리 구조로 렌더링
     * 댓글 좋아요 낙관적 UI 토글
     * @param {string|number} commentId - 댓글 ID
     */
    static toggleLikeOptimistic(commentId) {
        const btn = document.querySelector(
            `.comment-like-btn[data-comment-id="${commentId}"]`
        );
        if (!btn) return;

        const isActive = btn.classList.toggle('active');
        const iconEl = btn.querySelector('.like-icon');
        const countEl = btn.querySelector('.like-count');

        if (iconEl) iconEl.textContent = isActive ? '♥' : '♡';
        if (countEl) {
            const current = parseInt(countEl.textContent, 10) || 0;
            countEl.textContent = String(isActive ? current + 1 : Math.max(0, current - 1));
        }
    }

    /**
     * @param {HTMLElement} container - 목록 컨테이너
     * @param {Array} comments - 트리 구조 댓글 배열 (각 항목에 replies 포함)
     * @param {string|number|null} currentUserId - 현재 로그인한 사용자 ID
     * @param {object} handlers - 이벤트 핸들러 객체
     * @param {boolean} [isAdmin=false] - 관리자 여부
     */
    static renderComments(container, comments, currentUserId, handlers, isAdmin = false, currentSort = 'oldest') {
        container.textContent = '';

        const fragment = document.createDocumentFragment();

        // 정렬 바
        const sortBar = createElement('div', { className: 'comment-sort-bar' }, [
            createElement('button', {
                className: `comment-sort-btn${currentSort === 'oldest' ? ' active' : ''}`,
                dataset: { sort: 'oldest' },
            }, ['오래된순']),
            createElement('button', {
                className: `comment-sort-btn${currentSort === 'latest' ? ' active' : ''}`,
                dataset: { sort: 'latest' },
            }, ['최신순']),
            createElement('button', {
                className: `comment-sort-btn${currentSort === 'popular' ? ' active' : ''}`,
                dataset: { sort: 'popular' },
            }, ['인기순']),
        ]);
        fragment.appendChild(sortBar);

        comments.forEach(comment => {
            // 루트 댓글
            const element = CommentListView.createCommentElement(
                comment, currentUserId, handlers, false, isAdmin
            );
            fragment.appendChild(element);

            // 대댓글
            if (comment.replies && comment.replies.length > 0) {
                comment.replies.forEach(reply => {
                    const replyEl = CommentListView.createCommentElement(
                        reply, currentUserId, handlers, true, isAdmin
                    );
                    fragment.appendChild(replyEl);
                });
            }
        });

        container.appendChild(fragment);
    }
}

export default CommentListView;
