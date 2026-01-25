
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get("id");

    if (!postId) {
        alert("잘못된 접근입니다.");
        location.href = "index.html";
        return;
    }

    // checkLoginStatus(); // Handled by header.js
    loadPostDetail(postId);
    reloadComments(postId);
    setupEventListeners(postId);
});

let currentPostId = null;
let currentUserId = null; // To check ownership
let editingCommentId = null; // Track comment being edited

async function checkLoginStatus() {
    const profileCircle = document.getElementById("header-profile");
    try {
        const response = await fetch(`${API_BASE_URL}/v1/users/me`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        });

        if (response.ok) {
            const result = await response.json();
            const user = result.data.user;
            currentUserId = user.user_id;

            if (user.profile_image) {
                profileCircle.style.backgroundImage = `url(${user.profile_image})`;
            } else {
                profileCircle.style.backgroundColor = "#555";
            }

            profileCircle.addEventListener("click", () => {
                const logout = confirm("로그아웃 하시겠습니까?");
                if (logout) handleLogout();
            });

        } else {
            profileCircle.addEventListener("click", () => {
                location.href = "login.html";
            });
        }
    } catch (error) {
        console.error("인증 확인 실패: ", error);
    }
}

async function loadPostDetail(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/v1/posts/${id}`, {
            method: "GET",
            credentials: "include"
        });

        if (!response.ok) throw new Error("게시글을 불러오지 못했습니다.");

        const result = await response.json();
        const postObject = result.data;

        renderPost(postObject.post);
        renderComments(postObject.comments || []);
        currentPostId = postObject.post_id;

        updateActionButtons(postObject.post.author.user_id);

    } catch (error) {
        console.error(error);
        alert(error.message);
        location.href = "index.html";
    }
}

function renderPost(post) {
    document.getElementById("post-title").innerText = post.title;
    document.getElementById("post-content").innerText = post.content;

    // Author
    document.getElementById("post-author-nickname").innerText = post.author.nickname;
    document.getElementById("post-author-img").style.backgroundImage = `url('${post.author.profileImageUrl || ''}')`;
    document.getElementById("post-author-img").style.backgroundSize = "cover";

    // Date
    const dateObj = new Date(post.created_at);
    document.getElementById("post-date").innerText = formatDate(dateObj);

    // Image
    const imgEl = document.getElementById("post-image");
    if (post.image_urls && post.image_urls.length > 0) {
        imgEl.src = post.image_urls[0]; // Display first image for now
        imgEl.classList.remove("hidden");
    }

    // Stats
    document.getElementById("like-count").innerText = formatCount(post.likes_count);
    document.getElementById("view-count").innerText = formatCount(post.views_count);
    document.getElementById("comment-count").innerText = formatCount(post.comments_count);

    // Initial Like Button State
    const likeBox = document.getElementById("like-box");
    if (post.is_liked) {
        likeBox.classList.add("active");
    }
}

function renderComments(comments) {
    const listEl = document.getElementById("comment-list");
    listEl.innerHTML = "";
    comments.forEach(comment => {
        listEl.appendChild(createCommentElement(comment));
    });
}

// Wrapper to reload post and comments (since comments are part of post detail)
async function reloadComments() {
    if (currentPostId) loadPostDetail(currentPostId);
}

function createCommentElement(comment) {
    const li = document.createElement("li");
    li.className = "comment-item";

    const isOwner = currentUserId === comment.author.user_id;

    li.innerHTML = `
        <div class="comment-author-img" style="background-image: url('${comment.author.profileImageUrl || ''}'); background-size: cover;"></div>
        <div class="comment-content-wrapper">
            <div class="comment-header">
                <span class="comment-author-name">${comment.author.nickname}</span>
                <span class="comment-date">${formatDate(new Date(comment.created_at))}</span>
                ${isOwner ? `
                <div class="comment-actions">
                    <button class="small-btn edit-cmt-btn" data-id="${comment.comment_id}">수정</button>
                    <button class="small-btn delete-cmt-btn" data-id="${comment.comment_id}">삭제</button>
                </div>` : ''}
            </div>
            <p class="comment-text">${comment.content}</p>
        </div>
    `;

    // Bind events for edit/delete
    if (isOwner) {
        li.querySelector(".delete-cmt-btn").addEventListener("click", () => openDeleteModal("comment", comment.comment_id));
        li.querySelector(".edit-cmt-btn").addEventListener("click", () => {
            // Edit logic: populate comment input field with existing content
            const commentInput = document.getElementById("comment-input");
            const commentSubmitBtn = document.getElementById("comment-submit-btn");

            commentInput.value = comment.content;
            commentInput.focus();
            commentSubmitBtn.textContent = "댓글 수정";
            commentSubmitBtn.style.backgroundColor = "#7F6AEE";
            editingCommentId = comment.comment_id;
        });
    }

    return li;
}

function setupEventListeners(postId) {
    // Buttons
    document.getElementById("edit-post-btn").addEventListener("click", () => {
        location.href = `edit.html?id=${postId}`;
    });
    document.getElementById("delete-post-btn").addEventListener("click", () => {
        openDeleteModal("post", postId);
    });

    // Like
    document.getElementById("like-box").addEventListener("click", handleLike);

    // Comment Input Color Change
    const commentInput = document.getElementById("comment-input");
    const commentSubmitBtn = document.getElementById("comment-submit-btn");

    commentInput.addEventListener("input", () => {
        if (commentInput.value.trim().length > 0) {
            commentSubmitBtn.style.backgroundColor = "#7F6AEE";
        } else {
            commentSubmitBtn.style.backgroundColor = "#ACA0EB";
        }
    });

    commentSubmitBtn.addEventListener("click", submitComment);

    // Modal
    document.getElementById("modal-cancel-btn").addEventListener("click", closeModal);
    document.getElementById("modal-confirm-btn").addEventListener("click", executeDelete);
}

let deleteTarget = { type: null, id: null };

function openDeleteModal(type, id) {
    deleteTarget = { type, id };
    const modal = document.getElementById("confirm-modal");
    const title = document.getElementById("modal-title");

    if (type === "post") {
        title.innerText = "게시글을 삭제하시겠습니까?";
    } else {
        title.innerText = "댓글을 삭제하시겠습니까?";
    }

    // Block background scroll and click
    document.body.style.overflow = 'hidden';
    modal.classList.remove("hidden");
}

function closeModal() {
    document.getElementById("confirm-modal").classList.add("hidden");
    document.body.style.overflow = ''; // Restore scroll
    deleteTarget = { type: null, id: null };
}

async function executeDelete() {
    if (!deleteTarget.id) return;

    if (deleteTarget.type === "post") {
        try {
            const response = await fetch(`${API_BASE_URL}/v1/posts/${deleteTarget.id}`, {
                method: "DELETE",
                credentials: "include"
            });
            if (response.ok) {
                alert("게시글이 삭제되었습니다.");
                location.href = "index.html";
            } else {
                alert("삭제 실패");
            }
        } catch (e) { console.error(e); }
    } else if (deleteTarget.type === "comment") {
        try {
            const response = await fetch(`${API_BASE_URL}/v1/posts/${currentPostId}/comments/${deleteTarget.id}`, {
                method: "DELETE",
                credentials: "include"
            });
            if (response.ok) {
                reloadComments();
            } else {
                alert("삭제 실패");
            }
        } catch (e) { console.error(e); }
    }
    closeModal();
}

async function submitComment() {
    const input = document.getElementById("comment-input");
    const submitBtn = document.getElementById("comment-submit-btn");
    const content = input.value.trim();
    if (!content) return;

    try {
        let response;

        if (editingCommentId) {
            // Update existing comment
            response = await fetch(`${API_BASE_URL}/v1/posts/${currentPostId}/comments/${editingCommentId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: content }),
                credentials: "include"
            });
        } else {
            // Create new comment
            response = await fetch(`${API_BASE_URL}/v1/posts/${currentPostId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: content }),
                credentials: "include"
            });
        }

        if (response.ok) {
            input.value = "";
            submitBtn.textContent = "댓글 등록";
            submitBtn.style.backgroundColor = "#ACA0EB";
            editingCommentId = null;
            reloadComments();
        } else {
            alert(editingCommentId ? "댓글 수정 실패" : "댓글 등록 실패");
        }
    } catch (e) { console.error(e); }
}

async function updateComment(commentId, newContent) {
    try {
        const response = await fetch(`${API_BASE_URL}/v1/posts/${currentPostId}/comments/${commentId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: newContent }),
            credentials: "include"
        });

        if (response.ok) {
            reloadComments();
        } else {
            alert("댓글 수정 실패");
        }
    } catch (e) { console.error(e); }
}

async function handleLike() {
    // Optimistic UI update
    const likeBox = document.getElementById("like-box");
    const countEl = document.getElementById("like-count");
    let count = parseInt(countEl.innerText);
    const isLiked = likeBox.classList.contains("active");

    if (isLiked) {
        likeBox.classList.remove("active");
        countEl.innerText = count > 0 ? count - 1 : 0;
        //좋아요 취소
        await fetch(`${API_BASE_URL}/v1/posts/${currentPostId}/likes`, { method: "DELETE", credentials: "include" });
    } else {
        likeBox.classList.add("active");
        countEl.innerText = count + 1;
        //좋아요
        await fetch(`${API_BASE_URL}/v1/posts/${currentPostId}/likes`, { method: "POST", credentials: "include" });
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
            location.href = "login.html";
        } else {
            alert("로그아웃 실패");
        }
    } catch (error) {
        console.error("로그아웃 에러: ", error);
        location.href = "login.html";
    }
}

function updateActionButtons(authorId) {
    const actionsDiv = document.getElementById("post-actions");
    if (currentUserId && currentUserId === authorId) {
        actionsDiv.style.display = "flex";
    } else {
        actionsDiv.style.display = "none";
    }
}

// Utils
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
    if (!num) return 0;
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num;
}
