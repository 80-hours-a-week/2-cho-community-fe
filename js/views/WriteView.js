// js/views/WriteView.js
// 게시글 작성 페이지 View - PostFormView 상속

import PostFormView from './PostFormView.js';

/**
 * 게시글 작성 페이지 View 클래스
 */
class WriteView extends PostFormView {
    constructor() {
        super('write-form');
    }
}

export default WriteView;