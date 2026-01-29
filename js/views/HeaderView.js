// js/views/HeaderView.js
// 헤더 UI 렌더링 관련 로직

/**
 * 헤더 View 클래스
 */
import { getImageUrl } from './helpers.js';

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
            const fullUrl = getImageUrl(user.profileImageUrl);
            profileCircle.style.backgroundImage = `url(${fullUrl})`;
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

            dropdown.innerHTML = `
                <ul>
                    <li id="menu-edit-info">회원정보수정</li>
                    <li id="menu-change-pw">비밀번호수정</li>
                    <li id="menu-logout">로그아웃</li>
                </ul>
            `;

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

    /**
     * 드롭다운 이벤트 바인딩
     * @private
     */
    static _bindDropdownEvents(profileBtn, dropdown, handlers) {
        // 토글 로직
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });

        // 외부 클릭 시 닫기
        document.addEventListener('click', (e) => {
            if (!profileBtn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });

        // 메뉴 액션
        const editInfoBtn = document.getElementById('menu-edit-info');
        const changePwBtn = document.getElementById('menu-change-pw');
        const logoutBtn = document.getElementById('menu-logout');

        if (editInfoBtn && handlers.onEditInfo) {
            editInfoBtn.addEventListener('click', handlers.onEditInfo);
        }
        if (changePwBtn && handlers.onChangePassword) {
            changePwBtn.addEventListener('click', handlers.onChangePassword);
        }
        if (logoutBtn && handlers.onLogout) {
            logoutBtn.addEventListener('click', handlers.onLogout);
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
}

export default HeaderView;
