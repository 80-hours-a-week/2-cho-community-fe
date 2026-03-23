// @ts-check
// js/controllers/BaseWikiController.js
// 위키 작성/수정 컨트롤러 공통 로직

import Logger from '../utils/Logger.js';
import { NAV_PATHS } from '../constants.js';
import { resolveNavPath } from '../config.js';
import { showToast } from '../views/helpers.js';

/**
 * 위키 컨트롤러 Base 클래스
 * WikiWriteController, WikiEditController가 상속
 */
class BaseWikiController {
    /**
     * @param {string} loggerName
     */
    constructor(loggerName) {
        /** @type {object|null} */
        this.currentUser = null;
        this._logger = Logger.createLogger(loggerName);
    }

    /**
     * 인증 확인 — 미로그인 시 로그인 페이지로 리다이렉트
     * @param {object|null} currentUser
     * @returns {boolean} 인증 여부
     * @protected
     */
    _requireAuth(currentUser) {
        this.currentUser = currentUser;
        if (!currentUser) {
            showToast('로그인이 필요합니다.');
            location.href = resolveNavPath(NAV_PATHS.LOGIN);
            return false;
        }
        return true;
    }

    /**
     * 뒤로가기 버튼 설정
     * @param {string} fallbackPath - history가 없을 때 이동할 경로
     * @protected
     */
    _setupBackButton(fallbackPath) {
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    location.href = resolveNavPath(fallbackPath);
                }
            });
        }
    }

    /**
     * API 에러 응답 처리 (Pydantic 422 포함)
     * @param {Record<string, any>} result - API 응답
     * @param {string} fallbackMsg - 기본 에러 메시지
     * @protected
     */
    _handleApiError(result, fallbackMsg) {
        const detail = result.data?.detail;
        if (Array.isArray(detail)) {
            const msg = detail.map(e => e.msg).join(', ');
            showToast(msg || '입력값을 확인해주세요.');
        } else {
            showToast(detail || fallbackMsg);
        }
    }

    /**
     * 위키 공통 유효성 검사 (제목, 내용)
     * @param {Record<string, any>} data
     * @returns {boolean}
     * @protected
     */
    _validateWikiData(data) {
        if (!data.title || data.title.length < 2) {
            showToast('제목을 2자 이상 입력해주세요.');
            return false;
        }
        if (!data.content || data.content.length < 10) {
            showToast('내용을 10자 이상 입력해주세요.');
            return false;
        }
        return true;
    }
}

export default BaseWikiController;
