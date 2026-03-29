// @ts-check
// js/controllers/WikiRevisionController.js
// 위키 리비전 상세 보기 컨트롤러

import WikiModel from '../models/WikiModel.js';
import WikiRevisionView from '../views/WikiRevisionView.js';
import Logger from '../utils/Logger.js';
import { NAV_PATHS } from '../constants.js';
import { resolveNavPath } from '../config.js';
import { showToast } from '../views/helpers.js';

const logger = Logger.createLogger('WikiRevisionController');

class WikiRevisionController {
    constructor() {
        /** @type {string|null} */
        this.slug = null;
        /** @type {number|null} */
        this.revisionNumber = null;
    }

    /**
     * 컨트롤러 초기화
     * @param {Promise<object|null>|null} [currentUserPromise]
     */
    async init(currentUserPromise = null) {
        /** @type {Record<string, any>|null} */
        this.currentUser = currentUserPromise ? await currentUserPromise : null;

        // URL에서 slug와 revision_number 추출 (/wiki/{slug}/revisions/{n})
        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        // 예: ['wiki', 'slug-name', 'revisions', '3']
        if (pathSegments.length < 4 || pathSegments[0] !== 'wiki' || pathSegments[2] !== 'revisions') {
            showToast('잘못된 접근입니다.');
            location.href = resolveNavPath(NAV_PATHS.WIKI);
            return;
        }

        this.slug = decodeURIComponent(pathSegments[1]);
        this.revisionNumber = parseInt(pathSegments[3], 10);

        if (!this.slug || isNaN(/** @type {number} */ (this.revisionNumber))) {
            showToast('잘못된 접근입니다.');
            location.href = resolveNavPath(NAV_PATHS.WIKI);
            return;
        }

        this._setupBackButton();
        await this._loadRevision();
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
     * 리비전 로드
     * @private
     */
    async _loadRevision() {
        const container = document.getElementById('revision-content');
        try {
            const result = await WikiModel.getRevision(
                /** @type {string} */ (this.slug),
                /** @type {number} */ (this.revisionNumber),
            );
            if (!result.ok) {
                showToast('리비전을 불러오지 못했습니다.');
                return;
            }

            const revision = result.data?.data?.revision || result.data?.data || result.data;

            WikiRevisionView.renderRevision(
                /** @type {HTMLElement} */ (container),
                revision,
                /** @type {string} */ (this.slug),
            );

            // 롤백 버튼 이벤트
            this._setupRollbackButton();
        } catch (error) {
            logger.error('리비전 로드 실패', error);
            showToast('리비전을 불러오지 못했습니다.');
        }
    }

    /**
     * 롤백 버튼 설정
     * @private
     */
    _setupRollbackButton() {
        const rollbackBtn = document.getElementById('rollback-btn');
        if (rollbackBtn) {
            rollbackBtn.addEventListener('click', async () => {
                const revNum = /** @type {number} */ (this.revisionNumber);
                if (!confirm(`리비전 ${revNum}(으)로 롤백하시겠습니까?`)) return;

                try {
                    const result = await WikiModel.rollback(
                        /** @type {string} */ (this.slug),
                        revNum,
                    );
                    if (result.ok) {
                        showToast('롤백이 완료되었습니다.');
                        location.href = resolveNavPath(NAV_PATHS.WIKI_DETAIL(/** @type {string} */ (this.slug)));
                    } else {
                        showToast(/** @type {any} */ (result.data)?.detail || '롤백에 실패했습니다.');
                    }
                } catch (error) {
                    logger.error('롤백 실패', error);
                    showToast('롤백에 실패했습니다.');
                }
            });
        }
    }
}

export default WikiRevisionController;
