// js/views/ModalView.js
// 모달 UI 관련 로직

/**
 * 모달 View 클래스
 */
class ModalView {
    /**
     * 확인 모달 열기
     * @param {string} modalId - 모달 요소 ID
     * @param {string} title - 모달 제목
     */
    static openConfirmModal(modalId, title) {
        const modal = document.getElementById(modalId);
        const titleEl = document.getElementById('modal-title');

        if (titleEl) {
            titleEl.innerText = title;
        }

        if (modal) {
            document.body.style.overflow = 'hidden';
            modal.classList.remove('hidden');
        }
    }

    /**
     * 모달 닫기
     * @param {string} modalId - 모달 요소 ID
     */
    static closeModal(modalId) {
        const modal = document.getElementById(modalId);

        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    /**
     * 버튼을 cloneNode로 교체하여 이전 리스너를 제거하고 새 리스너를 등록합니다.
     * @param {string} btnId - 버튼 요소 ID
     * @param {Function} handler - 클릭 핸들러
     * @private
     */
    static _replaceButton(btnId, handler) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        const fresh = /** @type {HTMLElement} */ (btn.cloneNode(true));
        btn.parentNode?.replaceChild(fresh, btn);
        fresh.addEventListener('click', handler);
    }

    /**
     * 삭제 확인 모달 설정
     * cloneNode 패턴으로 이전 리스너를 자동 제거합니다.
     * @param {object} options - 설정 옵션
     * @param {string} options.modalId - 모달 요소 ID
     * @param {string} options.cancelBtnId - 취소 버튼 ID
     * @param {string} options.confirmBtnId - 확인 버튼 ID
     * @param {Function} options.onConfirm - 확인 클릭 핸들러
     */
    static setupDeleteModal(options) {
        ModalView._replaceButton(options.cancelBtnId, () => {
            ModalView.closeModal(options.modalId);
        });
        ModalView._replaceButton(options.confirmBtnId, options.onConfirm);
    }

    /**
     * 회원 탈퇴 모달 열기
     * @param {string} modalId - 모달 요소 ID
     */
    static openWithdrawModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    /**
     * 회원 탈퇴 헬퍼 표시/숨기기
     * @param {string} helperId - 헬퍼 요소 ID
     * @param {boolean} show - 표시 여부
     */
    static toggleWithdrawHelper(helperId, show) {
        const helper = document.getElementById(helperId);
        if (helper) {
            helper.style.display = show ? 'block' : 'none';
        }
    }
}

export default ModalView;
