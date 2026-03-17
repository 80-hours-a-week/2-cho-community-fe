// @ts-check
// js/controllers/WikiEditController.js
// 위키 편집 페이지 컨트롤러

import WikiModel from '../models/WikiModel.js';
import WikiFormView from '../views/WikiFormView.js';
import Logger from '../utils/Logger.js';
import { NAV_PATHS } from '../constants.js';
import { resolveNavPath } from '../config.js';
import { showToast } from '../views/helpers.js';

const logger = Logger.createLogger('WikiEditController');

class WikiEditController {
    constructor() {
        /** @type {object|null} */
        this.currentUser = null;
        /** @type {string|null} */
        this.slug = null;
    }

    /**
     * 컨트롤러 초기화
     * @param {object|null} currentUser
     */
    async init(currentUser) {
        this.currentUser = currentUser;

        // 인증 체크
        if (!currentUser) {
            showToast('로그인이 필요합니다.');
            location.href = resolveNavPath(NAV_PATHS.LOGIN);
            return;
        }

        // URL에서 slug 추출
        const urlParams = new URLSearchParams(window.location.search);
        this.slug = urlParams.get('slug');

        if (!this.slug) {
            showToast('잘못된 접근입니다.');
            location.href = resolveNavPath(NAV_PATHS.WIKI);
            return;
        }

        this._setupBackButton();
        await this._loadAndSetupForm();
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
                    location.href = resolveNavPath(NAV_PATHS.WIKI_DETAIL(this.slug));
                }
            });
        }
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
            logger.error('위키 페이지 로드 실패', error);
            showToast('위키 페이지를 불러오지 못했습니다.');
        }
    }

    /**
     * 위키 페이지 수정 처리
     * @param {object} data
     * @private
     */
    async _handleSubmit(data) {
        // 유효성 검사
        if (!data.title || data.title.length < 2) {
            showToast('제목을 2자 이상 입력해주세요.');
            return;
        }
        if (!data.content || data.content.length < 10) {
            showToast('내용을 10자 이상 입력해주세요.');
            return;
        }

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
                const detail = result.data?.detail;
                if (Array.isArray(detail)) {
                    const msg = detail.map(e => e.msg).join(', ');
                    showToast(msg || '입력값을 확인해주세요.');
                } else {
                    showToast(detail || '위키 페이지 수정에 실패했습니다.');
                }
            }
        } catch (error) {
            logger.error('위키 페이지 수정 실패', error);
            showToast('위키 페이지 수정에 실패했습니다.');
        }
    }
}

export default WikiEditController;
