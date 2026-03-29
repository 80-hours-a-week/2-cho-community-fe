// @ts-check
// js/controllers/WikiHistoryController.js
// 위키 편집 기록 페이지 컨트롤러

import WikiModel from '../models/WikiModel.js';
import WikiHistoryView from '../views/WikiHistoryView.js';
import BaseListView from '../views/BaseListView.js';
import Logger from '../utils/Logger.js';
import { NAV_PATHS } from '../constants.js';
import { resolveNavPath } from '../config.js';
import { showToast } from '../views/helpers.js';

const logger = Logger.createLogger('WikiHistoryController');

class WikiHistoryController {
    constructor() {
        /** @type {string|null} */
        this.slug = null;
    }

    /**
     * 컨트롤러 초기화
     * @param {Promise<object|null>|null} [currentUserPromise]
     */
    async init(currentUserPromise = null) {
        if (currentUserPromise) await currentUserPromise;

        // URL에서 slug 추출: /wiki/{slug}/history
        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        // 기대 형태: ['wiki', '{slug}', 'history']
        if (pathSegments.length >= 3 && pathSegments[0] === 'wiki' && pathSegments[pathSegments.length - 1] === 'history') {
            this.slug = decodeURIComponent(pathSegments.slice(1, -1).join('/'));
        }

        if (!this.slug) {
            showToast('잘못된 접근입니다.');
            location.href = resolveNavPath(NAV_PATHS.WIKI);
            return;
        }

        this._setupBackButton();
        await this._loadHistory();
    }

    /**
     * 뒤로가기 버튼 설정
     * @private
     */
    _setupBackButton() {
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    location.href = resolveNavPath(NAV_PATHS.WIKI);
                }
            });
        }
    }

    /**
     * 편집 기록 로드
     * @private
     */
    async _loadHistory() {
        const container = document.getElementById('history-content');
        if (!container) return;

        try {
            const result = await WikiModel.getHistory(/** @type {string} */ (this.slug));
            if (!result.ok) {
                showToast('편집 기록을 불러오지 못했습니다.');
                return;
            }

            const revisions = /** @type {any} */ (result.data?.data)?.revisions || [];

            if (revisions.length === 0) {
                BaseListView.renderEmptyState(container, '편집 기록이 없습니다.', 'git log --oneline');
                return;
            }

            const currentRevision = revisions[0]?.revision_number || 1;

            WikiHistoryView.renderHistory(
                container,
                revisions,
                currentRevision,
                /** @type {string} */ (this.slug),
            );

            this._setupCompareButton();
        } catch (error) {
            logger.error('편집 기록 로드 실패', error);
            showToast('편집 기록을 불러오지 못했습니다.');
        }
    }

    /**
     * 비교 버튼 이벤트 설정
     * @private
     */
    _setupCompareButton() {
        const compareBtn = document.getElementById('compare-btn');
        if (!compareBtn) return;

        compareBtn.addEventListener('click', () => {
            const fromRadio = /** @type {HTMLInputElement|null} */ (
                document.querySelector('input[name="from-rev"]:checked')
            );
            const toRadio = /** @type {HTMLInputElement|null} */ (
                document.querySelector('input[name="to-rev"]:checked')
            );

            if (!fromRadio || !toRadio) {
                showToast('비교할 리비전을 선택해주세요.');
                return;
            }

            const fromRev = fromRadio.value;
            const toRev = toRadio.value;

            if (fromRev === toRev) {
                showToast('서로 다른 리비전을 선택해주세요.');
                return;
            }

            location.href = resolveNavPath(
                NAV_PATHS.WIKI_DIFF(/** @type {string} */ (this.slug)) + `?from=${fromRev}&to=${toRev}`
            );
        });
    }
}

export default WikiHistoryController;
