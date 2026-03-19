// js/components/BottomTabComponent.js
// 모바일 하단 탭 바 — Terminal Editorial

import { createElement } from '../utils/dom.js';
import { Icons } from '../utils/icons.js';
import { resolveNavPath } from '../config.js';
import { NAV_PATHS } from '../constants.js';

/**
 * 모바일 하단 탭 바 컴포넌트
 * CSS가 데스크톱에서 display: none 처리
 */
class BottomTabComponent {
    /** @type {HTMLElement|null} */
    static _el = null;

    /**
     * 하단 탭 바 초기화 — body에 주입
     */
    static init() {
        if (BottomTabComponent._el) return;

        const currentPath = location.pathname;
        const nav = createElement('nav', {
            className: 'bottom-tab-bar',
            id: 'bottom-tab-bar',
            'aria-label': '하단 내비게이션',
        }, [
            BottomTabComponent._createTab('피드', Icons.layoutGrid, resolveNavPath(NAV_PATHS.MAIN), currentPath === '/main'),
            BottomTabComponent._createTab('위키', Icons.bookOpen, resolveNavPath(NAV_PATHS.WIKI), currentPath.startsWith('/wiki')),
            BottomTabComponent._createTab('패키지', Icons.package, resolveNavPath(NAV_PATHS.PACKAGES), currentPath.startsWith('/packages')),
            BottomTabComponent._createTab('DM', Icons.mail, resolveNavPath(NAV_PATHS.DM_LIST), currentPath.startsWith('/messages'), 'bottom-tab-dm-badge'),
            BottomTabComponent._createTab('알림', Icons.bell, resolveNavPath(NAV_PATHS.NOTIFICATIONS), currentPath === '/notifications', 'bottom-tab-notif-badge'),
        ]);

        document.body.appendChild(nav);
        document.body.classList.add('has-bottom-tabs');
        BottomTabComponent._el = nav;
    }

    /**
     * 탭 아이템 생성
     * @param {string} label - 탭 라벨
     * @param {function(number): SVGSVGElement} iconFn - 아이콘 팩토리 함수
     * @param {string} href - 링크 경로
     * @param {boolean} isActive - 활성 상태
     * @param {string} [badgeId] - 뱃지 ID
     * @returns {HTMLElement}
     * @private
     */
    static _createTab(label, iconFn, href, isActive, badgeId) {
        const children = [
            createElement('span', { className: 'bottom-tab__icon' }, [iconFn(20)]),
            createElement('span', { className: 'bottom-tab__label' }, [label]),
        ];

        if (badgeId) {
            children.push(
                createElement('span', {
                    className: 'bottom-tab__badge hidden',
                    id: badgeId,
                }, ['0'])
            );
        }

        return createElement('a', {
            className: `bottom-tab${isActive ? ' active' : ''}`,
            href,
        }, children);
    }

    /**
     * 뱃지 업데이트
     * @param {'bottom-tab-dm-badge'|'bottom-tab-notif-badge'} badgeId
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

export default BottomTabComponent;
