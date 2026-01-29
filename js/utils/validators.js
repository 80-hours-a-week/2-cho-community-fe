// js/utils/validators.js
// 유효성 검사 규칙 (순수 함수, DOM 조작 없음)

/**
 * 유효성 검사 정규식 패턴
 */
export const VALIDATION_PATTERNS = {
    // 이메일: 일반적인 이메일 형식 (example@domain.com)
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

    // 비밀번호: 
    // (?=.*[a-z]) : 최소 하나의 소문자 포함
    // (?=.*[A-Z]) : 최소 하나의 대문자 포함
    // (?=.*\d)    : 최소 하나의 숫자 포함
    // (?=.*[!@...]) : 최소 하나의 특수문자 포함
    // .{8,20}     : 총 길이 8~20자
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,20}$/
};

/**
 * 유효성 검사 에러 메시지
 */
export const VALIDATION_MESSAGES = {
    email: {
        required: '* 이메일을 입력해주세요.',
        invalid: '* 올바른 이메일 주소 형식을 입력해주세요. (예: example@adapterz.kr)'
    },
    password: {
        required: '* 비밀번호를 입력해주세요',
        // 사용자에게 노출될 구체적인 요구사항 설명
        invalid: '* 비밀번호는 8자 이상 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다'
    },
    passwordConfirm: {
        required: '* 비밀번호를 한번 더 입력해주세요',
        mismatch: '* 비밀번호가 다릅니다'
    },
    nickname: {
        required: '* 닉네임을 입력해주세요',
        hasSpace: '* 띄어쓰기를 없애주세요',
        tooLong: '* 닉네임은 최대 10자까지 작성 가능합니다.'
    },
    profile: {
        required: '* 프로필 사진을 추가해주세요'
    }
};

/**
 * 유효성 검사 유틸리티 클래스
 * 순수한 검증 로직만 포함 (DOM 조작 없음)
 */
class Validators {
    /**
     * 이메일 유효성 검사
     * @param {string} value - 이메일 값
     * @returns {{valid: boolean, message: string|null}}
     */
    static validateEmail(value) {
        const trimmed = value.trim();

        if (!trimmed) {
            return { valid: false, message: VALIDATION_MESSAGES.email.required };
        }

        if (!VALIDATION_PATTERNS.email.test(trimmed)) {
            return { valid: false, message: VALIDATION_MESSAGES.email.invalid };
        }

        return { valid: true, message: null };
    }

    /**
     * 비밀번호 유효성 검사
     * @param {string} value - 비밀번호 값
     * @returns {{valid: boolean, message: string|null}}
     */
    static validatePassword(value) {
        if (!value) {
            return { valid: false, message: VALIDATION_MESSAGES.password.required };
        }

        if (!VALIDATION_PATTERNS.password.test(value)) {
            return { valid: false, message: VALIDATION_MESSAGES.password.invalid };
        }

        return { valid: true, message: null };
    }

    /**
     * 비밀번호 확인 유효성 검사
     * @param {string} password - 비밀번호 값
     * @param {string} confirmPassword - 비밀번호 확인 값
     * @returns {{valid: boolean, message: string|null}}
     */
    static validatePasswordConfirm(password, confirmPassword) {
        if (!confirmPassword) {
            return { valid: false, message: VALIDATION_MESSAGES.passwordConfirm.required };
        }

        if (password !== confirmPassword) {
            return { valid: false, message: VALIDATION_MESSAGES.passwordConfirm.mismatch };
        }

        return { valid: true, message: null };
    }

    /**
     * 닉네임 유효성 검사
     * @param {string} value - 닉네임 값
     * @returns {{valid: boolean, message: string|null}}
     */
    static validateNickname(value) {
        const trimmed = value.trim();

        if (!trimmed) {
            return { valid: false, message: VALIDATION_MESSAGES.nickname.required };
        }

        if (value.includes(' ')) {
            return { valid: false, message: VALIDATION_MESSAGES.nickname.hasSpace };
        }

        if (value.length > 10) {
            return { valid: false, message: VALIDATION_MESSAGES.nickname.tooLong };
        }

        return { valid: true, message: null };
    }

    /**
     * 프로필 이미지 유효성 검사
     * @param {File|null} file - 파일 객체
     * @returns {{valid: boolean, message: string|null}}
     */
    static validateProfileImage(file) {
        if (!file) {
            return { valid: false, message: VALIDATION_MESSAGES.profile.required };
        }

        return { valid: true, message: null };
    }
}

export default Validators;
