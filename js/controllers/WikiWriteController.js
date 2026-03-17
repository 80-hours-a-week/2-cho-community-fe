// @ts-check
// js/controllers/WikiWriteController.js
// 위키 작성 페이지 컨트롤러

import WikiModel from '../models/WikiModel.js';
import WikiFormView from '../views/WikiFormView.js';
import Logger from '../utils/Logger.js';
import { NAV_PATHS } from '../constants.js';
import { resolveNavPath } from '../config.js';
import { showToast } from '../views/helpers.js';

const logger = Logger.createLogger('WikiWriteController');

class WikiWriteController {
    constructor() {
        /** @type {object|null} */
        this.currentUser = null;
    }

    /**
     * 컨트롤러 초기화
     * @param {object|null} currentUser
     */
    init(currentUser) {
        this.currentUser = currentUser;

        // 인증 체크
        if (!currentUser) {
            showToast('로그인이 필요합니다.');
            location.href = resolveNavPath(NAV_PATHS.LOGIN);
            return;
        }

        this._setupBackButton();
        this._setupForm();
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
     * 폼 렌더링
     * @private
     */
    _setupForm() {
        const container = document.getElementById('wiki-form');
        if (!container) return;

        WikiFormView.renderForm(container, {
            onSubmit: (data) => this._handleSubmit(data),
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
     * @param {object} data
     * @private
     */
    async _handleSubmit(data) {
        // 유효성 검사
        if (!data.title) {
            showToast('제목을 입력해주세요.');
            return;
        }
        if (!data.slug) {
            showToast('슬러그를 입력해주세요.');
            return;
        }
        if (!data.content) {
            showToast('내용을 입력해주세요.');
            return;
        }

        try {
            const result = await WikiModel.createWikiPage({
                title: data.title,
                slug: data.slug,
                content: data.content,
                tags: data.tags,
            });

            if (result.ok) {
                showToast('위키 페이지가 작성되었습니다.');
                const slug = result.data?.data?.slug || data.slug;
                setTimeout(() => {
                    location.href = resolveNavPath(NAV_PATHS.WIKI_DETAIL(slug));
                }, 500);
            } else {
                showToast(result.data?.detail || '위키 페이지 작성에 실패했습니다.');
            }
        } catch (error) {
            logger.error('위키 페이지 작성 실패', error);
            showToast('위키 페이지 작성에 실패했습니다.');
        }
    }
}

export default WikiWriteController;
