let currentOffset = 0;
const LIMIT = 10;
let isLoading = false;
let hasMore = true;

document.addEventListener("DOMContentLoaded", () => {
    checkLoginStatus();
    loadPosts();
    setupInfinityScroll();
});

function setupInfinityScroll() {
    const sentinel = document.getElementById("loading-sentinel");
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !isLoading && hasMore) {
            loadPosts();
        }
    }, { threshold: 0.1 });
    observer.observe(sentinel);
}

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
            // Update profile circle
            if (user.profile_image) {
                profileCircle.style.backgroundImage = `url(${user.profile_image})`;
            } else {
                profileCircle.style.backgroundColor = "#555"; // Default color
            }

            // Handle click on profile circle -> dropdown or navigate to profile?
            // Requirement says "handles the user's profile". 
            // For now, let's assume it goes to a profile page or toggles a menu. 
            // Since we don't have a profile page spec, maybe just log out or basic info?
            // Let's add a simple click listener for now.
            profileCircle.addEventListener("click", () => {
                const logout = confirm("로그아웃 하시겠습니까?");
                if (logout) handleLogout();
            });

        } else {
            // Not logged in. 
            // Maybe show a generic icon or redirect to login on click?
            profileCircle.addEventListener("click", () => {
                location.href = "login.html";
            });
        }
    } catch (error) {
        console.error("인증 확인 실패: ", error);
    }
}

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

function createPostElement(post) {
    const li = document.createElement("li");
    li.className = "post-card";

    // Title truncation (max 26 letters)
    let title = post.title;
    if (title.length > 26) {
        title = title.substring(0, 26) + "...";
    }

    // Date formatting (yyyy-mm-dd hh:mm:ss)
    const dateObj = new Date(post.created_at);
    const dateStr = formatDate(dateObj);

    // Placeholder stats (Backend might not return these yet, assuming 0 if missing)
    const likes = post.likes_count || 0;
    const comments = post.comments_count || 0;
    const views = post.views_count || 0;

    // Author profile image
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

function formatDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

function formatCount(num) {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num;
}

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