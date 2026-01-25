// js/app/edit.js
// 게시글 수정 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import EditController from '../controllers/EditController.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 헤더 초기화
    const headerController = new HeaderController();
    await headerController.init();

    // 수정 페이지 초기화
    const editController = new EditController();
    await editController.init();
});
