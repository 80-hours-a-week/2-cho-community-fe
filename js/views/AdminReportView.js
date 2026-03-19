// js/views/AdminReportView.js
// 신고 관리 페이지 렌더링 관련 로직

import { formatDate } from '../utils/formatters.js';
import { createElement } from '../utils/dom.js';
import { REPORT_REASONS } from '../constants.js';

/**
 * 신고 관리 View 클래스
 */
class AdminReportView {
    /**
     * 신고 카드 요소 생성
     * @param {object} report - 신고 데이터
     * @param {object} handlers - 이벤트 핸들러
     * @returns {HTMLElement}
     */
    static createReportCard(report, handlers) {
        const dateStr = formatDate(new Date(report.created_at));
        const reasonLabel = REPORT_REASONS[report.reason] || report.reason;
        const targetLabel = report.target_type === 'post' ? '게시글' : '댓글';

        const statusBadge = createElement('span', {
            className: `report-status-badge status-${report.status}`,
        }, [report.status === 'pending' ? '대기중' :
            report.status === 'resolved' ? '처리완료' : '기각']);

        const cardChildren = [
            createElement('div', { className: 'report-card-header' }, [
                createElement('div', { className: 'report-meta' }, [
                    createElement('span', { className: 'report-target-type' }, [`[${targetLabel}]`]),
                    statusBadge,
                ]),
                createElement('span', { className: 'report-date' }, [dateStr]),
            ]),
            createElement('div', { className: 'report-card-body' }, [
                createElement('div', { className: 'report-info-row' }, [
                    createElement('span', { className: 'report-label' }, ['신고자']),
                    createElement('span', {}, [report.reporter_nickname || `ID: ${report.reporter_id}`]),
                ]),
                createElement('div', { className: 'report-info-row' }, [
                    createElement('span', { className: 'report-label' }, ['사유']),
                    createElement('span', {}, [reasonLabel]),
                ]),
                ...(report.description ? [
                    createElement('div', { className: 'report-info-row' }, [
                        createElement('span', { className: 'report-label' }, ['상세']),
                        createElement('span', {}, [report.description]),
                    ]),
                ] : []),
                createElement('div', { className: 'report-info-row' }, [
                    createElement('span', { className: 'report-label' }, ['대상 ID']),
                    createElement('span', {}, [`${targetLabel} #${report.target_id}`]),
                ]),
            ]),
        ];

        // 대기중 상태에서만 처리 버튼 표시
        if (report.status === 'pending') {
            cardChildren.push(
                createElement('div', { className: 'report-card-actions' }, [
                    createElement('button', {
                        className: 'report-action-btn resolve-btn',
                        onClick: () => handlers.onResolve(report.id),
                    }, ['처리 (삭제)']),
                    createElement('button', {
                        className: 'report-action-btn dismiss-btn',
                        onClick: () => handlers.onDismiss(report.id),
                    }, ['기각']),
                ])
            );
        }

        return createElement('div', { className: 'report-card' }, cardChildren);
    }

    /**
     * 신고 목록 렌더링
     * @param {HTMLElement} container - 목록 컨테이너
     * @param {Array} reports - 신고 배열
     * @param {object} handlers - 이벤트 핸들러
     * @param {boolean} [append=false] - 기존 목록에 추가할지 여부
     */
    static renderReports(container, reports, handlers, append = false) {
        if (!append) container.textContent = '';

        const fragment = document.createDocumentFragment();
        reports.forEach(report => {
            fragment.appendChild(AdminReportView.createReportCard(report, handlers));
        });
        container.appendChild(fragment);
    }

    /**
     * 필터 탭 활성화 상태 업데이트
     * @param {string} activeStatus - 현재 활성화된 상태
     */
    static updateFilterTabs(activeStatus) {
        const tabs = document.querySelectorAll('.report-filter-tab');
        tabs.forEach(tab => {
            if (tab.dataset.status === activeStatus) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }

    /**
     * 빈 상태 표시
     * @param {HTMLElement} container - 목록 컨테이너
     */
    static showEmptyState(container) {
        container.textContent = '';
        container.appendChild(
            createElement('div', { className: 'terminal-state' }, [
                createElement('div', { className: 'terminal-state__bar' }, [
                    createElement('span', { className: 'terminal-state__dot terminal-state__dot--red' }),
                    createElement('span', { className: 'terminal-state__dot terminal-state__dot--yellow' }),
                    createElement('span', { className: 'terminal-state__dot terminal-state__dot--green' }),
                ]),
                createElement('div', { className: 'terminal-state__body' }, [
                    createElement('p', {}, [
                        createElement('span', { className: 'terminal-state__prompt' }, ['$']),
                        'ls reports/',
                    ]),
                    createElement('span', { className: 'terminal-state__output' }, ['처리할 신고가 없습니다.']),
                    createElement('span', { className: 'terminal-state__cursor' }, ['_']),
                ]),
            ])
        );
    }

    /**
     * 로딩 센티널 표시/숨기기
     * @param {HTMLElement} sentinel - 센티널 요소
     * @param {boolean} show - 표시 여부
     */
    static toggleLoadingSentinel(sentinel, show) {
        if (sentinel) {
            sentinel.style.visibility = show ? 'visible' : 'hidden';
            sentinel.style.display = 'block';
            sentinel.innerText = show ? 'loading...' : '';
        }
    }
}

export default AdminReportView;
