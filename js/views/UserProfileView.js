// js/views/UserProfileView.js
// 타 사용자 프로필 페이지 View

import { getImageUrl } from './helpers.js';

/**
 * 타 사용자 프로필 View 클래스
 */
class UserProfileView {
    /**
     * 프로필 정보 렌더링
     * @param {object} user - 사용자 데이터 (nickname, profileImageUrl, suspended_until)
     */
    static renderProfile(user) {
        const imgEl = document.getElementById('profile-img');
        const nicknameEl = document.getElementById('profile-nickname');

        if (imgEl && user.profileImageUrl) {
            imgEl.src = getImageUrl(user.profileImageUrl);
        }
        if (nicknameEl) {
            nicknameEl.textContent = user.nickname;
        }

        UserProfileView.renderStats(user);
        UserProfileView.renderSuspensionBadge(user);
    }

    /**
     * 활동 통계 카드 렌더링
     * @param {object} user - 사용자 데이터 (posts_count, comments_count, likes_received_count 포함)
     */
    static renderStats(user) {
        const container = document.getElementById('profile-stats');
        if (!container) return;

        const stats = [
            { label: '게시글', value: user.posts_count ?? 0 },
            { label: '댓글', value: user.comments_count ?? 0 },
            { label: '좋아요', value: user.likes_received_count ?? 0 },
        ];

        container.textContent = '';
        stats.forEach(({ label, value }) => {
            const item = document.createElement('div');
            item.className = 'profile-stat-item';

            const valueEl = document.createElement('span');
            valueEl.className = 'profile-stat-value';
            valueEl.textContent = String(value);

            const labelEl = document.createElement('span');
            labelEl.className = 'profile-stat-label';
            labelEl.textContent = label;

            item.appendChild(valueEl);
            item.appendChild(labelEl);
            container.appendChild(item);
        });
    }

    /**
     * 정지 배지 렌더링
     * @param {object} user - 사용자 데이터 (suspended_until)
     */
    static renderSuspensionBadge(user) {
        const badge = document.getElementById('suspension-badge');
        if (!badge) return;

        if (user.suspended_until) {
            const until = new Date(user.suspended_until).toLocaleDateString('ko-KR');
            badge.textContent = `정지 중 (${until}까지)`;
            badge.classList.remove('hidden');
        } else {
            badge.textContent = '';
            badge.classList.add('hidden');
        }
    }

    /**
     * 빈 게시글 상태 표시
     * @param {HTMLElement} emptyEl - 빈 상태 요소
     */
    static showEmptyPosts(emptyEl) {
        if (emptyEl) emptyEl.classList.remove('hidden');
    }

    /**
     * 빈 게시글 상태 숨기기
     * @param {HTMLElement} emptyEl - 빈 상태 요소
     */
    static hideEmptyPosts(emptyEl) {
        if (emptyEl) emptyEl.classList.add('hidden');
    }
}

export default UserProfileView;
