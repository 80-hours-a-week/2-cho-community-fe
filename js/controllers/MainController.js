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
        // 중복 게시물 감지를 위한 Set
        this.loadedPostIds = new Set();
    }

    /**
     * 컨트롤러 초기화
     */
    async init() {
        await this._checkLoginStatus();
        await this._loadPosts();
        this._setupInfiniteScroll();

        // 게시글 작성 버튼
        const writeBtn = document.getElementById('write-btn');
        if (writeBtn) {
            writeBtn.addEventListener('click', () => {
                location.href = '/write';
            });
        }
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
                // 비로그인 상태에서는 로그인 페이지로 리다이렉트
                location.href = '/login';
                return;
            }
        } catch (error) {
            logger.error('인증 확인 실패', error);
            // 인증 확인 실패 시에도 로그인 페이지로 리다이렉트
            location.href = '/login';
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
            const pagination = result.data?.data?.pagination;

            // 중복 게시물 감지 (백엔드 버그 방어)
            const fetchedIds = posts.map(p => p.post_id);
            const hasDuplicates = fetchedIds.some(id => this.loadedPostIds.has(id));

            if (hasDuplicates) {
                logger.warn('중복 게시물 감지 - 더 이상 로드하지 않음');
                this.hasMore = false;
                PostListView.toggleLoadingSentinel(sentinel, false);
                return;
            }

            // 로드된 게시물 ID 저장
            fetchedIds.forEach(id => this.loadedPostIds.add(id));

            // API 응답의 pagination 정보 또는 반환 개수로 hasMore 결정
            if (posts.length < this.LIMIT ||
                (pagination && !pagination.has_more) ||
                (pagination && this.currentOffset + posts.length >= pagination.total_count)) {
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
            location.href = '/login';
        } catch (error) {
            logger.error('로그아웃 에러', error);
            location.href = '/login';
        }
    }
}

export default MainController;
