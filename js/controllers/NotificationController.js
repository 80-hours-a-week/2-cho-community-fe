// js/controllers/NotificationController.js
// 알림 목록 페이지 컨트롤러

import NotificationModel from '../models/NotificationModel.js';
import NotificationView from '../views/NotificationView.js';
import { showToast } from '../views/helpers.js';
import { resolveNavPath } from '../config.js';
import { NAV_PATHS, UI_MESSAGES } from '../constants.js';
import Logger from '../utils/Logger.js';

const logger = Logger.createLogger('NotificationController');

/**
 * 알림 목록 페이지 컨트롤러
 * 무한 스크롤과 이벤트 위임으로 알림 목록을 관리한다.
 */
class NotificationController {
    constructor() {
        this.currentOffset = 0;
        this.LIMIT = 20;
        this.isLoading = false;
        this.hasMore = true;
    }

    async init() {
        this.listEl = document.getElementById('notification-list');
        this.emptyEl = document.getElementById('notification-empty');
        this.markAllBtn = document.getElementById('mark-all-read-btn');

        this._setupEventListeners();
        this._setupInfiniteScroll();
        this._setupAutoRefresh();
        await this._loadNotifications();
    }

    /**
     * 이벤트 리스너 설정 (이벤트 위임 패턴)
     * @private
     */
    _setupEventListeners() {
        // 모두 읽음 버튼
        this.markAllBtn?.addEventListener('click', () => this._handleMarkAllRead());

        // 알림 설정 패널 토글
        const settingsBtn = document.getElementById('notification-settings-btn');
        const settingsPanel = document.getElementById('notification-settings-panel');
        if (settingsBtn && settingsPanel) {
            settingsBtn.addEventListener('click', () => {
                settingsPanel.classList.toggle('hidden');
                if (!settingsPanel.classList.contains('hidden')) {
                    this._loadSettings();
                }
            });
            // 체크박스 변경 시 즉시 저장
            settingsPanel.addEventListener('change', (e) => {
                // 다이제스트 빈도 셀렉트 처리
                const select = e.target.closest('#setting-digest-frequency');
                if (select) {
                    this._updateDigestFrequency(select.value);
                    return;
                }
                const checkbox = e.target.closest('input[type="checkbox"]');
                if (!checkbox) return;
                const type = checkbox.id.replace('setting-', '');
                this._updateSetting(type, checkbox.checked);
            });
        }

        // 이벤트 위임: 알림 클릭 + 삭제
        this.listEl?.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.notification-delete-btn');
            if (deleteBtn) {
                e.stopPropagation();
                const li = deleteBtn.closest('.notification-item');
                const id = li?.dataset.id;
                if (id) this._handleDelete(parseInt(id), li);
                return;
            }

            const item = e.target.closest('.notification-item');
            if (item) {
                this._handleItemClick(item);
            }
        });
    }

    /**
     * 무한 스크롤 설정
     * @private
     */
    _setupInfiniteScroll() {
        this._scrollHandler = () => {
            if (this.isLoading || !this.hasMore) return;
            const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
            if (scrollTop + clientHeight >= scrollHeight - 100) {
                this._loadNotifications();
            }
        };
        window.addEventListener('scroll', this._scrollHandler);
    }

    /**
     * 새 알림 자동 갱신 설정
     * HeaderController가 발생시키는 'notification:new' 이벤트를 수신하여
     * 알림 목록 상단에 새 알림을 추가합니다.
     * @private
     */
    _setupAutoRefresh() {
        this._onNewNotification = () => this._prependNewNotifications();
        window.addEventListener('notification:new', this._onNewNotification);
    }

    /**
     * 새 알림을 목록 상단에 추가
     * @private
     */
    async _prependNewNotifications() {
        try {
            const result = await NotificationModel.getNotifications(0, 5);
            if (!result.ok) return;

            const notifications = result.data?.data?.notifications || [];
            const existingIds = new Set(
                Array.from(this.listEl?.querySelectorAll('.notification-item') || [])
                    .map(el => el.dataset.id)
            );

            // 새 알림만 상단에 추가 (기존에 없는 ID)
            const newItems = notifications.filter(
                n => !existingIds.has(String(n.notification_id))
            );

            if (newItems.length > 0) {
                this.emptyEl?.classList.add('hidden');
                for (const n of newItems.reverse()) {
                    const li = NotificationView.createNotificationItem(n);
                    li.dataset.postId = n.post_id;
                    this.listEl?.prepend(li);
                }
                this.currentOffset += newItems.length;
            }
        } catch (error) {
            logger.error('새 알림 자동 갱신 실패', error);
        }
    }

    /**
     * 컨트롤러 정리 (스크롤 핸들러 + 이벤트 리스너 제거)
     */
    destroy() {
        if (this._scrollHandler) {
            window.removeEventListener('scroll', this._scrollHandler);
            this._scrollHandler = null;
        }
        if (this._onNewNotification) {
            window.removeEventListener('notification:new', this._onNewNotification);
            this._onNewNotification = null;
        }
    }

    /**
     * 알림 목록 로드 (페이지네이션)
     * @private
     */
    async _loadNotifications() {
        if (this.isLoading || !this.hasMore) return;
        this.isLoading = true;

        try {
            const result = await NotificationModel.getNotifications(this.currentOffset, this.LIMIT);

            if (!result.ok) {
                showToast(UI_MESSAGES.NOTIFICATION_LOAD_FAIL);
                this.isLoading = false;
                return;
            }

            const notifications = result.data?.data?.notifications || [];
            const totalCount = result.data?.data?.total_count || 0;

            if (notifications.length === 0 && this.currentOffset === 0) {
                this.emptyEl?.classList.remove('hidden');
            }

            // post_id를 data attribute에 저장하여 클릭 시 게시글 이동에 사용
            notifications.forEach(n => {
                const li = NotificationView.createNotificationItem(n);
                li.dataset.postId = n.post_id;
                this.listEl?.appendChild(li);
            });

            this.currentOffset += notifications.length;
            this.hasMore = this.currentOffset < totalCount;
        } catch (error) {
            logger.error('알림 목록 로드 실패', error);
            showToast(UI_MESSAGES.NOTIFICATION_LOAD_FAIL);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * 알림 항목 클릭 처리 (읽음 표시 + 게시글 이동)
     * @private
     */
    async _handleItemClick(item) {
        const id = parseInt(item.dataset.id);
        const postId = item.dataset.postId;

        // 읽음 처리
        if (item.classList.contains('unread')) {
            await NotificationModel.markAsRead(id);
            item.classList.remove('unread');
        }

        // 게시글로 이동
        if (postId) {
            location.href = resolveNavPath(NAV_PATHS.DETAIL(postId));
        }
    }

    /**
     * 알림 삭제 처리
     * @private
     */
    async _handleDelete(id, li) {
        const result = await NotificationModel.deleteNotification(id);
        if (result.ok) {
            li.remove();
        }
    }

    /**
     * 모든 알림 읽음 처리
     * @private
     */
    async _handleMarkAllRead() {
        const result = await NotificationModel.markAllAsRead();
        if (result.ok) {
            this.listEl?.querySelectorAll('.unread').forEach(el => {
                el.classList.remove('unread');
            });
            showToast('모든 알림을 읽음 처리했습니다.');
        }
    }

    /**
     * 알림 설정 로드 → 체크박스 + 다이제스트 빈도 반영
     * @private
     */
    async _loadSettings() {
        try {
            const result = await NotificationModel.getSettings();
            if (!result.ok) return;
            const settings = result.data?.data?.settings;
            if (!settings) return;

            for (const [type, enabled] of Object.entries(settings)) {
                // digest_frequency는 별도 처리
                if (type === 'digest_frequency') {
                    const select = document.getElementById('setting-digest-frequency');
                    if (select) select.value = enabled || 'off';
                    continue;
                }
                const checkbox = document.getElementById(`setting-${type}`);
                if (checkbox) checkbox.checked = enabled;
            }
        } catch (error) {
            logger.error('알림 설정 로드 실패', error);
        }
    }

    /**
     * 개별 알림 설정 변경
     * @param {string} type - 알림 유형
     * @param {boolean} enabled - 활성화 여부
     * @private
     */
    async _updateSetting(type, enabled) {
        try {
            const result = await NotificationModel.updateSettings({ [type]: enabled });
            if (result.ok) {
                showToast(`${type} 알림이 ${enabled ? '활성화' : '비활성화'}되었습니다.`);
            }
        } catch (error) {
            logger.error('알림 설정 변경 실패', error);
            showToast('알림 설정 변경에 실패했습니다.');
            // 실패 시 체크박스 롤백
            const checkbox = document.getElementById(`setting-${type}`);
            if (checkbox) checkbox.checked = !enabled;
        }
    }

    /**
     * 이메일 다이제스트 빈도 변경
     * @param {string} frequency - 빈도 값 ('daily' | 'weekly' | 'off')
     * @private
     */
    async _updateDigestFrequency(frequency) {
        const select = document.getElementById('setting-digest-frequency');
        const prevValue = this._lastDigestFrequency || 'off';
        this._lastDigestFrequency = frequency;

        try {
            const result = await NotificationModel.updateSettings({ digest_frequency: frequency });
            if (result.ok) {
                const labels = { daily: '매일', weekly: '매주', off: '끄기' };
                showToast(`이메일 다이제스트가 "${labels[frequency] || frequency}"(으)로 변경되었습니다.`);
            } else {
                // 실패 시 롤백
                if (select) select.value = prevValue;
                showToast('다이제스트 설정 변경에 실패했습니다.');
            }
        } catch (error) {
            logger.error('다이제스트 빈도 변경 실패', error);
            if (select) select.value = prevValue;
            showToast('다이제스트 설정 변경에 실패했습니다.');
        }
    }
}

export default NotificationController;
