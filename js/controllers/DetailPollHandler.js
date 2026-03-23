// js/controllers/DetailPollHandler.js — 게시글 상세 투표(Poll) 처리
import PostModel from '../models/PostModel.js';
import PostDetailView from '../views/PostDetailView.js';
import Logger from '../utils/Logger.js';
import { UI_MESSAGES } from '../constants.js';
import { showToast } from '../views/helpers.js';

const logger = Logger.createLogger('DetailPollHandler');
/** 게시글 상세 페이지의 투표 기능을 담당하는 핸들러 */
class DetailPollHandler {
    /** @param {string|number} postId */
    constructor(postId) {
        this.postId = postId;
        this._currentPollData = null;
    }
    /** @param {object|null} pollData */
    setPollData(pollData) {
        this._currentPollData = pollData || null;
    }
    /** 투표 버튼 이벤트 리스너 설정 */
    setupListeners() {
        const voteBtn = document.getElementById('poll-vote-btn');
        if (voteBtn) voteBtn.addEventListener('click', () => this._handleVote());
        const changeBtn = document.getElementById('poll-change-btn');
        if (changeBtn) changeBtn.addEventListener('click', () => this._handleChange());
        const cancelBtn = document.getElementById('poll-cancel-btn');
        if (cancelBtn) cancelBtn.addEventListener('click', () => this._handleCancel());
    }
    /** 투표 섹션만 API에서 재조회하여 DOM을 교체합니다 */
    async reload() {
        try {
            const result = await PostModel.getPost(this.postId);
            if (!result.ok) return;
            const post = result.data?.data?.post;
            if (!post) return;
            this._currentPollData = post.poll || null;
            const existingPoll = document.getElementById('poll-container');
            if (post.poll) {
                const newPollEl = PostDetailView.renderPoll(post.poll, post.post_id);
                if (existingPoll && newPollEl) {
                    existingPoll.replaceWith(newPollEl);
                } else if (newPollEl) {
                    document.querySelector('.post-body')?.appendChild(newPollEl);
                }
            } else if (existingPoll) {
                existingPoll.remove();
            }
            this.setupListeners();
        } catch (error) {
            logger.error('투표 섹션 갱신 실패', error);
        }
    }
    /** 투표 제출 @private */
    async _handleVote() {
        const form = document.getElementById('poll-vote-form');
        if (!form) return;
        const selected = form.querySelector('input[name="poll-vote"]:checked');
        if (!selected) { showToast(UI_MESSAGES.POLL_SELECT_REQUIRED); return; }
        try {
            const result = await PostModel.votePoll(this.postId, Number(selected.value));
            if (result.ok) { showToast(UI_MESSAGES.POLL_VOTE_SUCCESS); await this.reload(); }
            else showToast(UI_MESSAGES.POLL_VOTE_FAIL);
        } catch (error) {
            logger.error('투표 처리 실패', error);
            showToast(UI_MESSAGES.POLL_VOTE_FAIL);
        }
    }
    /** 결과 뷰 → 투표 폼으로 전환 (API 호출 없음) @private */
    _handleChange() {
        const pollContainer = document.getElementById('poll-container');
        if (!pollContainer || !this._currentPollData) return;
        // my_vote를 null로 덮어써서 투표 모드로 전환
        const pollCopy = { ...this._currentPollData, my_vote: null };
        const newPoll = PostDetailView.renderPoll(pollCopy, this.postId);
        pollContainer.replaceWith(newPoll);
        const voteBtn = document.getElementById('poll-vote-btn');
        if (voteBtn) {
            voteBtn.textContent = '변경';
            voteBtn.addEventListener('click', () => this._submitChange());
        }
    }
    /** 투표 변경 제출 @private */
    async _submitChange() {
        const form = document.getElementById('poll-vote-form');
        if (!form) return;
        const selected = form.querySelector('input[name="poll-vote"]:checked');
        if (!selected) { showToast(UI_MESSAGES.POLL_SELECT_REQUIRED); return; }
        try {
            const result = await PostModel.changePollVote(this.postId, Number(selected.value));
            if (result.ok) { showToast(UI_MESSAGES.POLL_VOTE_CHANGE_SUCCESS); await this.reload(); }
            else showToast(UI_MESSAGES.POLL_VOTE_CHANGE_FAIL);
        } catch (error) {
            logger.error('투표 변경 실패', error);
            showToast(UI_MESSAGES.POLL_VOTE_CHANGE_FAIL);
        }
    }
    /** 투표 취소 @private */
    async _handleCancel() {
        try {
            const result = await PostModel.cancelPollVote(this.postId);
            if (result.ok) { showToast(UI_MESSAGES.POLL_VOTE_CANCEL_SUCCESS); await this.reload(); }
            else showToast(UI_MESSAGES.POLL_VOTE_CANCEL_FAIL);
        } catch (error) {
            logger.error('투표 취소 실패', error);
            showToast(UI_MESSAGES.POLL_VOTE_CANCEL_FAIL);
        }
    }
}

export default DetailPollHandler;
