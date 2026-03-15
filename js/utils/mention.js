// @ts-check
// js/utils/mention.js
// @멘션 하이라이트 유틸리티 — DOM 기반 텍스트 노드 순회

import { resolveNavPath } from '../config.js';
import { NAV_PATHS } from '../constants.js';

const MENTION_RE = /@([a-zA-Z0-9_]{3,10})/g;

/**
 * 멘션 클릭 시 닉네임으로 사용자를 검색하여 프로필 페이지로 이동합니다.
 * @param {string} nickname - 클릭된 닉네임
 */
async function _navigateToProfile(nickname) {
    try {
        const { default: UserModel } = await import('../models/UserModel.js');
        const results = await UserModel.searchUsers(nickname, 5);
        const exact = results.find(u => u.nickname === nickname);
        if (exact) {
            location.href = resolveNavPath(NAV_PATHS.USER_PROFILE(exact.user_id));
        }
    } catch {
        // 비로그인 상태 등에서 401 → 조용히 무시
    }
}

/**
 * 컨테이너 내부의 텍스트 노드를 순회하며 @멘션을 클릭 가능한 하이라이트로 변환합니다.
 * innerHTML 미사용 — TreeWalker 기반으로 XSS 안전.
 * 마크다운 렌더링 후 호출해야 합니다.
 * @param {HTMLElement} container - 멘션을 하이라이트할 컨테이너 요소
 */
export function highlightMentions(container) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const textNodes = [];

    let node;
    while ((node = walker.nextNode())) {
        if (node.textContent && MENTION_RE.test(node.textContent)) {
            textNodes.push(node);
        }
        MENTION_RE.lastIndex = 0;
    }

    for (const textNode of textNodes) {
        const fragment = document.createDocumentFragment();
        const text = textNode.textContent || '';
        let lastIndex = 0;

        MENTION_RE.lastIndex = 0;
        let match;
        while ((match = MENTION_RE.exec(text)) !== null) {
            // 매치 이전 텍스트
            if (match.index > lastIndex) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
            }

            // @멘션 — 클릭 가능한 span
            const nickname = match[1];
            const span = document.createElement('span');
            span.className = 'mention-highlight';
            span.textContent = match[0]; // @닉네임 전체
            span.role = 'link';
            span.tabIndex = 0;
            span.addEventListener('click', (e) => {
                e.stopPropagation();
                _navigateToProfile(nickname);
            });
            fragment.appendChild(span);

            lastIndex = MENTION_RE.lastIndex;
        }

        // 남은 텍스트
        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }

        textNode.parentNode?.replaceChild(fragment, textNode);
    }
}
