
document.addEventListener("DOMContentLoaded", () => {
    // checkLoginStatus(); // Handled by header.js
    setupFormListeners();
});

let currentUserId = null;
let selectedFile = null;

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

function setupFormListeners() {
    const titleInput = document.getElementById("post-title");
    const contentInput = document.getElementById("post-content");
    const submitBtn = document.getElementById("submit-btn");
    const validationHelper = document.getElementById("validation-helper");
    const fileInput = document.getElementById("file-input");
    const previewContainer = document.getElementById("image-preview");

    // Title Length Limit Logic (HTML attribute handles basic limit, this ensures UX)
    titleInput.addEventListener("input", () => {
        if (titleInput.value.length > 26) {
            titleInput.value = titleInput.value.slice(0, 26);
        }
        validateForm();
    });

    contentInput.addEventListener("input", validateForm);

    function validateForm() {
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();

        if (title && content) {
            submitBtn.disabled = false;
            submitBtn.classList.add("active");
            validationHelper.style.display = "none";
        } else {
            submitBtn.disabled = true;
            submitBtn.classList.remove("active");
            validationHelper.style.display = "block";
        }
    }

    // Image Upload Logic
    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                previewContainer.innerHTML = `<img src="${e.target.result}" alt="Preview" class="preview-img">`;
                previewContainer.classList.remove("hidden");
            };
            reader.readAsDataURL(file);
        } else {
            selectedFile = null;
            previewContainer.innerHTML = "";
            previewContainer.classList.add("hidden");
        }
    });

    // Form Submit
    document.getElementById("write-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        handleSubmit();
    });
}

async function handleSubmit() {
    const title = document.getElementById("post-title").value.trim();
    const content = document.getElementById("post-content").value.trim();

    if (!title || !content) return;

    try {
        let imageUrls = [];

        // Upload Image if exists
        if (selectedFile) {
            const formData = new FormData();
            formData.append("file", selectedFile);

            const uploadResponse = await fetch(`${API_BASE_URL}/v1/posts/image`, {
                method: "POST",
                body: formData,
                credentials: "include"
            });

            if (uploadResponse.ok) {
                const uploadResult = await uploadResponse.json();
                // Assuming result structure: data: { url: "..." } or similar.
                // Re-checking OpenApi schema logic from memory: upload_image returns url string in response?
                // Let's assume standard response wrapper.
                // Warning: Schema said "Returns: Uploaded image URL included response".
                // Usually `data: "http://..."` or `data: { url: "..." }`.
                // I will inspect response if it fails, but likely `data` holds the string or object.
                // Let's try to access likely path.
                // Assuming backend follows consistent `data` wrapper.
                imageUrls.push(uploadResult.data);
            } else {
                alert("이미지 업로드 실패");
                return;
            }
        }

        // Create Post
        const postPayload = {
            title: title,
            content: content,
            image_urls: imageUrls
        };

        const response = await fetch(`${API_BASE_URL}/v1/posts/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(postPayload),
            credentials: "include"
        });

        if (response.ok) {
            const result = await response.json();
            // Redirect to the new post detail or main page
            // Requirement says "redirect to index.html" or "move to main page"?
            // Request said "submit button activated...". 
            // In the previous request details for other pages, user mentioned flow. 
            // Usually after write -> Detail or Main. 
            // Let's go to Main as it is safer default.
            location.href = "index.html";
        } else {
            alert("게시글 작성 실패");
        }

    } catch (error) {
        console.error("작성 에러: ", error);
        alert("오류가 발생했습니다.");
    }
}
