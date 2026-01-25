// js/controllers/WriteController.js
// 게시글 작성 페이지 컨트롤러

import PostModel from '../models/PostModel.js';

/**
 * 게시글 작성 페이지 컨트롤러
 */
class WriteController {
    constructor() {
        this.selectedFile = null;
    }

    /**
     * 컨트롤러 초기화
     */
    init() {
        this.writeForm = document.getElementById('write-form');
        this.titleInput = document.getElementById('post-title');
        this.contentInput = document.getElementById('post-content');
        this.submitBtn = document.getElementById('submit-btn');
        this.validationHelper = document.getElementById('validation-helper');
        this.fileInput = document.getElementById('file-input');
        this.previewContainer = document.getElementById('image-preview');

        if (!this.writeForm) return;

        this._setupEventListeners();
    }

    /**
     * 이벤트 리스너 설정
     * @private
     */
    _setupEventListeners() {
        // 제목 입력 (최대 26자)
        this.titleInput.addEventListener('input', () => {
            if (this.titleInput.value.length > 26) {
                this.titleInput.value = this.titleInput.value.slice(0, 26);
            }
            this._validateForm();
        });

        // 본문 입력
        this.contentInput.addEventListener('input', () => {
            this._validateForm();
        });

        // 이미지 업로드
        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.selectedFile = file;
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.previewContainer.innerHTML = `<img src="${e.target.result}" alt="Preview" class="preview-img">`;
                    this.previewContainer.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            } else {
                this.selectedFile = null;
                this.previewContainer.innerHTML = '';
                this.previewContainer.classList.add('hidden');
            }
        });

        // 폼 제출
        this.writeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this._handleSubmit();
        });
    }

    /**
     * 폼 유효성 검사
     * @private
     */
    _validateForm() {
        const title = this.titleInput.value.trim();
        const content = this.contentInput.value.trim();

        if (title && content) {
            this.submitBtn.disabled = false;
            this.submitBtn.classList.add('active');
            this.validationHelper.style.display = 'none';
        } else {
            this.submitBtn.disabled = true;
            this.submitBtn.classList.remove('active');
            this.validationHelper.style.display = 'block';
        }
    }

    /**
     * 폼 제출 처리
     * @private
     */
    async _handleSubmit() {
        const title = this.titleInput.value.trim();
        const content = this.contentInput.value.trim();

        if (!title || !content) return;

        try {
            let imageUrls = [];

            // 이미지 업로드
            if (this.selectedFile) {
                const uploadResult = await PostModel.uploadImage(this.selectedFile);

                if (uploadResult.ok) {
                    imageUrls.push(uploadResult.data?.data);
                } else {
                    alert('이미지 업로드 실패');
                    return;
                }
            }

            // 게시글 작성
            const postPayload = {
                title: title,
                content: content,
                image_urls: imageUrls
            };

            const result = await PostModel.createPost(postPayload);

            if (result.ok) {
                location.href = '/main';
            } else {
                alert('게시글 작성 실패');
            }

        } catch (error) {
            console.error('작성 에러:', error);
            alert('오류가 발생했습니다.');
        }
    }
}

export default WriteController;
