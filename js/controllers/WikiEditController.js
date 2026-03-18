// @ts-check
// js/controllers/WikiEditController.js
// 위키 편집 페이지 컨트롤러

import WikiModel from '../models/WikiModel.js';
import WikiFormView from '../views/WikiFormView.js';
import BaseWikiController from './BaseWikiController.js';
import { NAV_PATHS } from '../constants.js';
import { resolveNavPath } from '../config.js';
import { showToast } from '../views/helpers.js';

class WikiEditController extends BaseWikiController {
    constructor() {
        super('WikiEditController');
        /** @type {string|null} */
        this.slug = null;
    }

    /**
     * 컨트롤러 초기화
     * @param {object|null} currentUser
     */
    async init(currentUser) {
        if (!this._requireAuth(currentUser)) return;

        const urlParams = new URLSearchParams(window.location.search);
        this.slug = urlParams.get('slug');

        if (!this.slug) {
            showToast('잘못된 접근입니다.');
            location.href = resolveNavPath(NAV_PATHS.WIKI);
            return;
        }

        this._setupBackButton(NAV_PATHS.WIKI_DETAIL(this.slug));
        await this._loadAndSetupForm();
    }

    /**
     * 기존 페이지 로드 후 폼 렌더링
     * @private
     */
    async _loadAndSetupForm() {
        const container = document.getElementById('wiki-form');
        if (!container) return;

        try {
            const result = await WikiModel.getWikiPage(this.slug);
            if (!result.ok) {
                showToast('위키 페이지를 불러오지 못했습니다.');
                return;
            }

            const existingPage = result.data?.data?.wiki_page;

            WikiFormView.renderForm(container, {
                existingPage,
                onSubmit: (data) => this._handleSubmit(data),
                onCancel: () => {
                    location.href = resolveNavPath(NAV_PATHS.WIKI_DETAIL(this.slug));
                },
            });
        } catch (error) {
            this._logger.error('위키 페이지 로드 실패', error);
            showToast('위키 페이지를 불러오지 못했습니다.');
        }
    }

    /**
     * 위키 페이지 수정 처리
     * @param {object} data
     * @private
     */
    async _handleSubmit(data) {
        if (!this._validateWikiData(data)) return;

        try {
            const result = await WikiModel.updateWikiPage(this.slug, {
                title: data.title,
                content: data.content,
                tags: data.tags,
            });

            if (result.ok) {
                showToast('위키 페이지가 수정되었습니다.');
                setTimeout(() => {
                    location.href = resolveNavPath(NAV_PATHS.WIKI_DETAIL(this.slug));
                }, 500);
            } else {
                this._handleApiError(result, '위키 페이지 수정에 실패했습니다.');
            }
        } catch (error) {
            this._logger.error('위키 페이지 수정 실패', error);
            showToast('위키 페이지 수정에 실패했습니다.');
        }
    }
}

export default WikiEditController;
