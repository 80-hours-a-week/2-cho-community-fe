// @ts-check
// 배포판 플레어 유틸리티

/**
 * 배포판 메타데이터
 * @type {Record<string, {name: string, color: string}>}
 */
export const DISTRO_MAP = {
    ubuntu:   { name: 'Ubuntu',      color: '#E95420' },
    fedora:   { name: 'Fedora',      color: '#3C6EB4' },
    arch:     { name: 'Arch Linux',  color: '#1793D1' },
    debian:   { name: 'Debian',      color: '#A81D33' },
    mint:     { name: 'Linux Mint',  color: '#87CF3E' },
    opensuse: { name: 'openSUSE',    color: '#73BA25' },
    rocky:    { name: 'Rocky Linux', color: '#10B981' },
    nixos:    { name: 'NixOS',       color: '#5277C3' },
    gentoo:   { name: 'Gentoo',      color: '#54487A' },
    other:    { name: '기타',         color: '#808080' },
};

/**
 * 배포판 플레어 뱃지 DOM 요소를 생성합니다 (createElement 사용, XSS safe).
 * @param {string | null | undefined} distro - 배포판 키
 * @param {'small' | 'normal'} [size='small'] - 뱃지 크기
 * @returns {HTMLElement | null}
 */
export function createDistroBadge(distro, size = 'small') {
    if (!distro || !DISTRO_MAP[distro]) return null;

    const meta = DISTRO_MAP[distro];
    const badge = document.createElement('span');
    badge.className = `distro-badge distro-badge--${size}`;
    badge.title = meta.name;

    const dot = document.createElement('span');
    dot.className = 'distro-badge__dot';
    dot.style.backgroundColor = meta.color;
    badge.appendChild(dot);

    if (size === 'normal') {
        const label = document.createElement('span');
        label.className = 'distro-badge__label';
        label.textContent = meta.name;
        badge.appendChild(label);
    }

    return badge;
}
