// js/models/UserModel.js
// 사용자 관련 API 호출 관리

import Api from './api.js';

/**
 * 사용자 관련 Model
 */
class UserModel {
    /**
     * 회원가입
     * @param {FormData} formData - 회원가입 폼 데이터 (email, password, nickname, profile_image)
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async signup(formData) {
        return Api.postFormData('/v1/users', formData);
    }

    /**
     * 사용자 프로필 수정
     * @param {object} data - 수정할 데이터 (nickname, profileImageUrl 등)
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async updateProfile(data) {
        return Api.patch('/v1/users/me', data);
    }

    /**
     * 비밀번호 변경
     * @param {string} newPassword - 새 비밀번호
     * @param {string} newPasswordConfirm - 새 비밀번호 확인
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async changePassword(newPassword, newPasswordConfirm) {
        return Api.put('/v1/users/me/password', {
            new_password: newPassword,
            new_password_confirm: newPasswordConfirm
        });
    }

    /**
     * 회원 탈퇴
     * @param {string} password - 비밀번호 확인
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async withdraw(password) {
        return Api.delete('/v1/users/me', {
            password: password,
            agree: true
        });
    }

    /**
     * 프로필 이미지 업로드 (게시글 이미지 업로드 엔드포인트 사용)
     * @param {File} file - 이미지 파일
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    static async uploadProfileImage(file) {
        const formData = new FormData();
        formData.append('file', file);
        return Api.postFormData('/v1/posts/image', formData);
    }
}

export default UserModel;
