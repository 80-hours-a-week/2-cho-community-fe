// @ts-check
// js/controllers/WikiDetailController.js
// 위키 상세 페이지 컨트롤러

import WikiModel from '../models/WikiModel.js';
import WikiDetailView from '../views/WikiDetailView.js';
import Logger from '../utils/Logger.js';
import { NAV_PATHS } from '../constants.js';
import { resolveNavPath } from '../config.js';
import { showToast } from '../views/helpers.js';

const logger = Logger.createLogger('WikiDetailController');
class WikiDetailController {
    constructor() {
        /** @type {string|null} */
        this.slug = null;
        /** @type {object|null} */
        this.pageData = null;
    }

    /**
     * 컨트롤러 초기화
     * @param {Promise<object|null>|null} [currentUserPromise]
     */
    async init(currentUserPromise = null) {
        /** @type {Record<string, any>|null} */
        this.currentUser = currentUserPromise ? await currentUserPromise : null;
        // URL에서 slug 추출 (/wiki/slug-name)
        const rawSlug = window.location.pathname.replace(/^\/wiki\//, '');
        this.slug = decodeURIComponent(rawSlug);

        if (!this.slug || this.slug === '' || this.slug === 'wiki') {
            showToast('잘못된 접근입니다.');
            location.href = resolveNavPath(NAV_PATHS.WIKI);
            return;
        }

        this._setupBackButton();
        await this._loadWikiPage();
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
     * 위키 페이지 로드
     * @private
     */
    async _loadWikiPage() {
        const container = document.getElementById('wiki-content');
        try {
            const result = await WikiModel.getWikiPage(/** @type {string} */ (this.slug));
            if (!result.ok) {
                showToast('위키 페이지를 불러오지 못했습니다.');
                return;
            }

            this.pageData = result.data?.data?.wiki_page;

            // 현재 사용자 확인
            const currentUserId = this.currentUser?.user_id || null;

            WikiDetailView.renderWikiPage(/** @type {HTMLElement} */ (container), /** @type {Record<string, any>} */ (this.pageData), currentUserId);

            // 수정 버튼 이벤트
            this._setupEditButton();
            // 삭제 버튼 이벤트
            this._setupDeleteButton();
        } catch (error) {
            logger.error('위키 페이지 로드 실패', error);
            showToast('위키 페이지를 불러오지 못했습니다.');
        }
    }

    /**
     * 수정 버튼 설정
     * @private
     */
    _setupEditButton() {
        const editBtn = document.getElementById('wiki-edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                location.href = resolveNavPath(NAV_PATHS.WIKI_EDIT(/** @type {string} */ (this.slug)));
            });
        }
    }

    /**
     * 삭제 버튼 설정
     * @private
     */
    _setupDeleteButton() {
        const deleteBtn = document.getElementById('wiki-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                if (!confirm('정말 이 위키 페이지를 삭제하시겠습니까?')) return;

                try {
                    const result = await WikiModel.deleteWikiPage(/** @type {string} */ (this.slug));
                    if (result.ok) {
                        showToast('위키 페이지가 삭제되었습니다.');
                        location.href = resolveNavPath(NAV_PATHS.WIKI);
                    } else {
                        showToast(/** @type {any} */ (result.data)?.detail || '위키 페이지 삭제에 실패했습니다.');
                    }
                } catch (error) {
                    logger.error('위키 페이지 삭제 실패', error);
                    showToast('위키 페이지 삭제에 실패했습니다.');
                }
            });
        }
    }
}

export default WikiDetailController;
