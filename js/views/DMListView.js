// js/views/DMListView.js
// DM 대화 목록 DOM 렌더링 (View 전용)

import { createElement, clearElement } from '../utils/dom.js';
import { getImageUrl } from './helpers.js';
import { escapeCssUrl } from '../utils/formatters.js';
import { resolveNavPath } from '../config.js';
import { NAV_PATHS } from '../constants.js';

/**
 * DM 대화 목록 View
 */
class DMListView {
    /**
     * 대화 목록을 컨테이너에 렌더링
     * @param {Array} conversations - 대화 목록 데이터
     * @param {HTMLElement} container - 렌더링 대상 컨테이너
     */
    static renderConversations(conversations, container) {
        if (!container) return;

        conversations.forEach(conv => {
            const card = DMListView.createConversationCard(conv);
            container.appendChild(card);
        });
    }

    /**
     * 단일 대화 카드 DOM 생성
     * @param {object} conv - 대화 데이터
     * @returns {HTMLElement} - 대화 카드 요소
     */
    static createConversationCard(conv) {
        const convId = conv.id || conv.conversation_id;
        const card = createElement('div', {
            className: `dm-card${conv.unread_count > 0 ? ' unread' : ''}`,
            dataset: { id: convId },
        });

        // 프로필 이미지
        const profileImg = createElement('div', {
            className: 'dm-card__avatar',
        });
        const imgUrl = conv.other_user?.profile_image_url;
        if (imgUrl) {
            const fullUrl = escapeCssUrl(getImageUrl(imgUrl));
            profileImg.style.backgroundImage = `url('${fullUrl}')`;
        }

        // 대화 정보 영역
        const content = createElement('div', { className: 'dm-card__content' });

        // 닉네임
        const nickname = createElement('span', {
            className: 'dm-card__name',
            textContent: conv.other_user?.nickname || '탈퇴한 사용자',
        });
        content.appendChild(nickname);

        // 마지막 메시지 미리보기
        const lastMsgText = typeof conv.last_message === 'object'
            ? conv.last_message?.content || '새 대화'
            : conv.last_message || '새 대화';
        const preview = createElement('span', {
            className: 'dm-card__preview',
            textContent: lastMsgText,
        });
        content.appendChild(preview);

        // 메타 영역: 시간 + 읽지 않은 수
        const meta = createElement('div', { className: 'dm-card__meta' });

        const time = createElement('span', {
            className: 'dm-card__time',
            textContent: conv.last_message_at
                ? DMListView.formatTime(conv.last_message_at)
                : '',
        });
        meta.appendChild(time);

        if (conv.unread_count > 0) {
            const badge = createElement('span', {
                className: 'dm-unread-badge',
                textContent: conv.unread_count > 99 ? '99+' : String(conv.unread_count),
            });
            meta.appendChild(badge);
        }

        card.appendChild(profileImg);
        card.appendChild(content);
        card.appendChild(meta);

        // 클릭 시 대화 상세로 이동
        card.addEventListener('click', () => {
            location.href = resolveNavPath(NAV_PATHS.DM_DETAIL(convId));
        });

        return card;
    }

    /**
     * 빈 상태 표시
     * @param {HTMLElement} container - 빈 상태를 표시할 컨테이너
     */
    static showEmpty(container) {
        if (!container) return;
        container.classList.remove('hidden');
    }

    /**
     * 빈 상태 숨기기
     * @param {HTMLElement} container - 빈 상태 컨테이너
     */
    static hideEmpty(container) {
        if (!container) return;
        container.classList.add('hidden');
    }

    /**
     * 상대적 시간 포맷터
     * @param {string} dateString - ISO 날짜 문자열
     * @returns {string} - 상대 시간 (방금 전, N분 전, N시간 전, N일 전 등)
     */
    static formatTime(dateString) {
        if (!dateString) return '';

        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';

        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffSec < 60) return '방금 전';
        if (diffMin < 60) return `${diffMin}분 전`;
        if (diffHour < 24) return `${diffHour}시간 전`;
        if (diffDay < 7) return `${diffDay}일 전`;

        // 7일 이상은 날짜 표시
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${mm}/${dd}`;
    }
}

export default DMListView;
