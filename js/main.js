let currentOffset = 0;
const LIMIT = 10;
let isLoading = false;
let hasMore = true;

// DOM 구조가 완전히 만들어진 다음에 DOM에 접근하도록 함
document.addEventListener("DOMContentLoaded", () => {
    checkLoginStatus();
    loadPosts();
    setupInfinityScroll();
});

// 스크롤이 맨 아래로 내려가면 자동으로 게시글을 불러오는 기능
function setupInfinityScroll() {
    const sentinel = document.getElementById("loading-sentinel");
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !isLoading && hasMore) {
            loadPosts();
        }
    }, { threshold: 0.1 });
    observer.observe(sentinel);
}

// 로그인 상태를 확인하고 프로필 원을 업데이트하는 함수
async function checkLoginStatus() {
    const profileCircle = document.getElementById("header-profile");
    // const authSection = document.getElementById("auth-section"); // Optional: if we want to add logout btn inside

    try {
        const response = await fetch(`${API_BASE_URL}/v1/users/me`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        });

        if (response.ok) {
            const result = await response.json();
            const user = result.data.user;
            // 프로필 원 업데이트
            if (user.profile_image) {
                profileCircle.style.backgroundImage = `url(${user.profile_image})`;
            } else {
                profileCircle.style.backgroundColor = "#555"; // Default color
            }

            // 프로필 원 클릭 시 로그아웃
            profileCircle.addEventListener("click", () => {
                const logout = confirm("로그아웃 하시겠습니까?");
                if (logout) handleLogout();
            });

        } else {
            // 로그인 안됨. 
            // 프로필 원 클릭 시 로그인 페이지로 이동
            profileCircle.addEventListener("click", () => {
                location.href = "login.html";
            });
        }
    } catch (error) {
        console.error("인증 확인 실패: ", error);
    }
}

// 게시글 목록을 불러오는 함수
async function loadPosts() {
    if (isLoading || !hasMore) return;
    isLoading = true;
    const listElement = document.getElementById("post-list");
    const sentinel = document.getElementById("loading-sentinel");
    sentinel.style.display = 'block';

    try {
        const response = await fetch(`${API_BASE_URL}/v1/posts/?offset=${currentOffset}&limit=${LIMIT}`, {
            method: "GET",
            credentials: "include"
        });

        if (!response.ok) throw new Error("게시글 목록을 불러오지 못했습니다.");

        const result = await response.json();
        const posts = result.data?.posts || [];

        if (posts.length < LIMIT) {
            hasMore = false;
            sentinel.style.display = 'none';
        }

        posts.forEach(post => {
            const li = createPostElement(post);
            listElement.appendChild(li);
        });

        currentOffset += LIMIT;

    } catch (error) {
        console.error("게시글 목록 로딩 실패: ", error);
        sentinel.innerText = "오류 발생";
    } finally {
        isLoading = false;
    }
}

// 게시글 카드를 생성하는 함수
function createPostElement(post) {
    const li = document.createElement("li");
    li.className = "post-card";

    // 제목 자르기 (최대 26글자)
    let title = post.title;
    if (title.length > 26) {
        title = title.substring(0, 26) + "...";
    }

    // 날짜 포맷팅 (yyyy-mm-dd hh:mm:ss)
    const dateObj = new Date(post.created_at);
    const dateStr = formatDate(dateObj);

    // 좋아요, 댓글, 조회수
    // 백엔드에서 반환하지 않을 수 있는 통계 (없으면 0으로 가정)
    const likes = post.likes_count || 0;
    const comments = post.comments_count || 0;
    const views = post.views_count || 0;

    // 작성자 프로필 이미지
    const profileImg = post.author.profileImageUrl || '';

    li.innerHTML = `
        <div class="post-card-header">
            <h3 class="post-title">${title}</h3>
            <span class="post-date">${dateStr}</span>
        </div>
        <div class="post-stats">
            <span>좋아요 ${formatCount(likes)}</span>
            <span>댓글 ${formatCount(comments)}</span>
            <span>조회수 ${formatCount(views)}</span>
        </div>
        <div class="post-divider"></div>
        <div class="post-author">
            <div class="author-profile-img" style="background-image: url('${profileImg}'); background-size: cover;"></div>
            <span class="author-nickname">${post.author.nickname}</span>
        </div>
    `;

    li.addEventListener("click", () => {
        location.href = `detail.html?id=${post.post_id}`;
    });

    return li;
}

// 날짜 포맷팅
function formatDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

// 숫자를 k 단위로 포맷팅
// 예: 1000 -> 1k, 10000 -> 10k, 12345 -> 12.3k
function formatCount(num) {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num;
}

// 로그아웃 함수 (DELETE /v1/auth/session)
async function handleLogout() {
    try {
        const response = await fetch(`${API_BASE_URL}/v1/auth/session`, {
            method: "DELETE",
            credentials: "include"
        });

        alert("로그아웃 되었습니다.");
        location.reload();

    } catch (error) {
        console.error("로그아웃 에러: ", error);
        location.reload();
    }
}