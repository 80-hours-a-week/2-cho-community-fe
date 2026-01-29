// js/controllers/EditController.js
// 게시글 수정 페이지 컨트롤러 - 비즈니스 로직 및 이벤트 처리 담당

import PostModel from '../models/PostModel.js';
import EditView from '../views/EditView.js';
import Logger from '../utils/Logger.js';

const logger = Logger.createLogger('EditController');

/**
 * 게시글 수정 페이지 컨트롤러
 * Model과 View를 연결하고 비즈니스 로직을 처리
 */
class EditController {
    constructor() {
        this.view = new EditView();
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

        // View 초기화
        if (!this.view.initialize()) return;

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

            this.view.setTitle(post.title);
            this.view.setContent(post.content);

            this.originalData.title = post.title;
            this.originalData.content = post.content;

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
            alert(error.message);
            location.href = '/main';
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
        this._checkChanges();
    }

    /**
     * 본문 입력 처리
     * @private
     */
    _handleContentInput() {
        this._checkChanges();
    }

    /**
     * 파일 변경 처리
     * @private
     */
    _handleFileChange(event) {
        const file = event.target.files[0];
        if (file) {
            this.currentData.image_file = file;
            this.view.setFileName(file.name);
            const reader = new FileReader();
            reader.onload = (e) => {
                this.view.showImagePreview(e.target.result);
            };
            reader.readAsDataURL(file);
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
        const hasImageChanged = !!this.currentData.image_file;

        const isTitleChanged = title !== this.originalData.title;
        const isContentChanged = content !== this.originalData.content;

        const isValid = title.length > 0 && content.length > 0;
        const isChanged = isTitleChanged || isContentChanged || hasImageChanged;

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
            let newImageUrl = null;

            // 이미지 업로드
            if (this.currentData.image_file) {
                const uploadResult = await PostModel.uploadImage(this.currentData.image_file);

                if (uploadResult.ok) {
                    const data = uploadResult.data?.data;
                    newImageUrl = (data && typeof data === 'object' && data.url) ? data.url : data;
                } else {
                    alert('이미지 업로드 실패');
                    return;
                }
            }

            const payload = {
                title: title,
                content: content
            };

            if (newImageUrl) {
                payload.image_url = newImageUrl;
            }

            const result = await PostModel.updatePost(this.postId, payload);

            if (result.ok) {
                location.href = `/detail?id=${this.postId}`;
            } else {
                alert('게시글 수정 실패');
            }
        } catch (error) {
            logger.error('게시글 수정 실패', error);
            alert('오류가 발생했습니다.');
        }
    }
}

export default EditController;
