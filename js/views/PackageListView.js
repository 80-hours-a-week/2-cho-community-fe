// @ts-check
// js/views/PackageListView.js
// 패키지 목록 렌더링

import { createElement } from '../utils/dom.js';
import { PACKAGE_CATEGORY_LABELS, NAV_PATHS } from '../constants.js';
import { resolveNavPath } from '../config.js';
import BaseListView from './BaseListView.js';

/**
 * 별점 텍스트 생성
 * @param {number} rating
 * @returns {string}
 */
function renderStars(rating) {
    const rounded = Math.round(rating);
    return '\u2605'.repeat(rounded) + '\u2606'.repeat(5 - rounded);
}

class PackageListView extends BaseListView {
    /**
     * 패키지 카드 요소 생성
     * @param {object} pkg - 패키지 데이터
     * @param {Function} onClick - 클릭 핸들러
     * @returns {HTMLElement}
     */
    static createPackageCard(pkg, onClick) {
        const name = pkg.display_name || pkg.name || '';
        const description = pkg.description || '';
        const truncatedDesc = description.length > 100 ? description.substring(0, 100) + '...' : description;
        const category = pkg.category || '';
        const avgRating = pkg.avg_rating || 0;
        const reviewsCount = pkg.reviews_count || 0;
        const packageManager = pkg.package_manager || '';

        const card = createElement('li', { className: 'package-card', onClick: () => onClick(pkg.package_id) }, [
            // 카테고리 뱃지 + 패키지 매니저
            createElement('div', { className: 'package-card-badges' }, [
                ...(category && PACKAGE_CATEGORY_LABELS[category]
                    ? [createElement('a', {
                        className: 'package-category-badge',
                        href: resolveNavPath(`${NAV_PATHS.PACKAGES}?category=${category}`),
                        onClick: (e) => e.stopPropagation(),
                    }, [PACKAGE_CATEGORY_LABELS[category]])]
                    : []),
                ...(packageManager
                    ? [createElement('span', { className: 'package-manager-badge' }, [packageManager])]
                    : []),
            ]),
            // 제목
            createElement('h3', { className: 'package-card-title' }, [name]),
            // 설명
            createElement('p', { className: 'package-card-desc' }, [truncatedDesc]),
            // 별점 + 리뷰 수
            createElement('div', { className: 'package-card-footer' }, [
                createElement('span', { className: 'package-rating' }, [renderStars(avgRating)]),
                createElement('span', { className: 'package-rating-value' }, [` ${avgRating.toFixed(1)}`]),
                createElement('span', { className: 'package-reviews-count' }, [`리뷰 ${reviewsCount}`]),
            ]),
        ]);

        return card;
    }

    /**
     * 패키지 목록 렌더링
     * @param {HTMLElement} container
     * @param {Array} packages
     * @param {Function} onPackageClick
     */
    static renderPackages(container, packages, onPackageClick) {
        if (!container) return;
        packages.forEach(pkg => {
            const card = PackageListView.createPackageCard(pkg, onPackageClick);
            container.appendChild(card);
        });
    }

    /**
     * 카테고리 필터 버튼 렌더링
     * @param {HTMLElement} container
     * @param {string|null} activeCategory
     * @param {Function} onCategoryClick
     */
    static renderCategoryFilters(container, activeCategory, onCategoryClick) {
        const items = Object.entries(PACKAGE_CATEGORY_LABELS);
        BaseListView.renderFilterButtons(container, items, activeCategory, onCategoryClick, {
            className: 'category-filter-btn',
            getKey: ([key]) => key,
            getLabel: ([, label]) => label,
        });
    }

}

export { renderStars };
export default PackageListView;
