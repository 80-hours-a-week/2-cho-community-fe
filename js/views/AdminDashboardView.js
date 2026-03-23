// js/views/AdminDashboardView.js
// 관리자 대시보드 페이지 렌더링 관련 로직

import { createElement, clearElement } from '../utils/dom.js';
import { formatDate } from '../utils/formatters.js';

/**
 * 관리자 대시보드 View 클래스
 */
class AdminDashboardView {
    /**
     * 통계 카드 렌더링
     * @param {object} summary - { total_users, total_posts, total_comments, today_signups }
     */
    static renderStatsCards(summary) {
        const container = document.getElementById('stats-cards');
        if (!container) return;

        clearElement(container);

        const cards = [
            { label: '총 사용자', value: summary.total_users ?? 0 },
            { label: '총 게시글', value: summary.total_posts ?? 0 },
            { label: '총 댓글', value: summary.total_comments ?? 0 },
            { label: '오늘 가입', value: summary.today_signups ?? 0 },
        ];

        cards.forEach(({ label, value }) => {
            const card = createElement('div', { className: 'stat-card' }, [
                createElement('div', { className: 'stat-value', textContent: value.toLocaleString() }),
                createElement('div', { className: 'stat-label', textContent: label }),
            ]);
            container.appendChild(card);
        });
    }

    /**
     * 일별 통계 테이블 렌더링
     * @param {Array<object>} dailyStats - [{ date, signups, posts, comments }, ...]
     */
    static renderDailyStats(dailyStats) {
        const tbody = document.getElementById('daily-stats-body');
        if (!tbody) return;

        clearElement(tbody);

        if (!dailyStats || dailyStats.length === 0) {
            const row = createElement('tr', {}, [
                createElement('td', { colspan: '4', textContent: '데이터가 없습니다.' }),
            ]);
            tbody.appendChild(row);
            return;
        }

        dailyStats.forEach((stat) => {
            const row = createElement('tr', {}, [
                createElement('td', { textContent: stat.date || '-' }),
                createElement('td', { textContent: String(stat.signups ?? 0) }),
                createElement('td', { textContent: String(stat.posts ?? 0) }),
                createElement('td', { textContent: String(stat.comments ?? 0) }),
            ]);
            tbody.appendChild(row);
        });
    }

    /**
     * 사용자 카드 요소 생성
     * @param {object} user - 사용자 데이터
     * @param {object} handlers - { onSuspend, onUnsuspend }
     * @returns {HTMLElement}
     */
    static createUserCard(user, handlers) {
        const isSuspended = user.suspended_until && new Date(user.suspended_until) > new Date();

        // 역할 배지
        const roleBadge = createElement('span', {
            className: `role-badge ${user.role === 'admin' ? 'admin' : ''}`,
            textContent: user.role === 'admin' ? '관리자' : '일반',
        });

        // 정지 배지 (정지 중인 경우)
        const badges = [roleBadge];
        if (isSuspended) {
            const suspendedUntil = formatDate(new Date(user.suspended_until));
            badges.push(createElement('span', {
                className: 'suspended-badge',
                textContent: `정지 (~${suspendedUntil})`,
            }));
        }

        // 액션 버튼
        const actions = [];
        if (user.role !== 'admin') {
            if (isSuspended) {
                actions.push(createElement('button', {
                    className: 'success-btn',
                    textContent: '정지 해제',
                    onClick: () => handlers.onUnsuspend(user.user_id),
                }));
            } else {
                actions.push(createElement('button', {
                    className: 'danger-btn',
                    textContent: '정지',
                    onClick: () => handlers.onSuspend(user.user_id, user.nickname),
                }));
            }
        }

        return createElement('div', { className: 'user-card' }, [
            createElement('div', { className: 'user-info' }, [
                createElement('div', { className: 'user-info-top' }, [
                    createElement('span', { className: 'user-nickname', textContent: user.nickname || '-' }),
                    ...badges,
                ]),
                createElement('span', { className: 'user-email', textContent: user.email || '-' }),
            ]),
            createElement('div', { className: 'user-actions' }, actions),
        ]);
    }

    /**
     * 사용자 목록 렌더링
     * @param {Array<object>} users - 사용자 배열
     * @param {HTMLElement} container - 목록 컨테이너
     * @param {object} handlers - { onSuspend, onUnsuspend }
     * @param {boolean} [append=false] - 기존 목록에 추가할지 여부
     */
    static renderUserList(users, container, handlers, append = false) {
        if (!container) return;

        if (!append) {
            clearElement(container);
        }

        if (!users || users.length === 0) {
            if (!append) {
                container.appendChild(
                    createElement('p', {
                        className: 'empty-message',
                        textContent: '사용자가 없습니다.',
                    })
                );
            }
            return;
        }

        users.forEach((user) => {
            container.appendChild(AdminDashboardView.createUserCard(user, handlers));
        });
    }

    /**
     * 로딩 센티넬 표시/숨김
     * @param {HTMLElement} sentinel - 센티넬 요소
     * @param {boolean} show - 표시 여부
     */
    static toggleLoadingSentinel(sentinel, show) {
        if (!sentinel) return;
        sentinel.style.display = show ? 'block' : 'none';
    }
}

export default AdminDashboardView;
