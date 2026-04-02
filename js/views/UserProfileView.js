// js/views/UserProfileView.js
// 타 사용자 프로필 페이지 View

import { getImageUrl, handleImageError } from './helpers.js';
import { createElement } from '../utils/dom.js';

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
            handleImageError(imgEl, 'profile');
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
            { label: '팔로워', value: user.followers_count ?? 0, clickable: 'followers' },
            { label: '팔로잉', value: user.following_count ?? 0, clickable: 'following' },
        ];

        container.textContent = '';
        stats.forEach(({ label, value, clickable }) => {
            const item = document.createElement('div');
            item.className = 'profile-stat-item';
            if (clickable) {
                item.classList.add('clickable');
                item.dataset.action = clickable;
            }

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
    /**
     * 팔로워/팔로잉 목록 모달 생성 및 표시
     * @param {string} title - 모달 제목
     * @param {Array<{user_id: number, nickname: string, profile_img: string|null}>} users - 사용자 목록
     * @param {boolean} hasMore - 추가 데이터 여부
     * @param {Function} onLoadMore - 더보기 콜백
     * @param {Function} onUserClick - 사용자 클릭 콜백
     */
    static showFollowListModal(title, users, hasMore, onLoadMore, onUserClick) {
        let modal = document.getElementById('follow-list-modal');
        if (!modal) {
            modal = createElement('div', { id: 'follow-list-modal', className: 'modal hidden' }, [
                createElement('div', { className: 'modal-content follow-list-modal-content' }, [
                    createElement('div', { className: 'follow-list-modal-header' }, [
                        createElement('h3', { id: 'follow-list-title' }),
                        createElement('button', { id: 'follow-list-close', className: 'follow-list-close-btn' }, ['×']),
                    ]),
                    createElement('ul', { id: 'follow-list-body', className: 'follow-list-body' }),
                    createElement('button', { id: 'follow-list-more', className: 'btn-load-more', style: 'display:none' }, ['더보기']),
                ]),
            ]);
            document.body.appendChild(modal);
        }

        const titleEl = document.getElementById('follow-list-title');
        const body = document.getElementById('follow-list-body');
        const moreBtn = document.getElementById('follow-list-more');
        const closeBtn = document.getElementById('follow-list-close');

        if (titleEl) titleEl.textContent = title;
        if (body) body.textContent = '';

        UserProfileView._appendFollowUsers(body, users, onUserClick);

        if (moreBtn) {
            moreBtn.style.display = hasMore ? 'block' : 'none';
            const freshMore = moreBtn.cloneNode(true);
            moreBtn.parentNode.replaceChild(freshMore, moreBtn);
            freshMore.addEventListener('click', onLoadMore);
        }

        if (closeBtn) {
            const freshClose = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(freshClose, closeBtn);
            freshClose.addEventListener('click', () => UserProfileView.closeFollowListModal());
        }

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        // 모달 외부 클릭 시 닫기
        modal.onclick = (e) => {
            if (e.target === modal) UserProfileView.closeFollowListModal();
        };
    }

    /**
     * 팔로워/팔로잉 목록에 사용자 추가
     * @private
     */
    static _appendFollowUsers(listEl, users, onUserClick) {
        if (!listEl) return;
        users.forEach(user => {
            const li = createElement('li', { className: 'follow-list-item' }, [
                createElement('img', {
                    src: getImageUrl(user.profile_img),
                    className: 'follow-list-avatar',
                    alt: '',
                    loading: 'lazy',
                    onError: (e) => { e.target.src = '/assets/profiles/default_profile.jpg'; },
                }),
                createElement('span', { className: 'follow-list-nickname' }, [user.nickname || '탈퇴한 사용자']),
            ]);
            li.addEventListener('click', () => onUserClick(user.user_id));
            listEl.appendChild(li);
        });
    }

    /**
     * 팔로워/팔로잉 모달에 추가 데이터 삽입
     */
    static appendToFollowListModal(users, hasMore, onLoadMore, onUserClick) {
        const body = document.getElementById('follow-list-body');
        const moreBtn = document.getElementById('follow-list-more');

        UserProfileView._appendFollowUsers(body, users, onUserClick);

        if (moreBtn) {
            moreBtn.style.display = hasMore ? 'block' : 'none';
            const freshMore = moreBtn.cloneNode(true);
            moreBtn.parentNode.replaceChild(freshMore, moreBtn);
            freshMore.addEventListener('click', onLoadMore);
        }
    }

    /**
     * 팔로워/팔로잉 모달 닫기
     */
    static closeFollowListModal() {
        const modal = document.getElementById('follow-list-modal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    /**
     * 평판 점수 + 신뢰 등급 + 진행률 바 렌더링
     * @param {object} reputationData - 평판 데이터 (score, trust_level, trust_level_name, next_level_threshold)
     */
    static renderReputation(reputationData) {
        const container = document.getElementById('reputation-section');
        if (!container) return;

        container.textContent = '';

        const score = reputationData.score ?? reputationData.reputation_score ?? 0;
        const level = reputationData.trust_level ?? reputationData.level ?? 0;
        const levelName = reputationData.trust_level_name ?? reputationData.level_name ?? `Level ${level}`;
        const nextThreshold = reputationData.next_level_threshold ?? reputationData.next_threshold ?? 0;
        const prevThreshold = reputationData.current_level_threshold ?? reputationData.prev_threshold ?? 0;

        // 진행률 계산 (0~100%)
        let progressPct = 0;
        if (nextThreshold > prevThreshold) {
            progressPct = Math.min(100, Math.round(((score - prevThreshold) / (nextThreshold - prevThreshold)) * 100));
        } else if (nextThreshold === 0) {
            // 최고 레벨: 100% 처리
            progressPct = 100;
        }

        const scoreEl = createElement('span', { className: 'reputation-score' }, [
            score.toLocaleString('ko-KR'),
            ' 점',
        ]);

        const badgeEl = createElement('span', {
            className: 'trust-level-badge',
            dataset: { level: String(level) },
        }, [`Level ${level} — ${levelName}`]);

        const progressFill = createElement('div', {
            className: 'trust-level-progress-fill',
            style: { width: `${progressPct}%` },
        });

        const progressBar = createElement('div', { className: 'trust-level-progress' }, [progressFill]);

        const wrapper = createElement('div', { className: 'reputation-section-inner' }, [
            scoreEl,
            badgeEl,
            progressBar,
        ]);

        container.appendChild(wrapper);
    }

    /**
     * 배지 쇼케이스 렌더링 (최대 5개 미니 배지 + 전체 보기 링크)
     * @param {Array<object>} badges - 획득한 배지 목록
     */
    static renderBadgeShowcase(badges) {
        const container = document.getElementById('badge-showcase-section');
        if (!container) return;

        container.textContent = '';

        const showcaseEl = createElement('div', { className: 'badge-showcase' });

        if (!badges || badges.length === 0) {
            const emptyMsg = createElement('span', {
                className: 'badge-showcase-empty',
                style: { fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' },
            }, ['아직 획득한 배지가 없습니다']);
            container.appendChild(emptyMsg);
            return;
        }

        // 최대 5개만 표시
        const displayed = badges.slice(0, 5);
        displayed.forEach(badge => {
            const icon = badge.icon ?? badge.emoji ?? '🏅';
            const name = badge.name ?? badge.badge_name ?? '';
            const tier = badge.tier ?? badge.rarity ?? '';

            const miniEl = createElement('span', {
                className: `badge-mini badge-icon ${tier}`,
                title: name,
            }, [icon]);

            showcaseEl.appendChild(miniEl);
        });

        const viewAllLink = createElement('a', {
            href: '/badges',
            className: 'badge-showcase-link',
            style: { fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)' },
        }, ['전체 보기']);

        container.appendChild(showcaseEl);
        container.appendChild(viewAllLink);
    }

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
