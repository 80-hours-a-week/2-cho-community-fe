// @ts-check
// js/views/BaseListView.js
// ListView 공통 로직 — 빈 상태, 로딩 센티널, 필터 버튼

import { createElement } from '../utils/dom.js';

/**
 * ListView 공통 Base 클래스
 * PostListView, WikiListView, PackageListView가 상속
 */
class BaseListView {
    /**
     * 빈 목록 메시지 표시
     * @param {HTMLElement} container
     * @param {string} message
     */
    static renderEmptyState(container, message) {
        if (!container) return;
        container.textContent = '';
        container.appendChild(
            createElement('div', { className: 'empty-state' }, [
                createElement('p', {}, [message]),
            ])
        );
    }

    /**
     * 로딩 센티널 표시/숨기기
     * @param {HTMLElement|null} sentinel
     * @param {boolean} show
     */
    static toggleLoadingSentinel(sentinel, show) {
        if (!sentinel) return;
        sentinel.style.display = show ? '' : 'none';
    }

    /**
     * 필터 버튼 그룹 렌더링 (카테고리 탭, 태그 필터 등 공통)
     * @param {HTMLElement} container
     * @param {Array} items - 필터 아이템 배열
     * @param {*} activeKey - 현재 활성 키 (null이면 '전체')
     * @param {Function} onSelect - 선택 핸들러 (key) => void
     * @param {object} [options]
     * @param {string} [options.className='category-filter-btn'] - 버튼 CSS 클래스
     * @param {string} [options.allLabel='전체'] - '전체' 버튼 텍스트
     * @param {Function} [options.getKey] - 아이템에서 키 추출
     * @param {Function} [options.getLabel] - 아이템에서 표시 텍스트 추출
     */
    static renderFilterButtons(container, items, activeKey, onSelect, {
        className = 'category-filter-btn',
        allLabel = '전체',
        getKey = (item) => item,
        getLabel = (item) => String(item),
    } = {}) {
        if (!container) return;
        container.textContent = '';

        // '전체' 버튼
        container.appendChild(createElement('button', {
            className: `${className}${activeKey === null ? ' active' : ''}`,
            onClick: () => onSelect(null),
        }, [allLabel]));

        // 각 아이템 버튼
        items.forEach(item => {
            const key = getKey(item);
            container.appendChild(createElement('button', {
                className: `${className}${activeKey === key ? ' active' : ''}`,
                onClick: () => onSelect(key),
            }, [getLabel(item)]));
        });
    }
}

export default BaseListView;
