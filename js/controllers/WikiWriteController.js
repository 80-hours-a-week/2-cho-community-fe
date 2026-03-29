// @ts-check
// js/controllers/WikiWriteController.js
// 위키 작성 페이지 컨트롤러

import WikiModel from '../models/WikiModel.js';
import WikiFormView from '../views/WikiFormView.js';
import BaseWikiController from './BaseWikiController.js';
import { NAV_PATHS } from '../constants.js';
import { resolveNavPath } from '../config.js';
import { showToast } from '../views/helpers.js';

class WikiWriteController extends BaseWikiController {
    constructor() {
        super('WikiWriteController');
    }

    /**
     * 컨트롤러 초기화
     * @param {object|null} currentUser
     */
    init(currentUser) {
        if (!this._requireAuth(currentUser)) return;
        this._setupBackButton(NAV_PATHS.WIKI);
        this._setupForm();
    }
    /**
     * 폼 렌더링
     * @private
     */
    _setupForm() {
        const container = document.getElementById('wiki-form');
        if (!container) return;

        WikiFormView.renderForm(container, {
            onSubmit: /** @param {any} data */ (data) => this._handleSubmit(data),
            onCancel: () => {
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    location.href = resolveNavPath(NAV_PATHS.WIKI);
                }
            },
        });
    }
    /**
     * 위키 페이지 생성 처리
     * @param {Record<string, any>} data
     * @private
     */
    async _handleSubmit(data) {
        if (!this._validateWikiData(data)) return;

        if (!data.slug) {
            showToast('슬러그를 입력해주세요.');
            return;
        }
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
            showToast('슬러그는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.');
            return;
        }
        try {
            const result = await WikiModel.createWikiPage({
                title: data.title,
                slug: data.slug,
                content: data.content,
                tags: data.tags,
                edit_summary: data.edit_summary || '초기 작성',
            });

            if (result.ok) {
                showToast('위키 페이지가 작성되었습니다.');
                const slug = result.data?.data?.slug || data.slug;
                setTimeout(() => {
                    location.href = resolveNavPath(NAV_PATHS.WIKI_DETAIL(slug));
                }, 500);
            } else {
                this._handleApiError(result, '위키 페이지 작성에 실패했습니다.');
            }
        } catch (error) {
            this._logger.error('위키 페이지 작성 실패', error);
            showToast('위키 페이지 작성에 실패했습니다.');
        }
    }
}

export default WikiWriteController;
