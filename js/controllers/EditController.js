// js/controllers/EditController.js
// 게시글 수정 페이지 컨트롤러 - 비즈니스 로직 및 이벤트 처리 담당

import PostModel from '../models/PostModel.js';
import CategoryModel from '../models/CategoryModel.js';
import EditView from '../views/EditView.js';
import { extractUploadedImageUrl, readFileAsDataURL, showToastAndRedirect } from '../views/helpers.js';
import Logger from '../utils/Logger.js';
import DraftService from '../services/DraftService.js';
import { NAV_PATHS, UI_MESSAGES, NOTICE_CATEGORY_SLUG } from '../constants.js';

const logger = Logger.createLogger('EditController');
const DRAFT_SAVE_DELAY = 5000;

/**
 * 게시글 수정 페이지 컨트롤러
 * Model과 View를 연결하고 비즈니스 로직을 처리
 */
class EditController {
    constructor() {
        this.view = new EditView();
        this.originalData = { title: '', content: '', image_url: null, image_urls: [], category_id: null };
        this.currentData = { title: '', content: '', image_file: null, image_files: [] };
        this.postId = null;
        this.currentUser = null;
        this._draftTimer = null;
    }

    /**
     * 컨트롤러 초기화
     * @param {object|null} [currentUser=null] - 현재 사용자 정보
     */
    async init(currentUser = null) {
        this.currentUser = currentUser;

        const urlParams = new URLSearchParams(window.location.search);
        this.postId = urlParams.get('id');

        if (!this.postId) {
            showToastAndRedirect(UI_MESSAGES.INVALID_ACCESS, NAV_PATHS.MAIN);
            return;
        }

        // View 초기화
        if (!this.view.initialize({
            onImageUpload: async (file) => {
                const response = await PostModel.uploadImage(file);
                return response.data?.data?.url;
            },
        })) return;

        await this._loadCategories();
        this.view.initializeTags();
        await this._loadPostData();
        this._restoreDraft();
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
     * 게시글 데이터 로드
     * @private
     */
    async _loadPostData() {
        try {
            const result = await PostModel.getPost(this.postId);

            if (!result.ok) throw new Error(UI_MESSAGES.POST_LOAD_FAIL);

            const post = result.data?.data?.post || result.data?.data;

            this.view.setTitle(post.title);
            this.view.setContent(post.content);
            this.view.setTags(post.tags || []);

            this.originalData.title = post.title;
            this.originalData.content = post.content;
            this.originalData.category_id = post.category_id || null;

            // 카테고리 선택 상태 설정
            const categorySelect = document.getElementById('category-select');
            if (categorySelect && post.category_id) {
                categorySelect.value = post.category_id;
            }

            if (post.image_urls && post.image_urls.length > 0) {
                this.originalData.image_url = post.image_urls[0];
                this.view.showImagePreview(post.image_urls[0]);

                // URL에서 파일명 추출하여 표시
                const fileName = post.image_urls[0].split('/').pop();
                this.view.setFileName(fileName);
            } else if (post.image_url) {
                // image_url 단일 필드 지원 (백엔드 스키마 변경 대비)
                this.originalData.image_url = post.image_url;
                this.view.showImagePreview(post.image_url);
                const fileName = post.image_url.split('/').pop();
                this.view.setFileName(fileName);
            } else {
                this.view.setFileName('선택된 파일 없음');
            }

        } catch (error) {
            logger.error('게시글 데이터 로드 실패', error);
            showToastAndRedirect(error.message, NAV_PATHS.MAIN);
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

        // 카테고리 변경 감지
        const categorySelect = document.getElementById('category-select');
        if (categorySelect) {
            categorySelect.addEventListener('change', () => {
                this._checkChanges();
                this._scheduleDraftSave();
            });
        }

        // 뒤로가기 버튼
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                history.back();
            });
        }

        // 페이지 이탈 시 리소스 정리
        window.addEventListener('pagehide', () => this.view.destroy());
    }

    /**
     * 제목 입력 처리
     * @private
     */
    _handleTitleInput() {
        this.view.enforceTitleMaxLength(26);
        this._checkChanges();
        this._scheduleDraftSave();
    }

    /**
     * 본문 입력 처리
     * @private
     */
    _handleContentInput() {
        this._checkChanges();
        this._scheduleDraftSave();
    }

    /**
     * 파일 변경 처리
     * @private
     */
    _handleFileChange(event) {
        const files = Array.from(event.target.files);
        if (files.length > 0) {
            const selected = files.slice(0, 5);
            this.currentData.image_files = selected;
            this.currentData.image_file = selected[0]; // 하위 호환
            this.view.setFileName(
                selected.length === 1
                    ? selected[0].name
                    : `${selected.length}개 파일 선택됨`
            );
            readFileAsDataURL(selected[0], (dataUrl) => {
                this.view.showImagePreview(dataUrl);
            });
        }
        this._checkChanges();
    }

    /**
     * 변경 사항 확인
     * @private
     */
    _checkChanges() {
        const title = this.view.getTitle();
        const content = this.view.getContent();
        const hasImageChanged = this.currentData.image_files.length > 0;

        const categorySelect = document.getElementById('category-select');
        const currentCategoryId = categorySelect ? Number(categorySelect.value) : null;
        const isCategoryChanged = currentCategoryId !== this.originalData.category_id;

        const isTitleChanged = title !== this.originalData.title;
        const isContentChanged = content !== this.originalData.content;

        const isValid = title.length > 0 && content.length > 0;
        const isChanged = isTitleChanged || isContentChanged || hasImageChanged || isCategoryChanged;

        this.view.updateButtonState(isValid && isChanged);
        this.view.toggleValidationHelper(!(isValid && isChanged));
    }

    /**
     * 폼 제출 처리
     * @private
     */
    async _handleSubmit(event) {
        event.preventDefault();

        const title = this.view.getTitle();
        const content = this.view.getContent();

        try {
            const imageUrls = [];

            // 다중 이미지 업로드
            if (this.currentData.image_files.length > 0) {
                for (const file of this.currentData.image_files) {
                    const uploadResult = await PostModel.uploadImage(file);
                    const url = extractUploadedImageUrl(uploadResult);
                    if (!url) {
                        this.view.showToast(UI_MESSAGES.IMAGE_UPLOAD_FAIL);
                        return;
                    }
                    imageUrls.push(url);
                }
            }

            const categorySelect = document.getElementById('category-select');
            const categoryId = categorySelect ? Number(categorySelect.value) : null;

            const payload = {
                title: title,
                content: content,
                tags: this.view.getTags(),
            };

            if (imageUrls.length > 0) {
                payload.image_urls = imageUrls;
            }
            if (categoryId && categoryId !== this.originalData.category_id) {
                payload.category_id = categoryId;
            }

            const result = await PostModel.updatePost(this.postId, payload);

            if (result.ok) {
                DraftService.clear(this._getDraftKey());
                showToastAndRedirect(UI_MESSAGES.POST_UPDATE_SUCCESS, NAV_PATHS.DETAIL(this.postId));
            } else {
                this.view.showToast(UI_MESSAGES.POST_UPDATE_FAIL);
            }
        } catch (error) {
            logger.error('게시글 수정 실패', error);
            this.view.showToast(UI_MESSAGES.UNKNOWN_ERROR);
        }
    }

    /**
     * 임시 저장 키 반환
     * @private
     * @returns {string}
     */
    _getDraftKey() {
        return `draft:edit:${this.postId}`;
    }

    /**
     * 임시 저장된 수정 내용 복원
     * 서버 데이터와 동일하면 복원하지 않음
     * @private
     */
    _restoreDraft() {
        const draft = DraftService.load(this._getDraftKey());
        if (!draft) return;

        // 서버 데이터와 동일하면 복원 불필요
        if (draft.title === this.originalData.title &&
            draft.content === this.originalData.content &&
            draft.categoryId === this.originalData.category_id) {
            DraftService.clear(this._getDraftKey());
            return;
        }

        const timeStr = DraftService.formatSavedAt(draft.savedAt);
        const restore = confirm(`임시 저장된 수정 내용이 있습니다 (${timeStr}). 불러올까요?`);

        if (restore) {
            this.view.setTitle(draft.title || '');
            this.view.setContent(draft.content || '');
            const categorySelect = document.getElementById('category-select');
            if (categorySelect && draft.categoryId) {
                categorySelect.value = draft.categoryId;
            }
            this._checkChanges();
        } else {
            DraftService.clear(this._getDraftKey());
        }
    }

    /**
     * 임시 저장 디바운스 스케줄링
     * @private
     */
    _scheduleDraftSave() {
        clearTimeout(this._draftTimer);
        this._draftTimer = setTimeout(() => {
            const title = this.view.getTitle();
            const content = this.view.getContent();
            if (!title && !content) return;
            const categorySelect = document.getElementById('category-select');
            const categoryId = categorySelect ? Number(categorySelect.value) : null;
            DraftService.save(this._getDraftKey(), { title, content, categoryId });
        }, DRAFT_SAVE_DELAY);
    }
}

export default EditController;
