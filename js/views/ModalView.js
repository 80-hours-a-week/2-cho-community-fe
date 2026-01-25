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
     * 삭제 확인 모달 설정
     * @param {object} options - 설정 옵션
     * @param {string} options.modalId - 모달 요소 ID
     * @param {string} options.cancelBtnId - 취소 버튼 ID
     * @param {string} options.confirmBtnId - 확인 버튼 ID
     * @param {Function} options.onConfirm - 확인 클릭 핸들러
     */
    static setupDeleteModal(options) {
        const cancelBtn = document.getElementById(options.cancelBtnId);
        const confirmBtn = document.getElementById(options.confirmBtnId);

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                ModalView.closeModal(options.modalId);
            });
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', options.onConfirm);
        }
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
