// @ts-check
// js/views/WikiHistoryView.js
// 위키 편집 기록 페이지 렌더링

import { createElement } from '../utils/dom.js';
import { formatDate } from '../utils/formatters.js';
import { createDistroBadge } from '../utils/distro.js';
import { resolveNavPath } from '../config.js';
import { NAV_PATHS } from '../constants.js';

class WikiHistoryView {
    /**
     * 위키 편집 기록 렌더링
     * @param {HTMLElement} container
     * @param {Array<Record<string, any>>} revisions - 리비전 목록
     * @param {number} currentRevision - 현재(최신) 리비전 번호
     * @param {string} slug - 위키 페이지 slug
     */
    static renderHistory(container, revisions, currentRevision, slug) {
        if (!container) return;
        container.textContent = '';

        // 제목
        container.appendChild(createElement('h2', { className: 'wiki-detail-title' }, ['편집 기록']));

        // 위키로 돌아가기 링크
        container.appendChild(createElement('a', {
            className: 'nav-link-btn',
            href: resolveNavPath(NAV_PATHS.WIKI_DETAIL(slug)),
        }, ['위키로 돌아가기']));

        // 테이블
        const thead = createElement('thead', {}, [
            createElement('tr', {}, [
                createElement('th', {}, ['From']),
                createElement('th', {}, ['To']),
                createElement('th', {}, ['리비전 #']),
                createElement('th', {}, ['편집자']),
                createElement('th', {}, ['편집 요약']),
                createElement('th', {}, ['날짜']),
                createElement('th', {}, ['보기']),
            ]),
        ]);

        const tbody = createElement('tbody');

        revisions.forEach((rev, index) => {
            const revNum = rev.revision_number;
            const nickname = rev.editor?.nickname || rev.editor_nickname || '알 수 없음';
            const distro = rev.editor?.distro || null;
            const summary = rev.edit_summary || '';
            const date = rev.created_at ? formatDate(new Date(rev.created_at)) : '';

            // from 라디오: 기본값은 두 번째(index===1)
            const fromRadio = createElement('input', {
                type: 'radio',
                name: 'from-rev',
                value: String(revNum),
            });
            if (index === 1) {
                fromRadio.setAttribute('checked', 'checked');
            }

            // to 라디오: 기본값은 첫 번째(index===0)
            const toRadio = createElement('input', {
                type: 'radio',
                name: 'to-rev',
                value: String(revNum),
            });
            if (index === 0) {
                toRadio.setAttribute('checked', 'checked');
            }

            // 편집자 셀: 배포판 뱃지 + 닉네임
            const editorChildren = [nickname];
            const badge = createDistroBadge(distro);
            if (badge) {
                editorChildren.push(badge);
            }

            // 보기 링크
            const viewLink = createElement('a', {
                className: 'nav-link-btn',
                href: resolveNavPath(NAV_PATHS.WIKI_REVISION(slug, revNum)),
            }, ['보기']);

            const row = createElement('tr', {}, [
                createElement('td', {}, [fromRadio]),
                createElement('td', {}, [toRadio]),
                createElement('td', {}, [String(revNum)]),
                createElement('td', { className: 'wiki-history-editor' }, editorChildren),
                createElement('td', {}, [summary]),
                createElement('td', {}, [date]),
                createElement('td', {}, [viewLink]),
            ]);

            tbody.appendChild(row);
        });

        const table = createElement('table', { className: 'wiki-history-table' }, [thead, tbody]);
        container.appendChild(table);

        // 비교 버튼
        const compareBtn = createElement('button', {
            className: 'nav-link-btn',
            id: 'compare-btn',
            textContent: '비교',
        });
        container.appendChild(createElement('div', { className: 'wiki-detail-actions' }, [compareBtn]));
    }
}

export default WikiHistoryView;
