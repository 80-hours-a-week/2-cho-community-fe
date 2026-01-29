// js/controllers/MainController.js
// 메인 페이지 컨트롤러 (게시글 목록, 무한 스크롤)

import AuthModel from '../models/AuthModel.js';
import PostModel from '../models/PostModel.js';
import HeaderView from '../views/HeaderView.js';
import PostListView from '../views/PostListView.js';
import Logger from '../utils/Logger.js';

const logger = Logger.createLogger('MainController');

/**
 * 메인 페이지 컨트롤러
 */
class MainController {
    constructor() {
        this.currentOffset = 0;
        this.LIMIT = 10;
        this.isLoading = false;
        this.hasMore = true;
        this.currentUser = null;
    }

    /**
     * 컨트롤러 초기화
     */
    async init() {
        await this._checkLoginStatus();
        await this._loadPosts();
        this._setupInfiniteScroll();
    }

    /**
     * 로그인 상태 확인 및 헤더 설정
     * @private
     */
    async _checkLoginStatus() {
        const profileCircle = document.getElementById('header-profile');

        try {
            const authStatus = await AuthModel.checkAuthStatus();

            if (authStatus.isAuthenticated) {
                this.currentUser = authStatus.user;
                HeaderView.setProfileImage(profileCircle, this.currentUser.profileImageUrl);

                // 드롭다운 설정
                HeaderView.createDropdown(profileCircle, {
                    onEditInfo: () => location.href = '/edit-profile',
                    onChangePassword: () => location.href = '/password',
                    onLogout: () => this._handleLogout()
                });
            } else {
                // 비로그인 상태에서도 목록은 볼 수 있음
                profileCircle.addEventListener('click', () => {
                    location.href = '/login';
                });
            }
        } catch (error) {
            logger.error('인증 확인 실패', error);
        }
    }

    /**
     * 무한 스크롤 설정
     * @private
     */
    _setupInfiniteScroll() {
        const sentinel = document.getElementById('loading-sentinel');
        if (!sentinel) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !this.isLoading && this.hasMore) {
                this._loadPosts();
            }
        }, { threshold: 0.1 });

        observer.observe(sentinel);
    }

    /**
     * 게시글 목록 로드
     * @private
     */
    async _loadPosts() {
        if (this.isLoading || !this.hasMore) return;

        this.isLoading = true;
        const listElement = document.getElementById('post-list');
        const sentinel = document.getElementById('loading-sentinel');

        PostListView.toggleLoadingSentinel(sentinel, true);

        try {
            const result = await PostModel.getPosts(this.currentOffset, this.LIMIT);

            if (!result.ok) throw new Error('게시글 목록을 불러오지 못했습니다.');

            const posts = result.data?.data?.posts || [];

            if (posts.length < this.LIMIT) {
                this.hasMore = false;
                PostListView.toggleLoadingSentinel(sentinel, false);
            }

            PostListView.renderPosts(listElement, posts, (postId) => {
                location.href = `/detail?id=${postId}`;
            });

            this.currentOffset += this.LIMIT;

        } catch (error) {
            logger.error('게시글 목록 로딩 실패', error);
            PostListView.showSentinelError(sentinel, '오류 발생');
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * 로그아웃 처리
     * @private
     */
    async _handleLogout() {
        try {
            await AuthModel.logout();
            alert('로그아웃 되었습니다.');
            location.reload();
        } catch (error) {
            logger.error('로그아웃 에러', error);
            location.reload();
        }
    }
}

export default MainController;
