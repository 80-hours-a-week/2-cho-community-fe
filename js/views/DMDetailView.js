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
                textContent: '$ echo "첫 메시지를 보내보세요"',
            });
            container.appendChild(empty);
            return;
        }

        let lastDate = null;
        messages.forEach(msg => {
            const msgDate = DMDetailView._getDateString(msg.created_at);
            if (msgDate && msgDate !== lastDate) {
                const divider = createElement('div', {
                    className: 'dm-date-divider',
                    textContent: DMDetailView._formatDateDivider(msg.created_at),
                });
                container.appendChild(divider);
                lastDate = msgDate;
            }
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
        wrapper.dataset.messageId = msg.id;

        // 터미널 프롬프트: [시간] 닉네임 >
        const timeStr = DMDetailView._formatInlineTime(msg.created_at);
        const nickname = isMine ? 'me' : (msg.sender_nickname || '?');
        const prompt = createElement('span', {
            className: 'dm-msg__prompt',
            textContent: `[${timeStr}] ${nickname} >`,
        });
        wrapper.appendChild(prompt);

        // 삭제된 메시지는 플레이스홀더만 표시
        if (msg.is_deleted) {
            wrapper.classList.add('dm-msg--deleted');
            const body = createElement('div', { className: 'dm-msg__body' });
            const content = createElement('div', {
                className: 'dm-msg__content',
                textContent: '[deleted]',
            });
            body.appendChild(content);
            wrapper.appendChild(body);
            return wrapper;
        }

        // 메시지 본체
        const body = createElement('div', { className: 'dm-msg__body' });

        // 내용: 마크다운 렌더링 (DOMPurify sanitized)
        const content = createElement('div', {
            className: 'dm-msg__content markdown-body markdown-body--compact',
        });
        renderMarkdownTo(content, msg.content || '');
        body.appendChild(content);

        wrapper.appendChild(body);

        // 내 메시지 읽음 상태 — 인라인 표시
        if (isMine) {
            const readStatus = createElement('span', {
                className: `dm-msg__read-status${msg.is_read ? ' dm-msg__read-status--read' : ''}`,
                textContent: msg.is_read ? '✓ read' : '✓',
            });
            wrapper.appendChild(readStatus);
        }
        return wrapper;
    }

    /**
     * 이전 메시지를 컨테이너 상단에 prepend (위로 스크롤 페이지네이션)
     * @param {Array} messages - 메시지 데이터 배열
     * @param {number} currentUserId - 현재 로그인 사용자 ID
     * @param {HTMLElement} container - #dm-messages 요소
     */
    static prependMessages(messages, currentUserId, container) {
        if (!container || !messages.length) return;
        const fragment = document.createDocumentFragment();
        let lastDate = null;
        messages.forEach(msg => {
            const msgDate = DMDetailView._getDateString(msg.created_at);
            if (msgDate && msgDate !== lastDate) {
                const divider = createElement('div', {
                    className: 'dm-date-divider',
                    textContent: DMDetailView._formatDateDivider(msg.created_at),
                });
                fragment.appendChild(divider);
                lastDate = msgDate;
            }
            fragment.appendChild(DMDetailView._createMessageElement(msg, currentUserId));
        });
        container.prepend(fragment);
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
     * 날짜 문자열 추출 (YYYY-MM-DD)
     * @param {string} dateString
     * @returns {string|null}
     * @private
     */
    static _getDateString(dateString) {
        if (!dateString) return null;
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return null;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    /**
     * 날짜 구분선 포맷 (YYYY년 M월 D일)
     * @param {string} dateString
     * @returns {string}
     * @private
     */
    static _formatDateDivider(dateString) {
        const d = new Date(dateString);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${d.getFullYear()}-${mm}-${dd}`;
    }

    /**
     * 타이핑 인디케이터 표시/숨김
     * @param {HTMLElement} container - #dm-typing 요소
     * @param {boolean} show
     * @param {string} [nickname] - 상대방 닉네임
     */
    static renderTypingIndicator(container, show, nickname) {
        if (!container) return;
        if (show) {
            clearElement(container);
            const text = createElement('span', {
                textContent: `${nickname || '상대방'} 입력 중`,
            });
            const dots = createElement('span', { className: 'dm-typing-dots' });
            for (let i = 0; i < 3; i++) {
                dots.appendChild(createElement('span', { className: 'dm-typing-dot' }));
            }
            container.appendChild(text);
            container.appendChild(dots);
        } else {
            clearElement(container);
        }
    }

    /**
     * 모든 내 메시지의 읽음 상태를 업데이트 (✓ → ✓✓)
     * @param {HTMLElement} container - #dm-messages 요소
     */
    static updateReadStatus(container) {
        if (!container) return;
        const statuses = container.querySelectorAll('.dm-msg--mine .dm-msg__read-status:not(.dm-msg__read-status--read)');
        statuses.forEach(el => {
            el.classList.add('dm-msg__read-status--read');
            el.textContent = '✓ read';
        });
    }

    /**
     * 메시지를 삭제 플레이스홀더로 교체
     * @param {number} messageId
     * @param {HTMLElement} container - #dm-messages 요소
     */
    static removeMessage(messageId, container) {
        if (!container) return;
        const msgEl = container.querySelector(`[data-message-id="${messageId}"]`);
        if (!msgEl) return;
        // 기존 내용을 삭제 플레이스홀더로 교체
        msgEl.classList.add('dm-msg--deleted');
        const body = msgEl.querySelector('.dm-msg__body');
        if (body) {
            clearElement(body);
            const content = createElement('div', {
                className: 'dm-msg__content',
                textContent: '삭제된 메시지입니다',
            });
            body.appendChild(content);
        }
    }

    /**
     * 컨텍스트 메뉴 표시
     * @param {number} x - 화면 X 좌표
     * @param {number} y - 화면 Y 좌표
     * @param {Function} onDelete - 삭제 콜백
     */
    static showContextMenu(x, y, onDelete) {
        DMDetailView.hideContextMenu();
        const menu = createElement('div', { className: 'dm-context-menu' });
        const deleteBtn = createElement('button', {
            className: 'dm-context-menu__item',
            textContent: '삭제',
        });
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            DMDetailView.hideContextMenu();
            onDelete();
        });
        menu.appendChild(deleteBtn);
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        document.body.appendChild(menu);

        // 메뉴 외부 클릭 시 닫기
        setTimeout(() => {
            document.addEventListener('click', DMDetailView.hideContextMenu, { once: true });
        }, 0);
    }

    /**
     * 컨텍스트 메뉴 숨김
     */
    static hideContextMenu() {
        const existing = document.querySelector('.dm-context-menu');
        if (existing) existing.remove();
    }

    /**
     * 인라인 타임스탬프 (HH:MM 형식 — 터미널 로그용)
     * @param {string} dateString - ISO 날짜 문자열
     * @returns {string}
     * @private
     */
    static _formatInlineTime(dateString) {
        if (!dateString) return '??:??';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '??:??';
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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
