// js/controllers/AdminReportController.js
// 신고 관리 페이지 컨트롤러

import ReportModel from '../models/ReportModel.js';
import AdminReportView from '../views/AdminReportView.js';
import ModalView from '../views/ModalView.js';
import Logger from '../utils/Logger.js';
import { NAV_PATHS, UI_MESSAGES } from '../constants.js';
import { showToast, showToastAndRedirect } from '../views/helpers.js';
import { resolveNavPath } from '../config.js';

const logger = Logger.createLogger('AdminReportController');

/**
 * 신고 관리 페이지 컨트롤러
 */
class AdminReportController {
    constructor() {
        this.currentStatus = 'pending';
        this.currentOffset = 0;
        this.LIMIT = 20;
        this.isLoading = false;
        this.hasMore = true;
        this.scrollObserver = null;
        this.resolveTargetId = null;
        this.resolveAction = null; // 'resolved' | 'dismissed'
    }

    /**
     * 컨트롤러 초기화
     * @param {object|null} currentUser - 현재 사용자 정보
     */
    async init(currentUser) {
        // 비관리자 접근 차단
        if (!currentUser || currentUser.role !== 'admin') {
            showToastAndRedirect(UI_MESSAGES.ADMIN_REQUIRED, NAV_PATHS.MAIN);
            return;
        }

        this._setupFilterTabs();
        this._setupInfiniteScroll();
        await this._loadReports();

        // 뒤로가기
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                location.href = resolveNavPath(NAV_PATHS.MAIN);
            });
        }
    }

    /**
     * 필터 탭 이벤트 설정
     * @private
     */
    _setupFilterTabs() {
        const tabContainer = document.getElementById('report-filter-tabs');
        if (!tabContainer) return;

        tabContainer.addEventListener('click', (e) => {
            const tab = e.target.closest('.report-filter-tab');
            if (!tab) return;

            const status = tab.dataset.status;
            if (status === this.currentStatus) return;

            this.currentStatus = status;
            AdminReportView.updateFilterTabs(status);
            this._resetAndReload();
        });
    }

    /**
     * 무한 스크롤 설정
     * @private
     */
    _setupInfiniteScroll() {
        const sentinel = document.getElementById('loading-sentinel');
        if (!sentinel) return;

        this.scrollObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !this.isLoading && this.hasMore) {
                this._loadReports();
            }
        }, { threshold: 0.1 });

        this.scrollObserver.observe(sentinel);
    }

    /**
     * 목록 초기화 및 재로드
     * @private
     */
    _resetAndReload() {
        this.currentOffset = 0;
        this.hasMore = true;
        this.isLoading = false;
        this._loadReports();
    }

    /**
     * 신고 목록 로드
     * @private
     */
    async _loadReports() {
        if (this.isLoading || !this.hasMore) return;

        this.isLoading = true;
        const listEl = document.getElementById('report-list');
        const sentinel = document.getElementById('loading-sentinel');

        AdminReportView.toggleLoadingSentinel(sentinel, true);

        try {
            const result = await ReportModel.getReports(
                this.currentStatus, this.currentOffset, this.LIMIT
            );

            if (!result.ok) throw new Error('신고 목록 로드 실패');

            const reports = result.data?.data?.reports || [];
            const pagination = result.data?.data?.pagination;

            if (reports.length < this.LIMIT ||
                (pagination && !pagination.has_more)) {
                this.hasMore = false;
                AdminReportView.toggleLoadingSentinel(sentinel, false);
            }

            const isAppend = this.currentOffset > 0;
            if (this.currentOffset === 0 && reports.length === 0) {
                AdminReportView.showEmptyState(listEl);
                this.hasMore = false;
                AdminReportView.toggleLoadingSentinel(sentinel, false);
                return;
            }

            AdminReportView.renderReports(listEl, reports, {
                onResolve: (reportId) => this._confirmResolve(reportId, 'resolved'),
                onDismiss: (reportId) => this._confirmResolve(reportId, 'dismissed'),
            }, isAppend);

            this.currentOffset += reports.length;

        } catch (error) {
            logger.error('신고 목록 로드 실패', error);
            showToast(UI_MESSAGES.UNKNOWN_ERROR);
        } finally {
            this.isLoading = false;
            if (!this.hasMore) {
                const s = document.getElementById('loading-sentinel');
                if (s) AdminReportView.toggleLoadingSentinel(s, false);
            }
        }
    }

    /**
     * 처리 확인 모달
     * @param {number} reportId - 신고 ID
     * @param {string} action - 'resolved' 또는 'dismissed'
     * @private
     */
    _confirmResolve(reportId, action) {
        this.resolveTargetId = reportId;
        this.resolveAction = action;

        const title = action === 'resolved'
            ? '신고를 처리하시겠습니까?\n대상 콘텐츠가 삭제됩니다.'
            : '신고를 기각하시겠습니까?';

        ModalView.setupDeleteModal({
            modalId: 'confirm-modal',
            cancelBtnId: 'modal-cancel-btn',
            confirmBtnId: 'modal-confirm-btn',
            onConfirm: () => this._executeResolve(),
        });

        ModalView.openConfirmModal('confirm-modal', title);
    }

    /**
     * 처리 실행
     * @private
     */
    async _executeResolve() {
        if (!this.resolveTargetId || !this.resolveAction) return;

        try {
            const result = await ReportModel.resolveReport(
                this.resolveTargetId, this.resolveAction
            );

            ModalView.closeModal('confirm-modal');

            if (result.ok) {
                showToast(this.resolveAction === 'resolved'
                    ? UI_MESSAGES.REPORT_RESOLVE_SUCCESS
                    : UI_MESSAGES.REPORT_DISMISS_SUCCESS);
                this._resetAndReload();
            } else {
                showToast(UI_MESSAGES.UNKNOWN_ERROR);
            }
        } catch (error) {
            logger.error('신고 처리 실패', error);
            ModalView.closeModal('confirm-modal');
            showToast(UI_MESSAGES.UNKNOWN_ERROR);
        }

        this.resolveTargetId = null;
        this.resolveAction = null;
    }
}

export default AdminReportController;
