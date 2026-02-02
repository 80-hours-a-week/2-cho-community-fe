// js/views/EditView.js
// 게시글 수정 페이지 View - PostFormView 상속

import PostFormView from './PostFormView.js';

/**
 * 게시글 수정 페이지 View 클래스
 */
class EditView extends PostFormView {
    constructor() {
        super('edit-form');
    }
}

export default EditView;