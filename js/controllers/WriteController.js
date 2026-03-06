// js/controllers/WriteController.js
// 게시글 작성 페이지 컨트롤러 - 비즈니스 로직 및 이벤트 처리 담당

import PostModel from '../models/PostModel.js';
import CategoryModel from '../models/CategoryModel.js';
import WriteView from '../views/WriteView.js';
import { extractUploadedImageUrl, readFileAsDataURL, showToastAndRedirect } from '../views/helpers.js';
import Logger from '../utils/Logger.js';
import { NAV_PATHS, UI_MESSAGES, NOTICE_CATEGORY_SLUG } from '../constants.js';

const logger = Logger.createLogger('WriteController');

/**
 * 게시글 작성 페이지 컨트롤러
 * Model과 View를 연결하고 비즈니스 로직을 처리
 */
class WriteController {
    constructor() {
        this.view = new WriteView();
        this.selectedFile = null;
        this.selectedFiles = []; // 다중 이미지 지원
        this.currentUser = null;
    }

    /**
     * 컨트롤러 초기화
     * @param {object|null} [currentUser=null] - 현재 사용자 정보
     */
    async init(currentUser = null) {
        this.currentUser = currentUser;

        // View 초기화
        if (!this.view.initialize()) return;

        await this._loadCategories();
        this.view.initializeTags();
        this._setupEventListeners();
    }

    /**
     * 카테고리 목록 로드
     * @private
     */
    async _loadCategories() {
        const categorySelect = document.getElementById('category-select');
        if (!categorySelect) return;

        try {
            const result = await CategoryModel.getCategories();
            if (!result.ok) return;

            const categories = result.data?.data?.categories || [];
            const isAdmin = this.currentUser?.role === 'admin';

            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.category_id;
                option.textContent = cat.name;
                // 공지사항은 관리자만 선택 가능
                if (cat.slug === NOTICE_CATEGORY_SLUG && !isAdmin) {
                    option.disabled = true;
                }
                categorySelect.appendChild(option);
            });
        } catch (error) {
            logger.error('카테고리 로드 실패', error);
        }
    }

    /**
     * 이벤트 리스너 설정
     * @private
     */
    _setupEventListeners() {
        this.view.bindEvents({
            onTitleInput: () => this._handleTitleInput(),
            onContentInput: () => this._handleContentInput(),
            onFileChange: (e) => this._handleFileChange(e),
            onSubmit: (e) => this._handleSubmit(e)
        });

        // 뒤로가기 버튼
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                history.back();
            });
        }
    }

    /**
     * 제목 입력 처리
     * @private
     */
    _handleTitleInput() {
        this.view.enforceTitleMaxLength(26);
        this._validateForm();
    }

    /**
     * 본문 입력 처리
     * @private
     */
    _handleContentInput() {
        this._validateForm();
    }

    /**
     * 파일 변경 처리 (다중 이미지 지원)
     * @private
     */
    _handleFileChange(event) {
        const files = Array.from(event.target.files);
        if (files.length > 0) {
            // 최대 5개 제한
            const selected = files.slice(0, 5);
            this.selectedFiles = selected;
            this.selectedFile = selected[0]; // 하위 호환
            this.view.setFileName(
                selected.length === 1
                    ? selected[0].name
                    : `${selected.length}개 파일 선택됨`
            );
            // 첫 번째 파일 미리보기
            readFileAsDataURL(selected[0], (dataUrl) => {
                this.view.showImagePreview(dataUrl);
            });
        } else {
            this.selectedFile = null;
            this.selectedFiles = [];
            this.view.setFileName('파일을 선택해주세요.');
            this.view.hideImagePreview();
        }
    }

    /**
     * 폼 유효성 검사
     * @private
     */
    _validateForm() {
        const title = this.view.getTitle();
        const content = this.view.getContent();

        const isValid = title.length > 0 && content.length > 0;

        this.view.updateButtonState(isValid);
        this.view.toggleValidationHelper(!isValid);
    }

    /**
     * 폼 제출 처리
     * @private
     */
    async _handleSubmit(event) {
        event.preventDefault();

        const title = this.view.getTitle();
        const content = this.view.getContent();

        if (!title || !content) return;

        try {
            const imageUrls = [];

            // 다중 이미지 업로드
            if (this.selectedFiles.length > 0) {
                for (const file of this.selectedFiles) {
                    const uploadResult = await PostModel.uploadImage(file);
                    const url = extractUploadedImageUrl(uploadResult);
                    if (!url) {
                        this.view.showToast(UI_MESSAGES.IMAGE_UPLOAD_FAIL);
                        return;
                    }
                    imageUrls.push(url);
                }
            }

            // 게시글 작성
            const categorySelect = document.getElementById('category-select');
            const categoryId = categorySelect ? Number(categorySelect.value) : 1;

            const postPayload = {
                title: title,
                content: content,
                category_id: categoryId,
                tags: this.view.getTags(),
            };

            // 이미지가 있으면 image_urls 배열로 전송
            if (imageUrls.length > 0) {
                postPayload.image_urls = imageUrls;
            }

            const result = await PostModel.createPost(postPayload);

            if (result.ok) {
                showToastAndRedirect(UI_MESSAGES.POST_CREATE_SUCCESS, NAV_PATHS.MAIN);
            } else {
                this.view.showToast(UI_MESSAGES.POST_CREATE_FAIL);
            }

        } catch (error) {
            logger.error('게시글 작성 실패', error);
            this.view.showToast(UI_MESSAGES.UNKNOWN_ERROR);
        }
    }
}

export default WriteController;
