// @ts-check
// js/utils/markdown.js
// 마크다운 렌더링 유틸리티 — DOMPurify sanitization으로 XSS 방지
// 이 파일이 프로젝트에서 innerHTML을 사용하는 유일한 진입점

import { Marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';

// 선택 언어만 등록 (번들 크기 최소화)
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import xml from 'highlight.js/lib/languages/xml';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import java from 'highlight.js/lib/languages/java';
import typescript from 'highlight.js/lib/languages/typescript';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import yaml from 'highlight.js/lib/languages/yaml';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import nginx from 'highlight.js/lib/languages/nginx';
import ini from 'highlight.js/lib/languages/ini';
import diff from 'highlight.js/lib/languages/diff';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('css', css);
hljs.registerLanguage('json', json);
hljs.registerLanguage('java', java);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('c', c);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('go', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);
hljs.registerLanguage('dockerfile', dockerfile);
hljs.registerLanguage('docker', dockerfile);
hljs.registerLanguage('nginx', nginx);
hljs.registerLanguage('ini', ini);
hljs.registerLanguage('conf', ini);
hljs.registerLanguage('diff', diff);
hljs.registerLanguage('patch', diff);

// marked 인스턴스 설정
const marked = new Marked({
    breaks: true,       // \n → <br> (기존 플레인텍스트 호환)
    gfm: true,          // GitHub Flavored Markdown
    pedantic: false,
});

// 코드 하이라이팅 커스텀 렌더러 — 언어 라벨 + 복사 버튼 포함
marked.use({
    renderer: {
        code({ text, lang }) {
            const language = lang && hljs.getLanguage(lang) ? lang : null;
            const highlighted = language
                ? hljs.highlight(text, { language }).value
                : escapeHtml(text);
            const langClass = language ? ` class="language-${language}"` : '';
            const langLabel = language
                ? `<span class="code-lang-label">${escapeHtml(language)}</span>`
                : '';
            const copyBtn = '<button class="code-copy-btn" title="복사">Copy</button>';
            return `<div class="code-block-wrapper">${langLabel}${copyBtn}<pre class="hljs"><code${langClass}>${highlighted}</code></pre></div>`;
        },
    },
});

// DOMPurify 설정 — 엄격한 화이트리스트
const PURIFY_CONFIG = {
    ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'hr',
        'strong', 'em', 'del', 's', 'code', 'pre',
        'blockquote',
        'ul', 'ol', 'li',
        'a',
        'img',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'span', 'div',
        'button',
        'input', // GFM task list checkbox
    ],
    ALLOWED_ATTR: [
        'href', 'target', 'rel',
        'src', 'alt', 'title',
        'class',
        'type', 'checked', 'disabled', // task list checkbox
    ],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
    ALLOW_DATA_ATTR: false,
};

// 링크에 target="_blank" + rel="noopener noreferrer" 자동 적용
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.getAttribute('href')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
    }
});

/**
 * 마크다운 → sanitized HTML 문자열 변환
 * @param {string} markdown - 마크다운 원본
 * @returns {string} DOMPurify로 sanitize된 HTML
 */
export function renderMarkdown(markdown) {
    if (!markdown) return '';
    const rawHtml = /** @type {string} */ (marked.parse(markdown));
    return DOMPurify.sanitize(rawHtml, PURIFY_CONFIG);
}

/**
 * 마크다운을 DOM 요소에 렌더링
 * 보안: DOMPurify.sanitize()를 거친 안전한 HTML만 사용
 * @param {HTMLElement} element - 대상 DOM 요소
 * @param {string} markdown - 마크다운 원본
 */
export function renderMarkdownTo(element, markdown) {
    // DOMPurify로 sanitize된 안전한 HTML — XSS safe
    const sanitizedHtml = renderMarkdown(markdown);
    element.innerHTML = sanitizedHtml;

    // 코드 복사 버튼 이벤트 바인딩 (sanitize 후 안전한 DOM에서 바인딩)
    element.querySelectorAll('.code-copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const code = btn.closest('.code-block-wrapper')?.querySelector('code');
            if (code) {
                navigator.clipboard.writeText(code.textContent || '');
                btn.textContent = 'Copied!';
                setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
            }
        });
    });
}

/**
 * HTML 이스케이프 (하이라이팅 미지원 언어용)
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
