// @ts-check
// js/views/BadgeView.js
// 배지 목록 렌더링

import { createElement } from '../utils/dom.js';

/** @type {Record<string, string>} */
const CATEGORY_LABELS = {
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
};

/** @type {Array<string>} */
const CATEGORY_ORDER = ['bronze', 'silver', 'gold'];

/** @type {Record<string, string>} */
const BADGE_ICONS = {
    bronze: '\u2B50',
    silver: '\u2B50',
    gold: '\u2B50',
};

class BadgeView {
    /**
     * 배지 그리드 렌더링
     * @param {HTMLElement} container
     * @param {Array<any>} allBadges - 전체 배지 정의
     * @param {Array<any>} earnedBadges - 사용자가 획득한 배지
     */
    static renderBadgeGrid(container, allBadges, earnedBadges) {
        container.textContent = '';

        // 획득한 배지 ID를 Set으로 변환 (빠른 조회)
        /** @type {Map<number, any>} */
        const earnedMap = new Map();
        for (const eb of earnedBadges) {
            earnedMap.set(eb.badge_id ?? eb.id, eb);
        }

        // 카테고리별 그룹핑
        /** @type {Record<string, Array<any>>} */
        const grouped = {};
        for (const badge of allBadges) {
            const cat = badge.category || 'bronze';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(badge);
        }

        for (const category of CATEGORY_ORDER) {
            const badges = grouped[category];
            if (!badges || badges.length === 0) continue;

            const earnedCount = badges.filter(b => earnedMap.has(b.id)).length;

            const section = createElement('div', { className: 'badge-category-section' }, [
                createElement('h2', { className: 'badge-category-header' }, [
                    `${CATEGORY_LABELS[category] || category} (${earnedCount}/${badges.length})`,
                ]),
                createElement('div', { className: 'badge-grid' },
                    badges.map(badge => {
                        const earned = earnedMap.get(badge.id);
                        return BadgeView.createBadgeCard(badge, !!earned, earned?.earned_at ?? null);
                    })
                ),
            ]);

            container.appendChild(section);
        }
    }

    /**
     * 개별 배지 카드 생성
     * @param {any} badge - 배지 정의
     * @param {boolean} isEarned - 획득 여부
     * @param {string|null} earnedAt - 획득 일시
     * @returns {HTMLElement}
     */
    static createBadgeCard(badge, isEarned, earnedAt) {
        const category = badge.category || 'bronze';
        const icon = badge.icon || BADGE_ICONS[category] || '\u2B50';

        /** @type {Array<string|Node|false>} */
        const children = [
            createElement('div', { className: `badge-icon ${category}` }, [icon]),
            createElement('span', { className: 'badge-name' }, [badge.name || '']),
            createElement('span', { className: 'badge-description' }, [badge.description || '']),
        ];

        if (isEarned && earnedAt) {
            const date = new Date(earnedAt);
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            children.push(
                createElement('span', { className: 'badge-earned-date' }, [`획득: ${yyyy}-${mm}-${dd}`])
            );
        } else if (!isEarned && badge.threshold !== null && badge.threshold !== undefined) {
            children.push(
                createElement('span', { className: 'badge-threshold' }, [`기준: ${badge.threshold}`])
            );
        }

        return createElement('div', {
            className: isEarned ? 'badge-card earned' : 'badge-card unearned',
        }, children);
    }
}

export default BadgeView;
