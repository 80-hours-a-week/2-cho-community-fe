// @ts-check
// js/controllers/BadgeController.js
// 배지 목록 페이지 컨트롤러

import ReputationModel from '../models/ReputationModel.js';
import BadgeView from '../views/BadgeView.js';
import Logger from '../utils/Logger.js';
import { showToast } from '../views/helpers.js';

const logger = Logger.createLogger('BadgeController');

class BadgeController {
    constructor() {
        /** @type {HTMLElement|null} */
        this.container = document.getElementById('badges-container');
        /** @type {any} */
        this.currentUser = null;
    }

    /**
     * 컨트롤러 초기화
     * @param {any} currentUser - 현재 로그인 사용자 정보
     */
    async init(currentUser) {
        this.currentUser = currentUser;
        await this._loadBadges();
    }

    /**
     * 배지 목록 로드
     * @private
     */
    async _loadBadges() {
        try {
            const badgeResult = await ReputationModel.getAllBadges();
            if (!badgeResult.ok) {
                throw new Error('배지 목록을 불러오지 못했습니다.');
            }

            const allBadges = badgeResult.data?.data?.badges || [];

            // 로그인 상태면 사용자 보유 배지도 조회
            /** @type {Array<any>} */
            let earnedBadges = [];
            if (this.currentUser) {
                const earnedResult = await ReputationModel.getUserBadges(this.currentUser.id);
                if (earnedResult.ok) {
                    earnedBadges = earnedResult.data?.data?.badges || [];
                }
            }

            if (this.container) {
                BadgeView.renderBadgeGrid(this.container, allBadges, earnedBadges);
            }
        } catch (error) {
            logger.error('배지 목록 로딩 실패', error);
            showToast('배지 목록을 불러오지 못했습니다.');
        }
    }
}

export default BadgeController;
