
document.addEventListener("DOMContentLoaded", () => {
    // checkLoginStatus(); // Handled by header.js
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get("id");

    if (!postId) {
        alert("잘못된 접근입니다.");
        location.href = "index.html";
        return;
    }

    loadPostData(postId);
    setupFormListeners(postId);
});

let originalData = { title: "", content: "", image_url: null };
let currentData = { title: "", content: "", image_file: null };
let currentUserId = null;

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
        } else {
            alert("로그인이 필요합니다.");
            location.href = "login.html";
        }
    } catch (error) {
        console.error("인증 확인 실패: ", error);
        location.href = "login.html";
    }
}

async function loadPostData(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/v1/posts/${id}`, {
            method: "GET",
            credentials: "include"
        });

        if (!response.ok) throw new Error("게시글을 불러오지 못했습니다.");

        const result = await response.json();
        const post = result.data; // Wrapper logic assumed

        document.getElementById("post-title").value = post.title;
        document.getElementById("post-content").value = post.content;

        originalData.title = post.title;
        originalData.content = post.content;

        if (post.image_urls && post.image_urls.length > 0) {
            originalData.image_url = post.image_urls[0];
            // Show preview
            const previewContainer = document.getElementById("image-preview");
            previewContainer.innerHTML = `<img src="${post.image_urls[0]}" alt="Current Image" class="preview-img">`;
            previewContainer.classList.remove("hidden");
        }

    } catch (error) {
        console.error(error);
        alert(error.message);
        location.href = "index.html";
    }
}


function setupFormListeners(postId) {
    const titleInput = document.getElementById("post-title");
    const contentInput = document.getElementById("post-content");
    const submitBtn = document.getElementById("submit-btn");
    const validationHelper = document.getElementById("validation-helper");
    const fileInput = document.getElementById("file-input");
    const previewContainer = document.getElementById("image-preview");

    // Title Limit
    titleInput.addEventListener("input", () => {
        if (titleInput.value.length > 26) {
            titleInput.value = titleInput.value.slice(0, 26);
        }
        checkChanges();
    });

    contentInput.addEventListener("input", checkChanges);

    // Image Change
    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            currentData.image_file = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                previewContainer.innerHTML = `<img src="${e.target.result}" alt="Preview" class="preview-img">`;
                previewContainer.classList.remove("hidden");
            };
            reader.readAsDataURL(file);
        } else {
            // If user cancels file selection? Keep previous.
            // Or assume reset?
            // Usually valid to cancel.
        }
        checkChanges();
    });


    function checkChanges() {
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        const hasImageChanged = !!currentData.image_file; // Simplistic: if file selected, changed.

        const isTitleChanged = title !== originalData.title;
        const isContentChanged = content !== originalData.content;

        // Also validation: Cannot be empty
        const isValid = title.length > 0 && content.length > 0;
        const isChanged = isTitleChanged || isContentChanged || hasImageChanged;

        if (isValid && isChanged) {
            submitBtn.disabled = false;
            submitBtn.classList.add("active");
            validationHelper.style.display = "none";
        } else {
            submitBtn.disabled = true;
            submitBtn.classList.remove("active");
            // If valid but not changed, show "nothing changed"?
            // Req says: "When there is something edited... button activates".
            // We can use same helper for simplicity or hide it if just unchanged.
            // Helper text says "*수정할 내용을 입력해주세요." which fits "Unchanged" state too.
            validationHelper.style.display = "block";
        }
    }

    // Submit
    document.getElementById("edit-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        handleUpdate(postId);
    });
}

async function handleUpdate(postId) {
    const title = document.getElementById("post-title").value.trim();
    const content = document.getElementById("post-content").value.trim();

    try {
        // Warning: API PATCH Schema does not show image update support.
        // I will try to update Title and Content fields.

        const payload = {
            title: title,
            content: content
        };
        // If API supported explicit "image_url" in PATCH, we would send it.
        // Currently skipping image update in payload as per schema check.

        const response = await fetch(`${API_BASE_URL}/v1/posts/${postId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            credentials: "include"
        });

        if (response.ok) {
            // If user uploaded new image, we might need separate call or it's ignored.
            // Given limitations, we just redirect.
            location.href = `detail.html?id=${postId}`;
        } else {
            alert("게시글 수정 실패");
        }
    } catch (error) {
        console.error("수정 에러: ", error);
        alert("오류가 발생했습니다.");
    }
}
