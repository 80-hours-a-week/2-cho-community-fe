// js/app/dm_list.js
// DM 목록 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import { DMListController } from '../controllers/DMListController.js';
import { resolveNavPath } from '../config.js';
import { NAV_PATHS } from '../constants.js';

document.addEventListener('DOMContentLoaded', () => {
    // 데스크톱이면 통합 페이지로 리다이렉트
    if (window.innerWidth >= 768) {
        location.replace(resolveNavPath(NAV_PATHS.DM_INBOX));
        return;
    }

    // 비동기 초기화가 페이지 컨트롤러를 차단하지 않도록 await하지 않음
    const headerController = new HeaderController();
    headerController.init();

    document.getElementById('back-btn')?.addEventListener('click', () => history.back());

    DMListController.init();
});
