// js/views/HeaderView.js
// 헤더 UI 렌더링 관련 로직

/**
 * 헤더 View 클래스
 */
import { getImageUrl } from './helpers.js';
import { escapeCssUrl } from '../utils/formatters.js';
import { createElement } from '../utils/dom.js';
import { Icons } from '../utils/icons.js';

/**
 * 헤더 View 클래스
 */
class HeaderView {
    /**
     * 프로필 요소 생성
     * @param {object} user - 사용자 정보
     * @returns {HTMLElement} - 생성된 프로필 요소
     */
    static createProfileElement(user) {
        const profileCircle = document.createElement('div');
        profileCircle.className = 'profile-circle';
        profileCircle.id = 'header-profile';

        if (user && user.profileImageUrl) {
            const fullUrl = escapeCssUrl(getImageUrl(user.profileImageUrl));
            profileCircle.style.backgroundImage = `url('${fullUrl}')`;
        } else {
            profileCircle.style.backgroundColor = 'var(--color-gray-700)';
        }

        return profileCircle;
    }

    /**
     * 드롭다운 메뉴 생성
     * @param {HTMLElement} profileBtn - 프로필 버튼 요소
     * @param {object} handlers - 이벤트 핸들러 객체
     * @param {Function} handlers.onEditInfo - 회원정보 수정 클릭 핸들러
     * @param {Function} handlers.onChangePassword - 비밀번호 수정 클릭 핸들러
     * @param {Function} handlers.onMyActivity - 내 활동 클릭 핸들러
     * @param {Function} handlers.onLogout - 로그아웃 클릭 핸들러
     * @param {Function} [handlers.onBadges] - 배지 클릭 핸들러
     * @param {Function} [handlers.onAdminDashboard] - 관리자 대시보드 클릭 핸들러 (관리자만)
     * @param {Function} [handlers.onAdminReports] - 신고 관리 클릭 핸들러 (관리자만)
     * @returns {HTMLElement} - 드롭다운 요소
     */
    static createDropdown(profileBtn, handlers) {
        let dropdown = document.getElementById('header-dropdown');

        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.id = 'header-dropdown';
            dropdown.className = 'header-dropdown hidden';

            const menuItems = [
                createElement('li', { id: 'menu-edit-info', role: 'menuitem', tabindex: '-1' }, ['회원정보수정']),
                createElement('li', { id: 'menu-change-pw', role: 'menuitem', tabindex: '-1' }, ['비밀번호수정']),
                createElement('li', { id: 'menu-my-activity', role: 'menuitem', tabindex: '-1' }, ['내 활동']),
            ];

            // 관리자 메뉴
            if (handlers.onAdminDashboard) {
                menuItems.push(
                    createElement('li', { id: 'menu-admin-dashboard', className: 'menu-admin', role: 'menuitem', tabindex: '-1' }, ['관리자 대시보드'])
                );
            }
            if (handlers.onAdminReports) {
                menuItems.push(
                    createElement('li', { id: 'menu-admin-reports', className: 'menu-admin', role: 'menuitem', tabindex: '-1' }, ['신고 관리'])
                );
            }

            menuItems.push(createElement('li', { id: 'menu-badges', role: 'menuitem', tabindex: '-1' }, ['배지']));
            menuItems.push(createElement('li', { id: 'menu-logout', role: 'menuitem', tabindex: '-1' }, ['로그아웃']));

            dropdown.appendChild(createElement('ul', { role: 'menu' }, menuItems));

            const headerAuth = document.querySelector('.header-auth');
            if (headerAuth) {
                headerAuth.appendChild(dropdown);
            } else {
                document.body.appendChild(dropdown);
            }
        }

        // 이벤트 바인딩
        HeaderView._bindDropdownEvents(profileBtn, dropdown, handlers);

        return dropdown;
    }

    // 프로필 버튼 클릭 리스너 저장
    static _profileClickListener = null;

    /**
     * 드롭다운 이벤트 바인딩
     * @private
     */
    static _bindDropdownEvents(profileBtn, dropdown, handlers) {
        // 기존 프로필 버튼 리스너 제거
        if (HeaderView._profileClickListener) {
            profileBtn.removeEventListener('click', HeaderView._profileClickListener);
        }

        // 새 토글 리스너 생성 및 등록
        HeaderView._profileClickListener = (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
            if (!dropdown.classList.contains('hidden')) {
                const firstItem = dropdown.querySelector('[role="menuitem"]');
                if (firstItem) firstItem.focus();
            }
        };
        profileBtn.addEventListener('click', HeaderView._profileClickListener);

        // 외부 클릭 시 닫기 (기존 리스너 제거 후 재등록)
        if (HeaderView._documentClickListener) {
            document.removeEventListener('click', HeaderView._documentClickListener);
        }

        HeaderView._documentClickListener = (e) => {
            if (profileBtn && !profileBtn.contains(e.target) && dropdown && !dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        };
        document.addEventListener('click', HeaderView._documentClickListener);

        // 메뉴 버튼 이벤트 바인딩 (cloneNode로 기존 리스너 제거)
        const bindMenuBtn = (id, handler) => {
            const btn = document.getElementById(id);
            if (btn && handler) {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.addEventListener('click', handler);
            }
        };

        bindMenuBtn('menu-edit-info', handlers.onEditInfo);
        bindMenuBtn('menu-change-pw', handlers.onChangePassword);
        bindMenuBtn('menu-my-activity', handlers.onMyActivity);
        if (handlers.onAdminDashboard) {
            bindMenuBtn('menu-admin-dashboard', handlers.onAdminDashboard);
        }
        if (handlers.onAdminReports) {
            bindMenuBtn('menu-admin-reports', handlers.onAdminReports);
        }
        bindMenuBtn('menu-badges', handlers.onBadges);
        bindMenuBtn('menu-logout', handlers.onLogout);

        // 키보드 내비게이션
        dropdown.addEventListener('keydown', (e) => {
            const items = [...dropdown.querySelectorAll('[role="menuitem"]')];
            const currentIndex = items.indexOf(document.activeElement);

            switch (e.key) {
                case 'Escape':
                    dropdown.classList.add('hidden');
                    profileBtn.focus();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    items[currentIndex + 1 < items.length ? currentIndex + 1 : 0]?.focus();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    items[currentIndex - 1 >= 0 ? currentIndex - 1 : items.length - 1]?.focus();
                    break;
            }
        });
    }

    /**
     * 테마 토글 버튼 생성
     * @param {string} currentTheme - 현재 테마 ('light' 또는 'dark')
     * @returns {HTMLElement}
     */
    static createThemeToggle(currentTheme) {
        const btn = document.createElement('button');
        btn.id = 'theme-toggle';
        btn.className = 'theme-toggle-btn';
        btn.setAttribute('aria-label', '다크 모드 전환');
        btn.appendChild(currentTheme === 'dark' ? Icons.sun(20) : Icons.moon(20));
        return btn;
    }

    /**
     * 테마 토글 아이콘 업데이트
     * @param {string} theme - 새 테마
     */
    static updateThemeToggle(theme) {
        const btn = document.getElementById('theme-toggle');
        if (btn) {
            btn.textContent = '';
            btn.appendChild(theme === 'dark' ? Icons.sun(20) : Icons.moon(20));
        }
    }

    /**
     * 드롭다운 숨기기
     */
    static hideDropdown() {
        const dropdown = document.getElementById('header-dropdown');
        if (dropdown) {
            dropdown.classList.add('hidden');
        }
    }

    /**
     * 알림 아이콘 링크 생성
     * @param {number} count - 읽지 않은 알림 수
     * @param {string} href - 링크 URL
     * @param {Function} iconFactory - 아이콘 생성 함수 (Icons.bell 또는 Icons.mail)
     * @param {string} linkId - 링크 요소 ID
     * @param {string} badgeId - 뱃지 요소 ID
     * @returns {HTMLElement}
     */
    static createIconLink(count, href, iconFactory, linkId, badgeId) {
        const link = document.createElement('a');
        link.href = href;
        link.className = 'notification-icon-wrapper';
        link.id = linkId;

        const iconSpan = document.createElement('span');
        iconSpan.className = 'notification-bell';
        iconSpan.appendChild(iconFactory(20));
        link.appendChild(iconSpan);

        if (count > 0) {
            const badge = document.createElement('span');
            badge.id = badgeId;
            badge.className = 'notification-badge';
            badge.textContent = count > 99 ? '99+' : String(count);
            link.appendChild(badge);
        }

        return link;
    }

    /**
     * 뱃지 카운트 업데이트
     * @param {string} badgeId - 뱃지 요소 ID
     * @param {number} count - 새 카운트
     */
    static updateBadge(badgeId, count) {
        const badge = document.getElementById(badgeId);
        if (count > 0) {
            if (badge) {
                badge.textContent = count > 99 ? '99+' : String(count);
                badge.classList.remove('hidden');
            }
        } else if (badge) {
            badge.classList.add('hidden');
        }
    }

    /**
     * 이메일 인증 배너 생성
     * @param {Function} onResend - 재발송 버튼 클릭 핸들러
     * @returns {HTMLElement}
     */
    static createEmailVerifyBanner(onResend) {
        const banner = createElement('div', { className: 'email-verify-banner', id: 'email-verify-banner' }, [
            createElement('p', { className: 'email-verify-banner__text' }, ['이메일 인증 후 이용 가능합니다.']),
        ]);

        const btn = createElement('button', { className: 'email-verify-banner__btn' }, ['인증 메일 재발송']);
        btn.addEventListener('click', () => onResend(btn));
        banner.appendChild(btn);

        return banner;
    }

    /**
     * 이벤트 리스너 정리 (메모리 누수 방지)
     */
    static cleanup() {
        if (HeaderView._documentClickListener) {
            document.removeEventListener('click', HeaderView._documentClickListener);
            HeaderView._documentClickListener = null;
        }
        if (HeaderView._profileClickListener) {
            const profileBtn = document.getElementById('header-profile');
            if (profileBtn) {
                profileBtn.removeEventListener('click', HeaderView._profileClickListener);
            }
            HeaderView._profileClickListener = null;
        }
    }
}

export default HeaderView;
