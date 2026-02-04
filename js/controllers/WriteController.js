// js/controllers/WriteController.js
// 게시글 작성 페이지 컨트롤러 - 비즈니스 로직 및 이벤트 처리 담당

import PostModel from '../models/PostModel.js';
import WriteView from '../views/WriteView.js';
import { extractUploadedImageUrl, readFileAsDataURL, showToastAndRedirect } from '../views/helpers.js';
import Logger from '../utils/Logger.js';
import { NAV_PATHS, UI_MESSAGES } from '../constants.js';

const logger = Logger.createLogger('WriteController');

/**
 * 게시글 작성 페이지 컨트롤러
 * Model과 View를 연결하고 비즈니스 로직을 처리
 */
class WriteController {
    constructor() {
        this.view = new WriteView();
        this.selectedFile = null;
    }

    /**
     * 컨트롤러 초기화
     */
    init() {
        // View 초기화
        if (!this.view.initialize()) return;

        this._setupEventListeners();
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
     * 파일 변경 처리
     * @private
     */
    _handleFileChange(event) {
        const file = event.target.files[0];
        if (file) {
            this.selectedFile = file;
            this.view.setFileName(file.name);
            readFileAsDataURL(file, (dataUrl) => {
                this.view.showImagePreview(dataUrl);
            });
        } else {
            this.selectedFile = null;
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
            let imageUrl = null;

            // 이미지 업로드
            if (this.selectedFile) {
                const uploadResult = await PostModel.uploadImage(this.selectedFile);
                imageUrl = extractUploadedImageUrl(uploadResult);

                if (!imageUrl && this.selectedFile) {
                    this.view.showToast(UI_MESSAGES.IMAGE_UPLOAD_FAIL);
                    return;
                }
            }

            // 게시글 작성
            const postPayload = {
                title: title,
                content: content,
                image_url: imageUrl
            };

            const result = await PostModel.createPost(postPayload);

            if (result.ok) {
                showToastAndRedirect(UI_MESSAGES.POST_CREATE_SUCCESS, NAV_PATHS.MAIN);
            } else {
                this.view.showToast(UI_MESSAGES.POST_CREATE_FAIL || '게시글 작성 실패');
            }

        } catch (error) {
            logger.error('게시글 작성 실패', error);
            this.view.showToast(UI_MESSAGES.UNKNOWN_ERROR);
        }
    }
}

export default WriteController;
