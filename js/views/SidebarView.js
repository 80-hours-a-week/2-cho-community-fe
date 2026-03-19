// js/views/SidebarView.js
// 사이드바 내비게이션 — Terminal Editorial 레이아웃

import { createElement } from '../utils/dom.js';
import { NAV_PATHS, CATEGORY_LABELS } from '../constants.js';
import { resolveNavPath } from '../config.js';
import { Icons } from '../utils/icons.js';

/**
 * 사이드바 View 클래스
 * HeaderController에서 인증 후 주입
 */
class SidebarView {
    /**
     * 사이드바 생성
     * @param {object} options
     * @param {object|null} options.user - 현재 사용자 정보
     * @param {boolean} options.isAdmin - 관리자 여부
     * @returns {HTMLElement}
     */
    static create({ user, isAdmin }) {
        const currentPath = location.pathname;

        const sidebar = createElement('nav', { className: 'sidebar', id: 'app-sidebar' }, [
            // 모바일 닫기 버튼
            createElement('button', {
                className: 'sidebar__close',
                'aria-label': '메뉴 닫기',
                onClick: () => SidebarView.close(),
            }, ['✕']),

            // ── navigate — 피드 + 위키 + 패키지 ──
            SidebarView._createSection('navigate', [
                SidebarView._createNavItem('피드', resolveNavPath(NAV_PATHS.MAIN), currentPath === '/main'),
                SidebarView._createNavItem('위키', resolveNavPath(NAV_PATHS.WIKI), currentPath.startsWith('/wiki')),
                SidebarView._createNavItem('패키지', resolveNavPath(NAV_PATHS.PACKAGES), currentPath.startsWith('/packages')),
            ]),

            // ── categories (피드 페이지만) ──
            ...(currentPath === '/main' ? [
                SidebarView._createSection('categories',
                    Object.entries(CATEGORY_LABELS).map(([id, label]) =>
                        SidebarView._createCategoryItem(label, Number(id))
                    )
                ),
            ] : []),

            // ── wiki (위키 페이지만 — 태그 필터는 WikiListController가 동적 주입) ──
            ...(currentPath.startsWith('/wiki') ? [
                SidebarView._createSection('wiki', [], 'sidebar-wiki-tags', resolveNavPath(NAV_PATHS.WIKI)),
            ] : []),

            // ── social ──
            SidebarView._createSection('social', [
                SidebarView._createNavItem('알림', resolveNavPath(NAV_PATHS.NOTIFICATIONS), currentPath === '/notifications', 'sidebar-notif-badge'),
                SidebarView._createNavItem('메시지', resolveNavPath(NAV_PATHS.DM_LIST), currentPath.startsWith('/messages'), 'sidebar-dm-badge'),
                SidebarView._createNavItem('내 활동', resolveNavPath(NAV_PATHS.MY_ACTIVITY), currentPath === '/my-activity'),
            ]),

            // ── admin (관리자만) ──
            ...(isAdmin ? [
                SidebarView._createSection('admin', [
                    SidebarView._createNavItem('대시보드', resolveNavPath(NAV_PATHS.ADMIN_DASHBOARD), currentPath === '/admin/dashboard'),
                    SidebarView._createNavItem('신고 관리', resolveNavPath(NAV_PATHS.ADMIN_REPORTS), currentPath === '/admin/reports'),
                ]),
            ] : []),
        ]);

        return sidebar;
    }

    /**
     * 섹션 생성 (터미널 프롬프트 스타일 헤더)
     * @private
     */
    static _createSection(title, children, listId, href) {
        const listAttrs = { className: 'sidebar__list' };
        if (listId) listAttrs.id = listId;

        const titleEl = href
            ? createElement('a', { href, className: 'sidebar__section-link' }, [title])
            : createElement('span', {}, [title]);

        return createElement('div', { className: 'sidebar__section' }, [
            createElement('div', { className: 'sidebar__section-header' }, [
                createElement('span', { className: 'sidebar__prompt' }, ['$']),
                titleEl,
            ]),
            createElement('ul', listAttrs, children),
        ]);
    }

    /**
     * 내비게이션 아이템 생성
     * @private
     */
    static _createNavItem(label, href, isActive, badgeId) {
        const children = [
            createElement('span', { className: 'sidebar__item-label' }, [label]),
        ];

        if (badgeId) {
            children.push(
                createElement('span', {
                    className: 'sidebar__badge hidden',
                    id: badgeId,
                }, ['0'])
            );
        }

        const li = createElement('li', { className: 'sidebar__item' }, [
            createElement('a', {
                className: `sidebar__link${isActive ? ' active' : ''}`,
                href,
            }, children),
        ]);

        return li;
    }

    /**
     * 카테고리 아이템 생성 — 항상 URL 네비게이션 (MPA 구조)
     * @private
     */
    static _createCategoryItem(label, categoryId) {
        const params = new URLSearchParams(location.search);
        const currentCat = params.get('category');
        const isActive = currentCat === String(categoryId);

        return createElement('li', { className: 'sidebar__item' }, [
            createElement('a', {
                className: `sidebar__link sidebar__link--category${isActive ? ' active' : ''}`,
                href: resolveNavPath(`${NAV_PATHS.MAIN}?category=${categoryId}`),
            }, [label]),
        ]);
    }

    /**
     * 사이드바를 DOM에 주입
     * @param {HTMLElement} sidebarEl - 사이드바 요소
     */
    static inject(sidebarEl) {
        document.body.insertBefore(sidebarEl, document.body.firstChild);
        document.body.classList.add('has-sidebar');
    }

    /**
     * 모바일 햄버거 버튼 주입
     * @private
     */
    static _injectToggleButton() {
        const wrapper = document.querySelector('.header-title-wrapper');
        if (!wrapper || document.getElementById('sidebar-toggle')) return;

        const btn = createElement('button', {
            className: 'sidebar-toggle',
            id: 'sidebar-toggle',
            'aria-label': '메뉴 열기',
            onClick: () => SidebarView.toggle(),
        }, [
            createElement('span', { className: 'sidebar-toggle__line' }),
            createElement('span', { className: 'sidebar-toggle__line' }),
            createElement('span', { className: 'sidebar-toggle__line' }),
        ]);

        wrapper.insertBefore(btn, wrapper.firstChild);
    }

    /**
     * 사이드바 토글
     */
    static toggle() {
        const sidebar = document.getElementById('app-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) {
            sidebar.classList.toggle('open');
            overlay?.classList.toggle('open');
        }
    }

    /**
     * 사이드바 닫기
     */
    static close() {
        const sidebar = document.getElementById('app-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        sidebar?.classList.remove('open');
        overlay?.classList.remove('open');
    }

    /**
     * 위키 태그 필터를 사이드바에 주입 — URL 네비게이션 (MPA 구조, 피드 카테고리와 동일)
     * @param {Array<string>} tags - 태그 이름 목록
     * @returns {boolean} 사이드바에 주입 성공 여부
     */
    static updateWikiTags(tags) {
        const list = document.getElementById('sidebar-wiki-tags');
        if (!list) return false;

        const activeTag = new URLSearchParams(location.search).get('tag');
        list.textContent = '';

        tags.forEach(tag => {
            list.appendChild(createElement('li', { className: 'sidebar__item' }, [
                createElement('a', {
                    className: `sidebar__link sidebar__link--category${activeTag === tag ? ' active' : ''}`,
                    href: resolveNavPath(`${NAV_PATHS.WIKI}?tag=${encodeURIComponent(tag)}`),
                }, [tag]),
            ]));
        });
        return true;
    }

    /**
     * 사이드바 뱃지 업데이트
     * @param {'sidebar-notif-badge'|'sidebar-dm-badge'} badgeId
     * @param {number} count
     */
    static updateBadge(badgeId, count) {
        const badge = document.getElementById(badgeId);
        if (!badge) return;
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : String(count);
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

export default SidebarView;
