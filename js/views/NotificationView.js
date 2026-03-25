// js/views/NotificationView.js
// 알림 DOM 렌더링 (View 전용)

import { createElement } from '../utils/dom.js';
import { formatDate } from '../utils/formatters.js';

/**
 * 알림 관련 View
 */
class NotificationView {
    /**
     * 단일 알림 항목 DOM 생성
     * @param {object} notification - 알림 데이터
     * @returns {HTMLElement} - 알림 li 요소
     */
    static createNotificationItem(notification) {
        const li = createElement('li', {
            className: `notification-item ${notification.is_read ? '' : 'unread'}`,
            dataset: { id: notification.notification_id },
        });

        const content = createElement('div', { className: 'notification-content' });

        const actorName = notification.actor?.nickname || '탈퇴한 사용자';
        const typeTextMap = {
            comment: '댓글을 남겼습니다',
            like: '좋아요를 눌렀습니다',
            mention: '회원님을 언급했습니다',
            follow: '새 게시글을 작성했습니다',
            reply: '구독 중인 게시글에 댓글을 남겼습니다',
        };
        const typeText = typeTextMap[notification.type] || '알림이 있습니다';

        const message = createElement('p', { className: 'notification-message' });
        const actorSpan = createElement('strong', { textContent: actorName });
        message.appendChild(actorSpan);

        message.appendChild(document.createTextNode('님이 '));

        if (notification.post_title) {
            const titleSpan = createElement('span', {
                className: 'notification-post-title',
                textContent: notification.post_title,
            });
            message.appendChild(titleSpan);
            message.appendChild(document.createTextNode(` — ${typeText}.`));
        } else {
            message.appendChild(document.createTextNode(`${typeText}.`));
        }

        const time = createElement('span', {
            className: 'notification-time',
            textContent: formatDate(new Date(notification.created_at)),
        });

        content.appendChild(message);
        content.appendChild(time);

        const deleteBtn = createElement('button', {
            className: 'notification-delete-btn',
            textContent: '삭제',
        });

        li.appendChild(content);
        li.appendChild(deleteBtn);

        return li;
    }

}

export default NotificationView;
