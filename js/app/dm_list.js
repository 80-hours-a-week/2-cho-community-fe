// js/app/dm_list.js
// DM 목록 페이지 진입점

import HeaderController from '../controllers/HeaderController.js';
import { DMListController } from '../controllers/DMListController.js';
import { resolveNavPath } from '../config.js';
import { NAV_PATHS } from '../constants.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 데스크톱이면 통합 페이지로 리다이렉트
    if (window.innerWidth >= 768) {
        location.replace(resolveNavPath(NAV_PATHS.DM_INBOX));
        return;
    }

    // 인증 필요 페이지: headerController 초기화 완료 후 페이지 컨트롤러 실행
    const headerController = new HeaderController();
    await headerController.init();

    document.getElementById('back-btn')?.addEventListener('click', () => history.back());

    DMListController.init();
});
