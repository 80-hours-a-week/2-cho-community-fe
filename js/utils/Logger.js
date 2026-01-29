// js/utils/Logger.js
// Factory 패턴 기반 로깅 유틸리티

/**
 * 로그 레벨 상수
 */
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

/**
 * 전역 로그 설정
 */
let globalLogLevel = LOG_LEVELS.DEBUG;

/**
 * Logger Factory 클래스
 * 컨텍스트가 바인딩된 로거 인스턴스를 생성합니다.
 */
class Logger {
    /**
     * 전역 로그 레벨 설정
     * @param {string} level - 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
     */
    static setLevel(level) {
        if (LOG_LEVELS[level] !== undefined) {
            globalLogLevel = LOG_LEVELS[level];
        }
    }

    /**
     * 현재 로그 레벨 반환
     * @returns {string} 현재 로그 레벨
     */
    static getLevel() {
        return Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === globalLogLevel);
    }

    /**
     * 컨텍스트가 바인딩된 로거 인스턴스 생성
     * @param {string} context - 로그 컨텍스트 (예: 'LoginController', 'ApiService')
     * @returns {LoggerInstance} 로거 인스턴스
     */
    static createLogger(context) {
        return new LoggerInstance(context);
    }
}

/**
 * 로거 인스턴스 클래스
 * 특정 컨텍스트에 바인딩된 로거
 */
class LoggerInstance {
    /**
     * @param {string} context - 로그 컨텍스트
     */
    constructor(context) {
        this.context = context;
    }

    /**
     * 타임스탬프 생성
     * @returns {string} HH:MM:SS 형식의 타임스탬프
     * @private
     */
    _getTimestamp() {
        const now = new Date();
        return now.toTimeString().split(' ')[0];
    }

    /**
     * 로그 포맷 생성
     * @param {string} level - 로그 레벨
     * @returns {string} 포맷된 프리픽스
     * @private
     */
    _formatPrefix(level) {
        return `[${this._getTimestamp()}] [${level}] [${this.context}]`;
    }

    /**
     * DEBUG 레벨 로그
     * @param {string} message - 로그 메시지
     * @param {...any} args - 추가 데이터
     */
    debug(message, ...args) {
        if (globalLogLevel <= LOG_LEVELS.DEBUG) {
            console.debug(`${this._formatPrefix('DEBUG')} ${message}`, ...args);
        }
    }

    /**
     * INFO 레벨 로그
     * @param {string} message - 로그 메시지
     * @param {...any} args - 추가 데이터
     */
    info(message, ...args) {
        if (globalLogLevel <= LOG_LEVELS.INFO) {
            console.info(`${this._formatPrefix('INFO')} ${message}`, ...args);
        }
    }

    /**
     * WARN 레벨 로그
     * @param {string} message - 로그 메시지
     * @param {...any} args - 추가 데이터
     */
    warn(message, ...args) {
        if (globalLogLevel <= LOG_LEVELS.WARN) {
            console.warn(`${this._formatPrefix('WARN')} ${message}`, ...args);
        }
    }

    /**
     * ERROR 레벨 로그
     * @param {string} message - 로그 메시지
     * @param {...any} args - 추가 데이터
     */
    error(message, ...args) {
        if (globalLogLevel <= LOG_LEVELS.ERROR) {
            console.error(`${this._formatPrefix('ERROR')} ${message}`, ...args);
        }
    }
}

// 전역에서 Logger.setLevel() 사용 가능하도록 window에 노출 (개발용)
if (typeof window !== 'undefined') {
    window.Logger = Logger;
}

export default Logger;
