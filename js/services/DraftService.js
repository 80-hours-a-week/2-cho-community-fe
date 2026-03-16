// @ts-check
// js/services/DraftService.js
// localStorage 기반 게시글 임시 저장 서비스

import Logger from '../utils/Logger.js';

const logger = Logger.createLogger('DraftService');
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7일

class DraftService {
    /** @type {boolean} */
    static _notifiedStorageFull = false;

    /**
     * 임시 저장 데이터를 localStorage에 저장.
     * savedAt 타임스탬프 자동 추가.
     * @param {string} key - 저장 키 (예: 'draft:write', 'draft:edit:123')
     * @param {{title: string, content: string, categoryId: number|null}} fields - 저장할 필드
     * @returns {void}
     */
    static save(key, { title, content, categoryId }) {
        try {
            const data = {
                title,
                content,
                categoryId,
                savedAt: new Date().toISOString(),
            };
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            logger.warn('임시 저장 실패', e);
            if (!DraftService._notifiedStorageFull) {
                DraftService._notifiedStorageFull = true;
                import('../views/helpers.js').then(({ showToast }) => {
                    showToast('저장 공간이 부족하여 임시 저장이 비활성화되었습니다');
                });
            }
        }
    }

    /**
     * 저장된 임시 데이터 로드.
     * TTL(7일) 초과 시 삭제 후 null 반환.
     * 파싱 실패 시 null 반환.
     * @param {string} key - 저장 키
     * @returns {DraftData|null}
     */
    static load(key) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;

            const data = JSON.parse(raw);
            if (!data || !data.savedAt) return null;

            // TTL 검사 — 만료된 항목 제거
            const elapsed = Date.now() - new Date(data.savedAt).getTime();
            if (elapsed > DRAFT_TTL_MS) {
                DraftService.clear(key);
                return null;
            }

            return {
                title: data.title ?? '',
                content: data.content ?? '',
                categoryId: data.categoryId ?? null,
                savedAt: data.savedAt,
            };
        } catch (e) {
            logger.warn('임시 저장 로드 실패', e);
            return null;
        }
    }

    /**
     * 임시 저장 데이터 삭제.
     * @param {string} key - 저장 키
     * @returns {void}
     */
    static clear(key) {
        try {
            localStorage.removeItem(key);
        } catch {
            // 조용히 실패
        }
    }

    /**
     * 유효한 임시 저장 데이터 존재 여부.
     * @param {string} key - 저장 키
     * @returns {boolean}
     */
    static exists(key) {
        return DraftService.load(key) !== null;
    }

    /**
     * 서버에서 임시저장 로드 (로그인 시 localStorage보다 우선).
     * @returns {Promise<DraftData|null>}
     */
    static async loadFromServer() {
        try {
            const { default: ApiService } = await import('./ApiService.js');
            const result = await ApiService.get('/v1/drafts/');
            if (!result.ok) return null;
            const draft = result.data?.data?.draft;
            if (!draft) return null;
            return {
                title: draft.title ?? '',
                content: draft.content ?? '',
                categoryId: draft.category_id ?? null,
                savedAt: draft.updated_at,
            };
        } catch {
            return null;
        }
    }

    /**
     * 서버에 임시저장 (로그인 상태에서 호출).
     * @param {{title: string, content: string, categoryId: number|null}} fields
     * @returns {Promise<boolean>}
     */
    static async saveToServer({ title, content, categoryId }) {
        try {
            const { default: ApiService } = await import('./ApiService.js');
            const result = await ApiService.put('/v1/drafts/', {
                title: title || null,
                content: content || null,
                category_id: categoryId || null,
            });
            return result.ok;
        } catch {
            return false;
        }
    }

    /**
     * 서버의 임시저장 삭제.
     * @returns {Promise<boolean>}
     */
    static async clearFromServer() {
        try {
            const { default: ApiService } = await import('./ApiService.js');
            const result = await ApiService.delete('/v1/drafts/');
            return result.ok;
        } catch {
            return false;
        }
    }

    /**
     * ISO 문자열을 "3월 5일 12:34" 형식으로 변환.
     * 유효하지 않은 입력 시 빈 문자열 반환.
     * @param {string} isoString - ISO 8601 날짜 문자열
     * @returns {string}
     */
    static formatSavedAt(isoString) {
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return '';

            const month = date.getMonth() + 1;
            const day = date.getDate();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');

            return `${month}월 ${day}일 ${hours}:${minutes}`;
        } catch {
            return '';
        }
    }
}

export default DraftService;
