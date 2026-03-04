// js/utils/icons.js
// 플랫 SVG 아이콘 팩토리 (Feather/Lucide 스타일)
// innerHTML 미사용 — createElementNS로 XSS-safe 생성

const NS = 'http://www.w3.org/2000/svg';

/** 기본 SVG 컨테이너 생성 */
function svg(size, children) {
    const el = document.createElementNS(NS, 'svg');
    el.setAttribute('width', String(size));
    el.setAttribute('height', String(size));
    el.setAttribute('viewBox', '0 0 24 24');
    el.setAttribute('fill', 'none');
    el.setAttribute('stroke', 'currentColor');
    el.setAttribute('stroke-width', '2');
    el.setAttribute('stroke-linecap', 'round');
    el.setAttribute('stroke-linejoin', 'round');
    children.forEach(child => el.appendChild(child));
    return el;
}

function path(d) {
    const el = document.createElementNS(NS, 'path');
    el.setAttribute('d', d);
    return el;
}

function circle(cx, cy, r) {
    const el = document.createElementNS(NS, 'circle');
    el.setAttribute('cx', String(cx));
    el.setAttribute('cy', String(cy));
    el.setAttribute('r', String(r));
    return el;
}

function line(x1, y1, x2, y2) {
    const el = document.createElementNS(NS, 'line');
    el.setAttribute('x1', String(x1));
    el.setAttribute('y1', String(y1));
    el.setAttribute('x2', String(x2));
    el.setAttribute('y2', String(y2));
    return el;
}

function polyline(points) {
    const el = document.createElementNS(NS, 'polyline');
    el.setAttribute('points', points);
    return el;
}

function rect(x, y, w, h, rx) {
    const el = document.createElementNS(NS, 'rect');
    el.setAttribute('x', String(x));
    el.setAttribute('y', String(y));
    el.setAttribute('width', String(w));
    el.setAttribute('height', String(h));
    if (rx != null) el.setAttribute('rx', String(rx));
    return el;
}

/**
 * SVG 아이콘 모음
 * 모든 아이콘은 stroke 기반, currentColor 사용
 */
export const Icons = {
    /** 해 (다크 모드에서 표시 — 라이트로 전환) */
    sun(size = 20) {
        return svg(size, [
            circle(12, 12, 5),
            line(12, 1, 12, 3),
            line(12, 21, 12, 23),
            line(4.22, 4.22, 5.64, 5.64),
            line(18.36, 18.36, 19.78, 19.78),
            line(1, 12, 3, 12),
            line(21, 12, 23, 12),
            line(4.22, 19.78, 5.64, 18.36),
            line(18.36, 5.64, 19.78, 4.22),
        ]);
    },

    /** 달 (라이트 모드에서 표시 — 다크로 전환) */
    moon(size = 20) {
        return svg(size, [
            path('M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'),
        ]);
    },

    /** 알림 벨 */
    bell(size = 20) {
        return svg(size, [
            path('M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9'),
            path('M13.73 21a2 2 0 0 1-3.46 0'),
        ]);
    },

    /** 뒤로가기 (chevron left) */
    chevronLeft(size = 24) {
        return svg(size, [
            path('M15 19L8 12L15 5'),
        ]);
    },

    /* ─── 마크다운 에디터 툴바 아이콘 ─── */

    /** 굵게 (B) */
    bold(size = 16) {
        return svg(size, [
            path('M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z'),
            path('M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z'),
        ]);
    },

    /** 기울임 (I) */
    italic(size = 16) {
        return svg(size, [
            line(19, 4, 10, 4),
            line(14, 20, 5, 20),
            line(15, 4, 9, 20),
        ]);
    },

    /** 취소선 */
    strikethrough(size = 16) {
        return svg(size, [
            path('M16 4H9a3 3 0 0 0-3 3c0 2 1.5 3 3 3'),
            path('M8 20h7a3 3 0 0 0 3-3c0-2-1.5-3-3-3'),
            line(4, 12, 20, 12),
        ]);
    },

    /** 제목 (H) */
    heading(size = 16) {
        return svg(size, [
            path('M6 4v16'),
            path('M18 4v16'),
            path('M6 12h12'),
        ]);
    },

    /** 링크 */
    link(size = 16) {
        return svg(size, [
            path('M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'),
            path('M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'),
        ]);
    },

    /** 이미지 */
    image(size = 16) {
        return svg(size, [
            rect(3, 3, 18, 18, 2),
            circle(8.5, 8.5, 1.5),
            polyline('21 15 16 10 5 21'),
        ]);
    },

    /** 인라인 코드 </> */
    code(size = 16) {
        return svg(size, [
            polyline('16 18 22 12 16 6'),
            polyline('8 6 2 12 8 18'),
        ]);
    },

    /** 코드 블록 */
    codeBlock(size = 16) {
        return svg(size, [
            rect(2, 3, 20, 18, 2),
            polyline('10 9 6 12 10 15'),
            polyline('14 9 18 12 14 15'),
        ]);
    },

    /** 인용 (blockquote) */
    quote(size = 16) {
        return svg(size, [
            path('M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z'),
            path('M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z'),
        ]);
    },

    /** 순서 없는 목록 */
    listUl(size = 16) {
        return svg(size, [
            line(8, 6, 21, 6),
            line(8, 12, 21, 12),
            line(8, 18, 21, 18),
            line(3, 6, 3.01, 6),
            line(3, 12, 3.01, 12),
            line(3, 18, 3.01, 18),
        ]);
    },

    /** 순서 있는 목록 */
    listOl(size = 16) {
        return svg(size, [
            line(10, 6, 21, 6),
            line(10, 12, 21, 12),
            line(10, 18, 21, 18),
            path('M4 6h1v4'),
            path('M4 10h2'),
            path('M6 18H4c0-1 2-2 2-3s-1-1.5-2-1'),
        ]);
    },

    /** 구분선 (마이너스) */
    minus(size = 16) {
        return svg(size, [
            line(5, 12, 19, 12),
        ]);
    },

    /** 미리보기 (눈) */
    eye(size = 16) {
        return svg(size, [
            path('M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'),
            circle(12, 12, 3),
        ]);
    },

    /** 미리보기 해제 (눈 감기) */
    eyeOff(size = 16) {
        return svg(size, [
            path('M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94'),
            path('M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19'),
            path('M14.12 14.12a3 3 0 1 1-4.24-4.24'),
            line(1, 1, 23, 23),
        ]);
    },
};
