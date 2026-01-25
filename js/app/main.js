// js/app/main.js
// 메인 페이지 진입점

import MainController from '../controllers/MainController.js';

document.addEventListener('DOMContentLoaded', () => {
    const controller = new MainController();
    controller.init();
});
