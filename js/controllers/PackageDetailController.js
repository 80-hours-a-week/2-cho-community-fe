// @ts-check
// js/controllers/PackageDetailController.js
// 패키지 상세 페이지 컨트롤러

import PackageModel from '../models/PackageModel.js';
import PackageDetailView from '../views/PackageDetailView.js';
import Logger from '../utils/Logger.js';
import { NAV_PATHS } from '../constants.js';
import { resolveNavPath } from '../config.js';
import { showToast } from '../views/helpers.js';

const logger = Logger.createLogger('PackageDetailController');

class PackageDetailController {
    constructor() {
        /** @type {number|null} */
        this.packageId = null;
        /** @type {Record<string, any>|null} */
        this.currentUser = null;
        /** @type {Record<string, any>|null} */
        this.packageData = null;
        /** @type {Array<any>} */
        this.reviews = [];
        /** @type {Record<string, any>|null} */
        this.myReview = null;
    }

    /**
     * 컨트롤러 초기화
     * @param {Record<string, any>|null} currentUser
     */
    async init(currentUser) {
        this.currentUser = currentUser;

        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        if (!id) {
            showToast('잘못된 접근입니다.');
            location.href = resolveNavPath(NAV_PATHS.PACKAGES);
            return;
        }
        this.packageId = parseInt(id, 10);

        this._setupBackButton();
        await this._refreshAll();
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
     * 패키지 정보 + 리뷰 목록 + 리뷰 폼을 한 번에 갱신
     * @private
     */
    async _refreshAll() {
        await this._loadPackage();
        await this._loadReviews();
        this._renderReviewFormInSection(this.myReview);
    }

    /**
     * 패키지 정보 로드
     * @private
     */
    async _loadPackage() {
        const container = /** @type {HTMLElement} */ (document.getElementById('package-info'));
        try {
            const result = await PackageModel.getPackage(/** @type {number} */ (this.packageId));
            if (!result.ok) {
                showToast('패키지를 불러오지 못했습니다.');
                return;
            }
            this.packageData = result.data?.data;
            PackageDetailView.renderPackageInfo(container, /** @type {Record<string, any>} */ (this.packageData));
        } catch (error) {
            logger.error('패키지 로드 실패', error);
            showToast('패키지를 불러오지 못했습니다.');
        }
    }

    /**
     * 리뷰 목록 로드
     * @private
     */
    async _loadReviews() {
        const container = /** @type {HTMLElement} */ (document.getElementById('reviews-list'));
        try {
            const result = await PackageModel.getReviews(/** @type {number} */ (this.packageId));
            if (!result.ok) {
                showToast('리뷰를 불러오지 못했습니다.');
                return;
            }
            this.reviews = result.data?.data?.reviews || [];

            // 현재 사용자의 리뷰 찾기
            if (this.currentUser) {
                const userId = this.currentUser.user_id;
                this.myReview = this.reviews.find(/** @param {any} r */ r => r.user_id === userId) || null;
            }

            const currentUserId = this.currentUser?.user_id || null;
            PackageDetailView.renderReviews(
                container,
                this.reviews,
                currentUserId,
                /** @param {any} review */ (review) => this._handleEditReview(review),
                /** @param {any} reviewId */ (reviewId) => this._handleDeleteReview(reviewId)
            );
        } catch (error) {
            logger.error('리뷰 로드 실패', error);
            showToast('리뷰를 불러오지 못했습니다.');
        }
    }

    /**
     * review-form-section 에 리뷰 폼 렌더링 (신규/수정 공통)
     * @param {Record<string, any>|null} review - 수정 시 기존 리뷰, 신규 시 null
     * @param {boolean} [scroll=false] - 렌더링 후 폼으로 스크롤 여부
     * @private
     */
    _renderReviewFormInSection(review, scroll = false) {
        const formSection = document.getElementById('review-form-section');
        if (!formSection) return;

        if (!this.currentUser) {
            formSection.textContent = '';
            return;
        }

        // 이미 리뷰를 작성한 경우 수정 폼으로, 아니면 새 작성 폼
        PackageDetailView.renderReviewForm(
            formSection,
            review,
            /** @param {any} data */ (data) => this._handleReviewSubmit(data)
        );

        if (scroll) formSection.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * 리뷰 작성/수정 처리
     * @param {Record<string, any>} data
     * @private
     */
    async _handleReviewSubmit(data) {
        if (!data.rating || data.rating < 1) {
            showToast('별점을 선택해주세요.');
            return;
        }
        if (!data.content) {
            showToast('리뷰 내용을 입력해주세요.');
            return;
        }

        let submitOk = false;
        try {
            if (this.myReview) {
                // 수정
                const result = await PackageModel.updateReview(/** @type {number} */ (this.packageId), this.myReview.review_id, data);
                if (result.ok) {
                    showToast('리뷰가 수정되었습니다.');
                    submitOk = true;
                } else {
                    showToast(/** @type {any} */ (result.data)?.detail || '리뷰 수정에 실패했습니다.');
                }
            } else {
                // 새 작성
                const result = await PackageModel.createReview(/** @type {number} */ (this.packageId), data);
                if (result.ok) {
                    showToast('리뷰가 등록되었습니다.');
                    submitOk = true;
                } else {
                    showToast(/** @type {any} */ (result.data)?.detail || '리뷰 등록에 실패했습니다.');
                }
            }
        } catch (error) {
            logger.error('리뷰 제출 실패', error);
            showToast('리뷰 처리에 실패했습니다.');
        }

        if (submitOk) await this._refreshAll();
    }

    /**
     * 리뷰 수정 폼 표시 (목록에서 수정 버튼 클릭 시)
     * @param {Record<string, any>} review
     * @private
     */
    _handleEditReview(review) {
        // 선택한 리뷰로 폼 렌더링 후 스크롤
        this._renderReviewFormInSection(review, true);
    }

    /**
     * 리뷰 삭제 처리
     * @param {number} reviewId
     * @private
     */
    async _handleDeleteReview(reviewId) {
        // 삭제 전 사용자 확인
        if (!confirm('리뷰를 삭제하시겠습니까?')) return;

        try {
            const result = await PackageModel.deleteReview(/** @type {number} */ (this.packageId), reviewId);
            if (result.ok) {
                showToast('리뷰가 삭제되었습니다.');
                this.myReview = null;
                await this._refreshAll();
            } else {
                showToast(/** @type {any} */ (result.data)?.detail || '리뷰 삭제에 실패했습니다.');
            }
        } catch (error) {
            logger.error('리뷰 삭제 실패', error);
            showToast('리뷰 삭제에 실패했습니다.');
        }
    }
}

export default PackageDetailController;
