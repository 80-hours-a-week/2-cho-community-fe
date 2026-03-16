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
        /** @type {object|null} */
        this.currentUser = null;
        /** @type {object|null} */
        this.packageData = null;
        /** @type {Array} */
        this.reviews = [];
        /** @type {object|null} */
        this.myReview = null;
    }

    /**
     * 컨트롤러 초기화
     * @param {object|null} currentUser
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
        await this._loadPackage();
        await this._loadReviews();
        this._setupReviewForm();
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
     * 패키지 정보 로드
     * @private
     */
    async _loadPackage() {
        const container = document.getElementById('package-info');
        try {
            const result = await PackageModel.getPackage(this.packageId);
            if (!result.ok) {
                showToast('패키지를 불러오지 못했습니다.');
                return;
            }
            this.packageData = result.data?.data;
            PackageDetailView.renderPackageInfo(container, this.packageData);
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
        const container = document.getElementById('reviews-list');
        try {
            const result = await PackageModel.getReviews(this.packageId);
            if (!result.ok) {
                showToast('리뷰를 불러오지 못했습니다.');
                return;
            }
            this.reviews = result.data?.data?.reviews || [];

            // 현재 사용자의 리뷰 찾기
            if (this.currentUser) {
                this.myReview = this.reviews.find(r => r.user_id === this.currentUser.user_id) || null;
            }

            const currentUserId = this.currentUser?.user_id || null;
            PackageDetailView.renderReviews(
                container,
                this.reviews,
                currentUserId,
                (review) => this._handleEditReview(review),
                (reviewId) => this._handleDeleteReview(reviewId)
            );
        } catch (error) {
            logger.error('리뷰 로드 실패', error);
            showToast('리뷰를 불러오지 못했습니다.');
        }
    }

    /**
     * 리뷰 폼 설정 (로그인 시만)
     * @private
     */
    _setupReviewForm() {
        const formSection = document.getElementById('review-form-section');
        if (!formSection) return;

        if (!this.currentUser) {
            formSection.textContent = '';
            return;
        }

        // 이미 리뷰를 작성한 경우 수정 폼으로, 아니면 새 작성 폼
        PackageDetailView.renderReviewForm(
            formSection,
            this.myReview,
            (data) => this._handleReviewSubmit(data)
        );
    }

    /**
     * 리뷰 작성/수정 처리
     * @param {object} data
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

        try {
            let result;
            if (this.myReview) {
                // 수정
                result = await PackageModel.updateReview(this.packageId, this.myReview.review_id, data);
                if (result.ok) {
                    showToast('리뷰가 수정되었습니다.');
                } else {
                    showToast(result.data?.detail || '리뷰 수정에 실패했습니다.');
                    return;
                }
            } else {
                // 새 작성
                result = await PackageModel.createReview(this.packageId, data);
                if (result.ok) {
                    showToast('리뷰가 등록되었습니다.');
                } else {
                    showToast(result.data?.detail || '리뷰 등록에 실패했습니다.');
                    return;
                }
            }

            // 리뷰 + 패키지 정보 갱신
            await this._loadPackage();
            await this._loadReviews();
            this._setupReviewForm();
        } catch (error) {
            logger.error('리뷰 제출 실패', error);
            showToast('리뷰 처리에 실패했습니다.');
        }
    }

    /**
     * 리뷰 수정 폼 표시
     * @param {object} review
     * @private
     */
    _handleEditReview(review) {
        const formSection = document.getElementById('review-form-section');
        if (!formSection) return;

        PackageDetailView.renderReviewForm(
            formSection,
            review,
            (data) => this._handleReviewSubmit(data)
        );

        // 폼으로 스크롤
        formSection.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * 리뷰 삭제 처리
     * @param {number} reviewId
     * @private
     */
    async _handleDeleteReview(reviewId) {
        if (!confirm('리뷰를 삭제하시겠습니까?')) return;

        try {
            const result = await PackageModel.deleteReview(this.packageId, reviewId);
            if (result.ok) {
                showToast('리뷰가 삭제되었습니다.');
                this.myReview = null;
                await this._loadPackage();
                await this._loadReviews();
                this._setupReviewForm();
            } else {
                showToast(result.data?.detail || '리뷰 삭제에 실패했습니다.');
            }
        } catch (error) {
            logger.error('리뷰 삭제 실패', error);
            showToast('리뷰 삭제에 실패했습니다.');
        }
    }
}

export default PackageDetailController;
