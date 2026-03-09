// @ts-check
// js/services/ThemeService.js
// 다크 모드 테마 관리

const THEME_KEY = 'theme';

export const ThemeService = {
    /**
     * 페이지 로드 시 테마 초기화.
     * localStorage → OS 기본 설정 → 'light' 순서로 결정.
     * @returns {void}
     */
    initTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
            return;
        }
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = prefersDark ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
    },

    /**
     * 현재 테마 반전 + 저장.
     * @returns {string} 전환된 테마 ('light' | 'dark')
     */
    toggleTheme() {
        const current = this.getCurrentTheme();
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem(THEME_KEY, next);
        return next;
    },

    /**
     * 현재 테마 반환.
     * @returns {string} 현재 테마 ('light' | 'dark')
     */
    getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme') || 'light';
    },
};
