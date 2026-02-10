// js/views/HeaderView.js
// 헤더 UI 렌더링 관련 로직

/**
 * 헤더 View 클래스
 */
import { getImageUrl } from './helpers.js';
import { escapeCssUrl } from '../utils/formatters.js';
import { createElement } from '../utils/dom.js';

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
            profileCircle.style.backgroundColor = '#555';
        }

        return profileCircle;
    }

    /**
     * 드롭다운 메뉴 생성
     * @param {HTMLElement} profileBtn - 프로필 버튼 요소
     * @param {object} handlers - 이벤트 핸들러 객체
     * @param {Function} handlers.onEditInfo - 회원정보 수정 클릭 핸들러
     * @param {Function} handlers.onChangePassword - 비밀번호 수정 클릭 핸들러
     * @param {Function} handlers.onLogout - 로그아웃 클릭 핸들러
     * @returns {HTMLElement} - 드롭다운 요소
     */
    static createDropdown(profileBtn, handlers) {
        let dropdown = document.getElementById('header-dropdown');

        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.id = 'header-dropdown';
            dropdown.className = 'header-dropdown hidden';

            dropdown.appendChild(
                createElement('ul', {}, [
                    createElement('li', { id: 'menu-edit-info' }, ['회원정보수정']),
                    createElement('li', { id: 'menu-change-pw' }, ['비밀번호수정']),
                    createElement('li', { id: 'menu-logout' }, ['로그아웃']),
                ])
            );

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
        bindMenuBtn('menu-logout', handlers.onLogout);
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
