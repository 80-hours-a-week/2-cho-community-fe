// js/views/CommentListView.js
// 댓글 목록 렌더링 관련 로직

import { formatDate, escapeCssUrl } from '../utils/formatters.js';
import { getImageUrl } from './helpers.js';
import { createElement } from '../utils/dom.js';

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
        const isOwner = currentUserId && currentUserId === comment.author.user_id;
        const profileImgUrl = getImageUrl(comment.author.profileImageUrl);
        const nickname = comment.author.nickname;
        const content = comment.content;
        const dateStr = formatDate(new Date(comment.created_at));

        // 자식 요소들 미리 생성
        const children = [
            // 프로필 이미지
            createElement('div', { 
                className: 'comment-author-img',
                style: { 
                    backgroundImage: `url('${escapeCssUrl(profileImgUrl)}')`,
                    backgroundSize: 'cover'
                }
            }),
            // 콘텐츠 래퍼
            createElement('div', { className: 'comment-content-wrapper' }, [
                // 헤더
                createElement('div', { className: 'comment-header' }, [
                    createElement('span', { className: 'comment-author-name' }, [nickname]),
                    createElement('span', { className: 'comment-date' }, [dateStr]),
                    // 버튼 그룹 (본인인 경우에만 추가)
                    ...(isOwner ? [
                        createElement('div', { className: 'comment-actions' }, [
                            createElement('button', { 
                                className: 'small-btn edit-cmt-btn',
                                dataset: { id: comment.comment_id },
                                onClick: () => handlers.onEdit(comment)
                            }, ['수정']),
                            createElement('button', { 
                                className: 'small-btn delete-cmt-btn',
                                dataset: { id: comment.comment_id },
                                onClick: () => handlers.onDelete(comment.comment_id)
                            }, ['삭제'])
                        ])
                    ] : [])
                ]),
                // 댓글 내용
                createElement('p', { className: 'comment-text' }, [content])
            ])
        ];

        return createElement('li', { className: 'comment-item' }, children);
    }

    /**
     * 댓글 목록 렌더링
     * @param {HTMLElement} container - 목록 컨테이너
     * @param {Array} comments - 댓글 배열
     * @param {string|number|null} currentUserId - 현재 로그인한 사용자 ID
     * @param {object} handlers - 이벤트 핸들러 객체
     */
    static renderComments(container, comments, currentUserId, handlers) {
        container.textContent = '';
        
        const fragment = document.createDocumentFragment();
        comments.forEach(comment => {
            const element = CommentListView.createCommentElement(comment, currentUserId, handlers);
            fragment.appendChild(element);
        });
        
        container.appendChild(fragment);
    }
}

export default CommentListView;
