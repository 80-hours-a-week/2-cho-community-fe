// js/constants.js
// 상수 정의 파일

import { API_BASE_URL } from './config.js';

export { API_BASE_URL };

export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/v1/auth/session',
        LOGOUT: '/v1/auth/session',
    },
    USERS: {
        ROOT: '/v1/users',
        ME: '/v1/users/me',
        PASSWORD: '/v1/users/me/password',
        PROFILE_IMAGE: '/v1/users/profile/image',
    },
    POSTS: {
        ROOT: '/v1/posts',
        IMAGE: '/v1/posts/image'
    },
    COMMENTS: {
        /**
         * 댓글 목록/생성 엔드포인트
         * @param {string|number} postId - 게시글 ID
         * @returns {string} - 엔드포인트 경로
         */
        ROOT: (postId) => `/v1/posts/${postId}/comments`,
        /**
         * 개별 댓글 엔드포인트 (수정/삭제)
         * @param {string|number} postId - 게시글 ID
         * @param {string|number} commentId - 댓글 ID
         * @returns {string} - 엔드포인트 경로
         */
        DETAIL: (postId, commentId) => `/v1/posts/${postId}/comments/${commentId}`
    }
};

export const UI_MESSAGES = {
    SIGNUP_SUCCESS: '회원가입이 완료되었습니다!',
    LOGIN_REQUIRED: '로그인이 필요합니다.',
    SERVER_ERROR: '서버 통신 중 오류가 발생했습니다.',
    UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
    POST_LOAD_FAIL: '게시글 목록을 불러오지 못했습니다.',
    POST_DETAIL_FAIL: '게시글을 불러오지 못했습니다.',
    INVALID_ACCESS: '잘못된 접근입니다.',
    POST_NOT_FOUND: '게시글 데이터가 없습니다.',
    LIKE_FAIL: '좋아요 처리에 실패했습니다.',
    DELETE_SUCCESS: '삭제되었습니다.',
    DELETE_FAIL: '삭제 실패',
    COMMENT_UPDATE_FAIL: '댓글 수정 실패',
    COMMENT_CREATE_FAIL: '댓글 등록 실패',
    POST_UPDATE_SUCCESS: '게시글이 수정되었습니다.',
    POST_DELETE_SUCCESS: '게시글이 삭제되었습니다.',
    POST_CREATE_SUCCESS: '게시글이 작성되었습니다.',
    IMAGE_UPLOAD_FAIL: '이미지 업로드 실패',

    LOGOUT_SUCCESS: '로그아웃 되었습니다.',
};

export const NAV_PATHS = {
    MAIN: '/main',
    LOGIN: '/login',
    WRITE: '/write',
    DETAIL: (id) => `/detail?id=${id}`,
    EDIT: (id) => `/edit?id=${id}`,
    PASSWORD: '/password',
    EDIT_PROFILE: '/edit-profile',
};
