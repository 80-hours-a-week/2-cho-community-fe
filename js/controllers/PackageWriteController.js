// @ts-check
// js/controllers/PackageWriteController.js
// 패키지 등록 페이지 컨트롤러

import PackageModel from '../models/PackageModel.js';
import PackageFormView from '../views/PackageFormView.js';
import Logger from '../utils/Logger.js';
import { NAV_PATHS } from '../constants.js';
import { resolveNavPath } from '../config.js';
import { showToast } from '../views/helpers.js';

const logger = Logger.createLogger('PackageWriteController');

class PackageWriteController {
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
                    location.href = resolveNavPath(NAV_PATHS.PACKAGES);
                }
            });
        }
    }

    /**
     * 폼 렌더링
     * @private
     */
    _setupForm() {
        const container = document.getElementById('package-form');
        if (!container) return;

        PackageFormView.renderPackageForm(container, (data) => this._handleSubmit(data));
    }

    /**
     * 패키지 등록 처리
     * @param {object} data
     * @private
     */
    async _handleSubmit(data) {
        // 유효성 검사
        if (!data.name) {
            showToast('패키지 이름을 입력해주세요.');
            return;
        }
        if (!data.display_name) {
            showToast('표시 이름을 입력해주세요.');
            return;
        }
        if (!data.category) {
            showToast('카테고리를 선택해주세요.');
            return;
        }

        try {
            const result = await PackageModel.createPackage(data);
            if (result.ok) {
                showToast('패키지가 등록되었습니다.');
                const newPackage = result.data?.data;
                const packageId = newPackage?.package_id;
                if (packageId) {
                    setTimeout(() => {
                        location.href = resolveNavPath(NAV_PATHS.PACKAGE_DETAIL(packageId));
                    }, 500);
                } else {
                    setTimeout(() => {
                        location.href = resolveNavPath(NAV_PATHS.PACKAGES);
                    }, 500);
                }
            } else {
                showToast(result.data?.detail || '패키지 등록에 실패했습니다.');
            }
        } catch (error) {
            logger.error('패키지 등록 실패', error);
            showToast('패키지 등록에 실패했습니다.');
        }
    }
}

export default PackageWriteController;
