// js/controllers/MainController.js
// 메인 페이지 컨트롤러 (게시글 목록, 무한 스크롤)

import AuthModel from '../models/AuthModel.js';

import PostModel from '../models/PostModel.js';

import PostListView from '../views/PostListView.js';

import Logger from '../utils/Logger.js';

import { NAV_PATHS, UI_MESSAGES } from '../constants.js';



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

        // 중복 게시물 감지를 위한 Set

        this.loadedPostIds = new Set();

    }



    /**

     * 컨트롤러 초기화

     */

    async init() {

        // 헤더의 인증 관련 로직은 HeaderController에서 처리

        await this._loadPosts();

        this._setupInfiniteScroll();



        // 게시글 작성 버튼

        const writeBtn = document.getElementById('write-btn');

        if (writeBtn) {

            writeBtn.addEventListener('click', () => {

                location.href = NAV_PATHS.WRITE;

            });

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



            if (!result.ok) throw new Error(UI_MESSAGES.POST_LOAD_FAIL);



            const posts = result.data?.data?.posts || [];

            const pagination = result.data?.data?.pagination;



            // 중복 게시물 감지 (백엔드 버그 방어)

            // 무한 스크롤 시, 데이터가 추가되거나 삭제되는 동안 오프셋 기반 페이지네이션의 고질적인 문제(중복/누락)가 발생할 수 있음.

            // 클라이언트 측에서 이미 로드된 ID를 추적하여 중복 렌더링을 방지함.

            const fetchedIds = posts.map(p => p.post_id);

            const hasDuplicates = fetchedIds.some(id => this.loadedPostIds.has(id));



            if (hasDuplicates) {

                logger.warn('중복 게시물 감지 - 더 이상 로드하지 않음');

                // 중복이 발생했다는 것은 더 이상 새로운 데이터를 불러올 수 없거나(끝), 데이터 정합성이 깨진 상태일 수 있으므로 로딩 중단

                this.hasMore = false;

                PostListView.toggleLoadingSentinel(sentinel, false);

                return;

            }



            // 로드된 게시물 ID 저장

            fetchedIds.forEach(id => this.loadedPostIds.add(id));



            // API 응답의 pagination 정보 또는 반환 개수로 hasMore 결정

            // 1. 요청한 개수(LIMIT)보다 적게 왔다면 마지막 페이지임

            // 2. 명시적인 pagination 객체의 has_more 플래그 확인

            // 3. 전체 개수(total_count)와 현재 로드된 개수 비교

            if (posts.length < this.LIMIT ||

                (pagination && !pagination.has_more) ||

                (pagination && this.currentOffset + posts.length >= pagination.total_count)) {

                this.hasMore = false;

                PostListView.toggleLoadingSentinel(sentinel, false);

            }



            if (posts.length === 0 && this.currentOffset === 0) {

                PostListView.showEmptyState(listElement);

                this.hasMore = false;

                PostListView.toggleLoadingSentinel(sentinel, false);

                return;

            }



            PostListView.renderPosts(listElement, posts, (postId) => {

                location.href = NAV_PATHS.DETAIL(postId);

            });



            this.currentOffset += this.LIMIT;



        } catch (error) {

            logger.error('게시글 목록 로딩 실패', error);

            PostListView.showSentinelError(sentinel, UI_MESSAGES.UNKNOWN_ERROR);

        } finally {

            this.isLoading = false;

        }

    }

}

export default MainController;
