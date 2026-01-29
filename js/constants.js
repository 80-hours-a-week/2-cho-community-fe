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
        CHECK_EMAIL: '/v1/users/check-email', // Assumed if exists, or for future
        CHECK_NICKNAME: '/v1/users/check-nickname' // Assumed
    },
    POSTS: {
        ROOT: '/v1/posts',
        IMAGE: '/v1/posts/image'
    }
};

export const UI_MESSAGES = {
    SIGNUP_SUCCESS: '회원가입이 완료되었습니다!',
    LOGIN_REQUIRED: '로그인이 필요합니다.',
    SERVER_ERROR: '서버 통신 중 오류가 발생했습니다.',
    UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.'
};
