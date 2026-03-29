// @ts-check
// js/views/WikiDiffView.js
// 위키 리비전 diff 비교 렌더링

import { createElement } from '../utils/dom.js';
import { formatDate } from '../utils/formatters.js';

class WikiDiffView {
    /**
     * diff 비교 결과 렌더링
     * @param {HTMLElement} container
     * @param {Record<string, any>} diffData - diff 데이터
     */
    static renderDiff(container, diffData) {
        if (!container) return;
        container.textContent = '';

        const fromRev = diffData.from_revision || 0;
        const toRev = diffData.to_revision || 0;
        const fromEditor = diffData.from_editor?.nickname || '알 수 없음';
        const toEditor = diffData.to_editor?.nickname || '알 수 없음';
        const fromDate = diffData.from_date ? formatDate(new Date(diffData.from_date)) : '';
        const toDate = diffData.to_date ? formatDate(new Date(diffData.to_date)) : '';
        const titleChanged = diffData.title_changed || false;
        const changes = diffData.changes || [];

        // 헤더
        container.appendChild(createElement('h1', { className: 'wiki-detail-title' }, [
            `리비전 ${fromRev} → 리비전 ${toRev} 비교`,
        ]));

        // 편집자 정보
        container.appendChild(createElement('div', { className: 'wiki-detail-meta' }, [
            createElement('span', {}, [`${fromEditor} (${fromDate})`]),
            createElement('span', {}, [' → ']),
            createElement('span', {}, [`${toEditor} (${toDate})`]),
        ]));

        // 제목 변경 알림
        if (titleChanged) {
            container.appendChild(createElement('div', { className: 'wiki-revision-banner' }, [
                '제목이 변경되었습니다',
            ]));
        }

        // diff 컨테이너: 좌우 패널
        const diffContainer = createElement('div', { className: 'wiki-diff-container' });

        // 왼쪽 패널
        const leftPanel = createElement('div', { className: 'wiki-diff-panel' });
        leftPanel.appendChild(createElement('div', { className: 'wiki-diff-panel-header' }, [
            `리비전 ${fromRev}`,
        ]));

        // 오른쪽 패널
        const rightPanel = createElement('div', { className: 'wiki-diff-panel' });
        rightPanel.appendChild(createElement('div', { className: 'wiki-diff-panel-header' }, [
            `리비전 ${toRev}`,
        ]));

        // 변경 사항 렌더링
        for (const change of changes) {
            const type = change.type || 'equal';
            const line = change.line || change.content || '';

            if (type === 'equal') {
                leftPanel.appendChild(WikiDiffView._createDiffLine(line, 'diff-line-equal'));
                rightPanel.appendChild(WikiDiffView._createDiffLine(line, 'diff-line-equal'));
            } else if (type === 'delete') {
                leftPanel.appendChild(WikiDiffView._createDiffLine(line, 'diff-line-delete'));
            } else if (type === 'insert') {
                rightPanel.appendChild(WikiDiffView._createDiffLine(line, 'diff-line-insert'));
            }
        }

        diffContainer.appendChild(leftPanel);
        diffContainer.appendChild(rightPanel);
        container.appendChild(diffContainer);
    }

    /**
     * diff 라인 요소 생성
     * @param {string} text - 라인 텍스트
     * @param {string} className - CSS 클래스
     * @returns {HTMLElement}
     * @private
     */
    static _createDiffLine(text, className) {
        const lineDiv = createElement('div', { className });
        const code = createElement('pre', {});
        code.textContent = text;
        lineDiv.appendChild(code);
        return /** @type {HTMLElement} */ (lineDiv);
    }
}

export default WikiDiffView;
