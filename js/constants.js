// @ts-check
// js/constants.js
// 상수 정의 파일

export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/v1/auth/session',
        LOGOUT: '/v1/auth/session',
        REFRESH: '/v1/auth/token/refresh',
        ME: '/v1/auth/me',
    },
    USERS: {
        ROOT: '/v1/users',
        ME: '/v1/users/me',
        PASSWORD: '/v1/users/me/password',
        PROFILE_IMAGE: '/v1/users/profile/image',
        FIND_EMAIL: '/v1/users/find-email',
        RESET_PASSWORD: '/v1/users/reset-password',
        SEARCH: '/v1/users/search',
    },
    POSTS: {
        ROOT: '/v1/posts',
        IMAGE: '/v1/posts/image',
        /** @param {string|number} postId */
        PIN: (postId) => `/v1/posts/${postId}/pin`,
        /** @param {string|number} postId */
        VOTE_POLL: (postId) => `/v1/posts/${postId}/poll/vote`,
        /** @param {string|number} postId */
        RELATED: (postId) => `/v1/posts/${postId}/related`,
    },
    CATEGORIES: {
        ROOT: '/v1/categories',
    },
    REPORTS: {
        ROOT: '/v1/reports',
    },
    ADMIN: {
        DASHBOARD: '/v1/admin/dashboard',
        USERS: '/v1/admin/users',
        REPORTS: '/v1/admin/reports',
        /** @param {string|number} id */
        RESOLVE_REPORT: (id) => `/v1/admin/reports/${id}`,
        // POST/DELETE 메서드로 구분 (같은 URL)
        /** @param {string|number} userId */
        SUSPEND_USER: (userId) => `/v1/admin/users/${userId}/suspend`,
        /** @param {string|number} userId */
        UNSUSPEND_USER: (userId) => `/v1/admin/users/${userId}/suspend`,
    },
    LIKES: {
        /** @param {string|number} postId */
        ROOT: (postId) => `/v1/posts/${postId}/likes`,
    },
    BOOKMARKS: {
        /** @param {string|number} postId */
        ROOT: (postId) => `/v1/posts/${postId}/bookmark`,
    },
    COMMENT_LIKES: {
        /**
         * @param {string|number} postId
         * @param {string|number} commentId
         */
        ROOT: (postId, commentId) => `/v1/posts/${postId}/comments/${commentId}/like`,
    },
    BLOCKS: {
        /** @param {string|number} userId */
        BLOCK: (userId) => `/v1/users/${userId}/block`,
    },
    FOLLOW: {
        /** @param {string|number} userId */
        FOLLOW: (userId) => `/v1/users/${userId}/follow`,
        MY_FOLLOWING: '/v1/users/me/following',
        MY_FOLLOWERS: '/v1/users/me/followers',
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
    },
    NOTIFICATIONS: {
        ROOT: '/v1/notifications',
        UNREAD_COUNT: '/v1/notifications/unread-count',
        /** @param {string|number} id */
        READ: (id) => `/v1/notifications/${id}/read`,
        READ_ALL: '/v1/notifications/read-all',
        /** @param {string|number} id */
        DELETE: (id) => `/v1/notifications/${id}`,
    },
    VERIFICATION: {
        VERIFY: '/v1/auth/verify-email',
        RESEND: '/v1/auth/resend-verification',
    },
    ACTIVITY: {
        MY_POSTS: '/v1/users/me/posts',
        MY_COMMENTS: '/v1/users/me/comments',
        MY_LIKES: '/v1/users/me/likes',
        MY_BOOKMARKS: '/v1/users/me/bookmarks',
        MY_BLOCKS: '/v1/users/me/blocks',
    },
    TAGS: {
        ROOT: '/v1/tags',
    },
    DMS: {
        ROOT: '/v1/dms',
        UNREAD_COUNT: '/v1/dms/unread-count',
        /** @param {string|number} id */
        DETAIL: (id) => `/v1/dms/${id}`,
        /** @param {string|number} id */
        MESSAGES: (id) => `/v1/dms/${id}/messages`,
        /** @param {string|number} id */
        READ: (id) => `/v1/dms/${id}/read`,
    },
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
    POST_CREATE_FAIL: '게시글 작성 실패',
    POST_UPDATE_FAIL: '게시글 수정 실패',

    LOGOUT_SUCCESS: '로그아웃 되었습니다.',
    FIND_EMAIL_SUCCESS: '이메일 조회가 완료되었습니다.',
    RESET_PASSWORD_SUCCESS: '임시 비밀번호가 이메일로 발송되었습니다.',
    SEARCH_PLACEHOLDER: '게시글 검색...',
    SEARCH_NO_RESULTS: '검색 결과가 없습니다.',
    EMAIL_NOT_VERIFIED: '이메일 인증 후 이용 가능합니다.',
    VERIFICATION_SENT: '인증 메일을 발송했습니다.',
    NOTIFICATION_LOAD_FAIL: '알림 목록을 불러오지 못했습니다.',
    REPORT_SUCCESS: '신고가 접수되었습니다.',
    REPORT_DUPLICATE: '이미 신고한 콘텐츠입니다.',
    REPORT_OWN_CONTENT: '자신의 콘텐츠는 신고할 수 없습니다.',
    PIN_SUCCESS: '게시글이 고정되었습니다.',
    UNPIN_SUCCESS: '게시글 고정이 해제되었습니다.',
    REPORT_RESOLVE_SUCCESS: '신고가 처리되었습니다.',
    REPORT_DISMISS_SUCCESS: '신고가 기각되었습니다.',
    ADMIN_REQUIRED: '관리자 권한이 필요합니다.',
    BOOKMARK_FAIL: '북마크 처리에 실패했습니다.',
    COMMENT_LIKE_FAIL: '댓글 좋아요 처리에 실패했습니다.',
    BLOCK_SUCCESS: '사용자를 차단했습니다.',
    UNBLOCK_SUCCESS: '차단이 해제되었습니다.',
    BLOCK_FAIL: '차단 처리에 실패했습니다.',
    BLOCK_SELF: '자기 자신을 차단할 수 없습니다.',
    FOLLOW_SUCCESS: '팔로우했습니다.',
    UNFOLLOW_SUCCESS: '팔로우를 취소했습니다.',
    FOLLOW_FAIL: '팔로우 처리에 실패했습니다.',
    SHARE_COPIED: '링크가 복사되었습니다.',
    SUSPEND_SUCCESS: '사용자가 정지되었습니다.',
    UNSUSPEND_SUCCESS: '정지가 해제되었습니다.',
    SUSPEND_FAIL: '정지 처리에 실패했습니다.',
    ACCOUNT_SUSPENDED: '계정이 정지되었습니다.',
    POLL_VOTE_SUCCESS: '투표가 완료되었습니다.',
    POLL_VOTE_FAIL: '투표 처리에 실패했습니다.',
    POLL_SELECT_REQUIRED: '투표할 항목을 선택해주세요.',
    DM_SEND_FAIL: '메시지 전송에 실패했습니다.',
    DM_LOAD_FAIL: '대화를 불러오지 못했습니다.',
    DM_BLOCKED: '차단된 사용자와 대화할 수 없습니다.',
    DM_DELETED_USER: '탈퇴한 사용자에게 메시지를 보낼 수 없습니다.',
    DM_EMPTY: '아직 대화가 없습니다.',
    DM_DELETE_SUCCESS: '대화가 삭제되었습니다.',
};

export const NAV_PATHS = {
    MAIN: '/main',
    LOGIN: '/login',
    SIGNUP: '/signup',
    WRITE: '/write',
    /** @param {string|number} id */
    DETAIL: (id) => `/detail?id=${id}`,
    /** @param {string|number} id */
    EDIT: (id) => `/edit?id=${id}`,
    PASSWORD: '/password',
    EDIT_PROFILE: '/edit-profile',
    FIND_ACCOUNT: '/find-account',
    NOTIFICATIONS: '/notifications',
    MY_ACTIVITY: '/my-activity',
    VERIFY_EMAIL: '/verify-email',
    /** @param {string|number} id */
    USER_PROFILE: (id) => `/user-profile?id=${id}`,
    ADMIN_REPORTS: '/admin/reports',
    ADMIN_DASHBOARD: '/admin/dashboard',
    DM_LIST: '/messages',
    /** @param {string|number} id */
    DM_DETAIL: (id) => `/messages/detail?id=${id}`,
};

export const SORT_OPTIONS = {
    LATEST: 'latest',
    LIKES: 'likes',
    VIEWS: 'views',
    COMMENTS: 'comments',
    HOT: 'hot',
};

export const SORT_LABELS = {
    latest: '최신순',
    likes: '인기순',
    views: '조회순',
    comments: '댓글순',
    hot: '핫',
};

// 클린 URL → 실제 HTML 파일 매핑
/** @type {Record<string, string>} */
export const HTML_PATHS = {
    '/': '/user_login.html',
    '/main': '/post_list.html',
    '/login': '/user_login.html',
    '/signup': '/user_signup.html',
    '/write': '/post_write.html',
    '/detail': '/post_detail.html',
    '/edit': '/post_edit.html',
    '/password': '/user_password.html',
    '/edit-profile': '/user_edit.html',
    '/find-account': '/user_find_account.html',
    '/notifications': '/notifications.html',
    '/my-activity': '/my-activity.html',
    '/verify-email': '/verify-email.html',
    '/user-profile': '/user-profile.html',
    '/admin/reports': '/admin_reports.html',
    '/admin/dashboard': '/admin_dashboard.html',
    '/messages': '/dm_list.html',
    '/messages/detail': '/dm_detail.html',
};

/** @type {Record<number, string>} */
export const CATEGORY_LABELS = {
    1: '자유게시판',
    2: '질문답변',
    3: '정보공유',
    4: '공지사항',
};

// 공지사항 카테고리 slug (관리자만 선택 가능)
export const NOTICE_CATEGORY_SLUG = 'notice';

export const REPORT_REASONS = {
    spam: '스팸',
    abuse: '욕설/비방',
    inappropriate: '부적절한 내용',
    other: '기타',
};
