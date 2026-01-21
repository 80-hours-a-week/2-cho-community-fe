document.addEventListener("DOMContentLoaded", () => {
    checkLoginStatus();
    loadPosts();
});

async function checkLoginStatus() {
    const authSection = document.getElementById("auth-selection");
    const writeBtn = document.getElementById("write-btn");

    try {
        // 백엔드에 현재 로그인한 사용자 정보를 묻는 엔드포인트가 있다고 가정 (예: /users/me)
        // 만약 없다면 이 요청은 생략하고, 글쓰기 버튼 클릭 시 401 에러로 처리해야 함.
        const response = await fetch(`${API_BASE_URL}/v1/users/me`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        });

        if (response.ok) {
            const user = await response.json();
            authSection.innerHTML = `<span><b>${user.data.user.nickname || "사용자"}</b>님 환영합니다.</span>
                <button id="logout-btn">로그아웃</button>`;
            document.getElementById("logout-btn").addEventListener("click", handleLogout);
        } else {
            // 비로그인 상태 UI
            console.log("로그인되지 않음");
        }
    } catch (error) {
        console.error("인증 확인 실패: ", error);
    }
}

async function loadPosts() {
    const listElement = document.getElementById("post-list");

    try {
        const response = await fetch(`${API_BASE_URL}/v1/posts/`, {
            method: "GET",

            credentials: "include"
        });

        if (!response.ok) throw new Error("게시글 목록을 불러오지 못했습니다.");

        const posts = await response.json();

        // 로딩 메시지 제거
        listElement.innerHTML = "";

        posts.forEach(post => {
            const li = document.createElement("li");
            li.innerHTML = `
                <h3>${post.title}</h3>
                <p>작성자: ${post.author} | 날짜: ${post.created_at}</p>
            `;
            li.addEventListener("click", () => {
                location.href = `detail.html?id=${post.id}`;
            })
            listElement.appendChild(li);
        });
    } catch (error) {
        console.error("게시글 목록 로딩 실패: ", error);
        listElement.innerHTML = "<li>게시글을 불러오는 중 오류가 발생했습니다.</li>";
    }
}

async function handleLogout() {
    try {
        const response = await fetch(`${API_BASE_URL}/v1/auth/session`, {
            method: "DELETE",
            credentials: "include"
        });

        if (response.ok) {
            alert("로그아웃 되었습니다.");
            location.reload();
        } else {
            alert("로그아웃 실패");
        }
    } catch (error) {
        console.error("로그아웃 에러: ", error);
    }
}