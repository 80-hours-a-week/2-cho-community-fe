// js/views/DMDetailView.js
// DM 대화 상세 DOM 렌더링 (View 전용)

import { createElement, clearElement } from '../utils/dom.js';
import { getImageUrl } from './helpers.js';
import { escapeCssUrl } from '../utils/formatters.js';
import { renderMarkdownTo } from '../utils/markdown.js';

/**
 * DM 대화 상세 View
 */
class DMDetailView {
    /**
     * 상대방 사용자 정보를 헤더에 렌더링
     * @param {object} user - { nickname, profile_image_url }
     * @param {HTMLElement} container - #dm-other-user 요소
     */
    static renderOtherUser(user, container) {
        if (!container) return;
        clearElement(container);

        // 프로필 이미지 (32px 원형)
        const profileImg = createElement('div', {
            className: 'dm-card__avatar',
        });
        const imgUrl = user?.profile_image_url;
        if (imgUrl) {
            const fullUrl = escapeCssUrl(getImageUrl(imgUrl));
            profileImg.style.backgroundImage = `url('${fullUrl}')`;
        }

        // 닉네임
        const nickname = createElement('span', {
            className: 'dm-card__name',
            textContent: user?.nickname || '탈퇴한 사용자',
        });

        container.appendChild(profileImg);
        container.appendChild(nickname);
    }

    /**
     * 메시지 목록 전체 렌더링
     * @param {Array} messages - 메시지 데이터 배열
     * @param {number} currentUserId - 현재 로그인 사용자 ID
     * @param {HTMLElement} container - #dm-messages 요소
     */
    static renderMessages(messages, currentUserId, container) {
        if (!container) return;
        clearElement(container);

        if (!messages || messages.length === 0) {
            const empty = createElement('div', {
                className: 'dm-messages-empty',
                textContent: '아직 메시지가 없습니다. 첫 메시지를 보내보세요!',
            });
            container.appendChild(empty);
            return;
        }

        messages.forEach(msg => {
            const el = DMDetailView._createMessageElement(msg, currentUserId);
            container.appendChild(el);
        });
    }

    /**
     * 단일 메시지 DOM 요소 생성
     * @param {object} msg - 메시지 데이터
     * @param {number} currentUserId - 현재 로그인 사용자 ID
     * @returns {HTMLElement}
     * @private
     */
    static _createMessageElement(msg, currentUserId) {
        const isMine = msg.sender_id === currentUserId;
        const wrapper = createElement('div', {
            className: `dm-msg ${isMine ? 'dm-msg--mine' : 'dm-msg--other'}`,
        });

        // 상대방 메시지는 프로필 이미지 표시
        if (!isMine) {
            const profileImg = createElement('div', {
                className: 'dm-card__avatar',
            });
            const imgUrl = msg.sender_profile_image;
            if (imgUrl) {
                const fullUrl = escapeCssUrl(getImageUrl(imgUrl));
                profileImg.style.backgroundImage = `url('${fullUrl}')`;
            }
            wrapper.appendChild(profileImg);
        }

        // 메시지 본체 (내용 + 시간)
        const body = createElement('div', { className: 'dm-msg__body' });

        // 내용: 마크다운 렌더링 (DOMPurify sanitized)
        const content = createElement('div', {
            className: 'dm-msg__content markdown-body markdown-body--compact',
        });
        renderMarkdownTo(content, msg.content || '');
        body.appendChild(content);

        // 시간 스탬프
        const time = createElement('span', {
            className: 'dm-msg__time',
            textContent: DMDetailView.formatTime(msg.created_at),
        });
        body.appendChild(time);

        wrapper.appendChild(body);
        return wrapper;
    }

    /**
     * 단일 메시지를 컨테이너 끝에 추가 (실시간 업데이트)
     * @param {object} msg - 메시지 데이터
     * @param {number} currentUserId - 현재 로그인 사용자 ID
     * @param {HTMLElement} container - #dm-messages 요소
     */
    static appendMessage(msg, currentUserId, container) {
        if (!container) return;

        // 빈 상태 메시지 제거
        const emptyEl = container.querySelector('.dm-messages-empty');
        if (emptyEl) emptyEl.remove();

        const el = DMDetailView._createMessageElement(msg, currentUserId);
        container.appendChild(el);
        DMDetailView.scrollToBottom(container);
    }

    /**
     * 컨테이너를 맨 아래로 스크롤
     * @param {HTMLElement} container
     */
    static scrollToBottom(container) {
        if (!container) return;
        container.scrollTop = container.scrollHeight;
    }

    /**
     * 상대적 시간 포맷터
     * @param {string} dateString - ISO 날짜 문자열
     * @returns {string} - 포맷된 시간 문자열
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

export default DMDetailView;
