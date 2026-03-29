// @ts-check
// js/controllers/WikiDiffController.js
// 위키 리비전 diff 비교 컨트롤러

import WikiModel from '../models/WikiModel.js';
import WikiDiffView from '../views/WikiDiffView.js';
import Logger from '../utils/Logger.js';
import { NAV_PATHS } from '../constants.js';
import { resolveNavPath } from '../config.js';
import { showToast } from '../views/helpers.js';
import { createElement } from '../utils/dom.js';

const logger = Logger.createLogger('WikiDiffController');

class WikiDiffController {
    constructor() {
        /** @type {string|null} */
        this.slug = null;
        /** @type {number|null} */
        this.fromRev = null;
        /** @type {number|null} */
        this.toRev = null;
    }

    /**
     * 컨트롤러 초기화
     * @param {Promise<object|null>|null} [currentUserPromise]
     */
    async init(currentUserPromise = null) {
        /** @type {Record<string, any>|null} */
        this.currentUser = currentUserPromise ? await currentUserPromise : null;

        // URL에서 slug 추출 (/wiki/{slug}/diff)
        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        // 예: ['wiki', 'slug-name', 'diff']
        if (pathSegments.length < 3 || pathSegments[0] !== 'wiki' || pathSegments[2] !== 'diff') {
            showToast('잘못된 접근입니다.');
            location.href = resolveNavPath(NAV_PATHS.WIKI);
            return;
        }

        this.slug = decodeURIComponent(pathSegments[1]);

        // 쿼리 파라미터에서 from, to 추출
        const params = new URLSearchParams(window.location.search);
        const fromStr = params.get('from');
        const toStr = params.get('to');

        if (!fromStr || !toStr) {
            showToast('비교할 리비전을 선택해주세요.');
            location.href = resolveNavPath(NAV_PATHS.WIKI_HISTORY(this.slug));
            return;
        }

        this.fromRev = parseInt(fromStr, 10);
        this.toRev = parseInt(toStr, 10);

        if (isNaN(this.fromRev) || isNaN(this.toRev)) {
            showToast('잘못된 리비전 번호입니다.');
            location.href = resolveNavPath(NAV_PATHS.WIKI_HISTORY(this.slug));
            return;
        }

        this._setupBackButton();
        await this._loadDiff();
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
                    location.href = resolveNavPath(NAV_PATHS.WIKI_HISTORY(/** @type {string} */ (this.slug)));
                }
            });
        }
    }

    /**
     * diff 데이터 로드
     * @private
     */
    async _loadDiff() {
        const container = document.getElementById('diff-content');
        try {
            const result = await WikiModel.getDiff(
                /** @type {string} */ (this.slug),
                /** @type {number} */ (this.fromRev),
                /** @type {number} */ (this.toRev),
            );
            if (!result.ok) {
                const status = result.status;
                if (status === 400) {
                    showToast('리비전 순서가 올바르지 않습니다.');
                } else if (status === 404) {
                    showToast('리비전을 찾을 수 없습니다.');
                } else {
                    showToast(/** @type {any} */ (result.data)?.detail || 'diff를 불러오지 못했습니다.');
                }
                return;
            }

            const diffData = result.data?.data?.diff || result.data?.data || result.data;

            WikiDiffView.renderDiff(/** @type {HTMLElement} */ (container), diffData);

            // 편집 기록으로 돌아가기 링크 추가
            if (container) {
                container.appendChild(createElement('div', { className: 'wiki-detail-actions' }, [
                    createElement('a', {
                        className: 'nav-link-btn',
                        href: resolveNavPath(NAV_PATHS.WIKI_HISTORY(/** @type {string} */ (this.slug))),
                        textContent: '편집 기록으로 돌아가기',
                    }),
                ]));
            }
        } catch (error) {
            logger.error('diff 로드 실패', error);
            showToast('diff를 불러오지 못했습니다.');
        }
    }
}

export default WikiDiffController;
