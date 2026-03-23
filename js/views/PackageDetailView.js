// @ts-check
// js/views/PackageDetailView.js
// 패키지 상세 + 리뷰 렌더링

import { createElement } from '../utils/dom.js';
import { formatDate } from '../utils/formatters.js';
import { createDistroBadge } from '../utils/distro.js';
import { PACKAGE_CATEGORY_LABELS, NAV_PATHS } from '../constants.js';
import { resolveNavPath } from '../config.js';
import { renderStars } from './PackageListView.js';

class PackageDetailView {
    /**
     * 패키지 정보 렌더링
     * @param {HTMLElement} container
     * @param {Record<string, any>} pkg
     */
    static renderPackageInfo(container, pkg) {
        if (!container) return;
        container.textContent = '';

        const name = pkg.display_name || pkg.name || '';
        const description = pkg.description || '';
        const homepage = pkg.homepage_url || '';
        const category = pkg.category || '';
        const packageManager = pkg.package_manager || '';
        const avgRating = pkg.avg_rating || 0;
        const reviewsCount = pkg.reviews_count || 0;
        const creatorNickname = pkg.creator?.nickname || '';

        // 제목
        container.appendChild(createElement('h1', { className: 'package-detail-title' }, [name]));

        // 패키지명 (name)
        if (pkg.name && pkg.name !== pkg.display_name) {
            container.appendChild(createElement('p', { className: 'package-detail-name' }, [pkg.name]));
        }

        // 메타 정보 영역
        const metaRow = createElement('div', { className: 'package-meta' });

        if (category && PACKAGE_CATEGORY_LABELS[category]) {
            metaRow.appendChild(createElement('a', {
                className: 'package-category-badge',
                href: resolveNavPath(`${NAV_PATHS.PACKAGES}?category=${category}`),
            }, [PACKAGE_CATEGORY_LABELS[category]]));
        }
        if (packageManager) {
            metaRow.appendChild(createElement('span', { className: 'package-manager-badge' }, [packageManager]));
        }
        container.appendChild(metaRow);

        // 설명
        if (description) {
            container.appendChild(createElement('p', { className: 'package-detail-desc' }, [description]));
        }

        // 홈페이지 링크
        if (homepage) {
            const link = createElement('a', {
                className: 'package-homepage-link',
                href: homepage,
                target: '_blank',
                rel: 'noopener noreferrer',
            }, [homepage]);
            container.appendChild(createElement('div', { className: 'package-homepage' }, [
                createElement('span', { className: 'package-homepage-label' }, ['홈페이지: ']),
                link,
            ]));
        }

        // 별점 + 리뷰 수
        const statsRow = createElement('div', { className: 'package-stats-row' }, [
            createElement('span', { className: 'package-rating package-rating-large' }, [renderStars(avgRating)]),
            createElement('span', { className: 'package-rating-value' }, [` ${avgRating.toFixed(1)}`]),
            createElement('span', { className: 'package-reviews-count' }, [`리뷰 ${reviewsCount}개`]),
        ]);
        container.appendChild(statsRow);

        // 등록자 정보
        if (creatorNickname) {
            container.appendChild(createElement('div', { className: 'package-creator' }, [
                createElement('span', { className: 'package-creator-label' }, ['등록자: ']),
                createElement('span', { className: 'package-creator-name' }, [creatorNickname]),
            ]));
        }
    }

    /**
     * 리뷰 카드 생성
     * @param {Record<string, any>} review
     * @param {number|null} currentUserId
     * @param {Function} onEdit
     * @param {Function} onDelete
     * @returns {HTMLElement}
     */
    static renderReviewCard(review, currentUserId, onEdit, onDelete) {
        const authorName = review.author?.nickname || '알 수 없음';
        const authorDistro = review.author?.distro || null;
        const rating = review.rating || 0;
        const title = review.title || '';
        const content = review.content || '';
        const dateStr = formatDate(new Date(review.created_at));
        const isOwn = currentUserId && review.user_id === currentUserId;

        const headerChildren = [
            createElement('span', { className: 'review-author' }, [authorName]),
        ];

        // 배포판 뱃지
        const distroBadge = createDistroBadge(authorDistro);
        if (distroBadge) {
            headerChildren.push(distroBadge);
        }

        headerChildren.push(createElement('span', { className: 'review-date' }, [dateStr]));

        // 수정/삭제 버튼 (본인 리뷰만)
        if (isOwn) {
            headerChildren.push(
                createElement('div', { className: 'review-actions' }, [
                    createElement('button', {
                        className: 'action-btn',
                        textContent: '수정',
                        onClick: () => onEdit(review),
                    }),
                    createElement('button', {
                        className: 'action-btn',
                        textContent: '삭제',
                        onClick: () => onDelete(review.review_id),
                    }),
                ])
            );
        }

        const card = createElement('div', { className: 'review-card' }, [
            createElement('div', { className: 'review-header' }, headerChildren),
            createElement('div', { className: 'review-rating' }, [renderStars(rating)]),
            ...(title ? [createElement('h4', { className: 'review-title' }, [title])] : []),
            createElement('p', { className: 'review-content' }, [content]),
        ]);

        return card;
    }

    /**
     * 리뷰 목록 렌더링
     * @param {HTMLElement} container
     * @param {Array<any>} reviews
     * @param {number|null} currentUserId
     * @param {Function} onEdit
     * @param {Function} onDelete
     */
    static renderReviews(container, reviews, currentUserId, onEdit, onDelete) {
        if (!container) return;
        container.textContent = '';

        if (reviews.length === 0) {
            container.appendChild(
                createElement('p', { className: 'reviews-empty' }, ['아직 리뷰가 없습니다. 첫 번째 리뷰를 작성해보세요!'])
            );
            return;
        }

        reviews.forEach(review => {
            container.appendChild(
                PackageDetailView.renderReviewCard(review, currentUserId, onEdit, onDelete)
            );
        });
    }

    /**
     * 리뷰 작성/수정 폼 렌더링
     * @param {HTMLElement} container
     * @param {Record<string, any>|null} existingReview - 수정 시 기존 리뷰 데이터
     * @param {Function} onSubmit - (data) => void
     */
    static renderReviewForm(container, existingReview, onSubmit) {
        if (!container) return;
        container.textContent = '';

        const formTitle = existingReview ? '리뷰 수정' : '리뷰 작성';
        container.appendChild(createElement('h3', { className: 'review-form-title' }, [formTitle]));

        // 별점 선택기 (1-5)
        let selectedRating = existingReview?.rating || 0;
        const ratingContainer = createElement('div', { className: 'rating-selector' });
        const ratingLabel = createElement('label', { className: 'form-label' }, ['별점 *']);

        for (let i = 1; i <= 5; i++) {
            const star = createElement('span', {
                className: `rating-star${i <= selectedRating ? ' active' : ''}`,
                textContent: '\u2605',
                onClick: () => {
                    selectedRating = i;
                    ratingContainer.querySelectorAll('.rating-star').forEach((s, idx) => {
                        s.classList.toggle('active', idx < i);
                    });
                },
            });
            ratingContainer.appendChild(star);
        }

        // 제목 입력
        const titleInput = createElement('input', {
            type: 'text',
            className: 'review-title-input',
            placeholder: '리뷰 제목 (선택)',
            maxlength: '100',
        });
        if (existingReview?.title) {
            /** @type {HTMLInputElement} */ (titleInput).value = existingReview.title;
        }

        // 내용 입력
        const contentInput = createElement('textarea', {
            className: 'review-content-input',
            placeholder: '리뷰 내용을 작성해주세요. *',
            rows: '4',
        });
        if (existingReview?.content) {
            /** @type {HTMLTextAreaElement} */ (contentInput).value = existingReview.content;
        }

        // 제출 버튼
        const submitBtn = createElement('button', {
            className: 'review-submit-btn',
            textContent: existingReview ? '리뷰 수정' : '리뷰 등록',
            onClick: () => {
                const data = {
                    rating: selectedRating,
                    title: /** @type {HTMLInputElement} */ (titleInput).value.trim(),
                    content: /** @type {HTMLTextAreaElement} */ (contentInput).value.trim(),
                };
                onSubmit(data);
            },
        });

        // 수정 시 취소 버튼
        const buttonRow = createElement('div', { className: 'review-form-buttons' }, [submitBtn]);
        if (existingReview) {
            const cancelBtn = createElement('button', {
                className: 'review-cancel-btn',
                textContent: '취소',
                onClick: () => {
                    container.textContent = '';
                },
            });
            buttonRow.appendChild(cancelBtn);
        }

        container.appendChild(
            createElement('div', { className: 'review-form' }, [
                ratingLabel,
                ratingContainer,
                createElement('label', { className: 'form-label' }, ['제목']),
                titleInput,
                createElement('label', { className: 'form-label' }, ['내용 *']),
                contentInput,
                buttonRow,
            ])
        );
    }
}

export default PackageDetailView;
