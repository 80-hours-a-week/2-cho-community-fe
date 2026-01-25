// js/controllers/EditController.js
// 게시글 수정 페이지 컨트롤러

import PostModel from '../models/PostModel.js';

/**
 * 게시글 수정 페이지 컨트롤러
 */
class EditController {
    constructor() {
        this.originalData = { title: '', content: '', image_url: null };
        this.currentData = { title: '', content: '', image_file: null };
        this.postId = null;
    }

    /**
     * 컨트롤러 초기화
     */
    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        this.postId = urlParams.get('id');

        if (!this.postId) {
            alert('잘못된 접근입니다.');
            location.href = '/main';
            return;
        }

        this.editForm = document.getElementById('edit-form');
        this.titleInput = document.getElementById('post-title');
        this.contentInput = document.getElementById('post-content');
        this.submitBtn = document.getElementById('submit-btn');
        this.validationHelper = document.getElementById('validation-helper');
        this.fileInput = document.getElementById('file-input');
        this.previewContainer = document.getElementById('image-preview');

        if (!this.editForm) return;

        await this._loadPostData();
        this._setupEventListeners();
    }

    /**
     * 게시글 데이터 로드
     * @private
     */
    async _loadPostData() {
        try {
            const result = await PostModel.getPost(this.postId);

            if (!result.ok) throw new Error('게시글을 불러오지 못했습니다.');

            const post = result.data?.data?.post || result.data?.data;

            this.titleInput.value = post.title;
            this.contentInput.value = post.content;

            this.originalData.title = post.title;
            this.originalData.content = post.content;

            if (post.image_urls && post.image_urls.length > 0) {
                this.originalData.image_url = post.image_urls[0];
                this.previewContainer.innerHTML = `<img src="${post.image_urls[0]}" alt="Current Image" class="preview-img">`;
                this.previewContainer.classList.remove('hidden');
            }

        } catch (error) {
            console.error(error);
            alert(error.message);
            location.href = '/main';
        }
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
            this._checkChanges();
        });

        // 본문 입력
        this.contentInput.addEventListener('input', () => {
            this._checkChanges();
        });

        // 이미지 변경
        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.currentData.image_file = file;
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.previewContainer.innerHTML = `<img src="${e.target.result}" alt="Preview" class="preview-img">`;
                    this.previewContainer.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
            this._checkChanges();
        });

        // 폼 제출
        this.editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this._handleUpdate();
        });
    }

    /**
     * 변경 사항 확인
     * @private
     */
    _checkChanges() {
        const title = this.titleInput.value.trim();
        const content = this.contentInput.value.trim();
        const hasImageChanged = !!this.currentData.image_file;

        const isTitleChanged = title !== this.originalData.title;
        const isContentChanged = content !== this.originalData.content;

        const isValid = title.length > 0 && content.length > 0;
        const isChanged = isTitleChanged || isContentChanged || hasImageChanged;

        if (isValid && isChanged) {
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
     * 수정 처리
     * @private
     */
    async _handleUpdate() {
        const title = this.titleInput.value.trim();
        const content = this.contentInput.value.trim();

        try {
            const payload = {
                title: title,
                content: content
            };

            const result = await PostModel.updatePost(this.postId, payload);

            if (result.ok) {
                location.href = `/detail?id=${this.postId}`;
            } else {
                alert('게시글 수정 실패');
            }
        } catch (error) {
            console.error('수정 에러:', error);
            alert('오류가 발생했습니다.');
        }
    }
}

export default EditController;
