// @ts-check
// js/utils/mention.js
// @멘션 하이라이트 유틸리티 — DOM 기반 텍스트 노드 순회

const MENTION_RE = /@(\S+)/g;

/**
 * 컨테이너 내부의 텍스트 노드를 순회하며 @멘션을 하이라이트 span으로 변환합니다.
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

            // @멘션 span
            const span = document.createElement('span');
            span.className = 'mention-highlight';
            span.textContent = match[0]; // @닉네임 전체
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
