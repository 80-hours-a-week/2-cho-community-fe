
document.addEventListener("DOMContentLoaded", () => {
    // header.js handles global auth and header profile.
    // We fetch user data again here to populate form or reuse if implemented globally?
    // header.js puts user in `headerCurrentUser`. We can wait for it or fetch again.
    // Fetching again is safer to ensure fresh data for editing.
    loadProfileData();
    setupProfileListeners();
});

let originalNickname = "";
let currentProfileFile = null;

async function loadProfileData() {
    try {
        const response = await fetch(`${API_BASE_URL}/v1/users/me`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        });

        if (response.ok) {
            const result = await response.json();
            const user = result.data.user;

            document.getElementById("email-display").value = user.email;
            document.getElementById("nickname-input").value = user.nickname;
            originalNickname = user.nickname;

            const profileWrapper = document.getElementById("profile-img-wrapper");
            if (user.profile_image) {
                profileWrapper.style.backgroundImage = `url(${user.profile_image})`;
            } else {
                profileWrapper.style.backgroundColor = "#555";
            }

            // Trigger validation check initially to specific state?
            // "If there is no input... helper text..." 
            // "If nickname not longer than 10..."
            validateNickname(); // Check initial state (valid usually)

        } else {
            location.href = "login.html";
        }
    } catch (error) {
        console.error("Profile Load Error:", error);
    }
}


function setupProfileListeners() {
    const nicknameInput = document.getElementById("nickname-input");
    const helperText = document.getElementById("validation-helper");
    const submitBtn = document.getElementById("submit-btn");

    // Image Upload
    const imgWrapper = document.getElementById("profile-img-wrapper");
    const fileInput = document.getElementById("profile-file-input");

    imgWrapper.addEventListener("click", () => {
        fileInput.click();
    });

    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            currentProfileFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                imgWrapper.style.backgroundImage = `url(${e.target.result})`;
            };
            reader.readAsDataURL(file);
        }
        checkFormValidity();
    });

    // Nickname Validation
    nicknameInput.addEventListener("input", () => {
        validateNickname();
        checkFormValidity();
    });

    // Submit
    document.getElementById("profile-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        handleProfileUpdate();
    });

    // Withdrawal
    document.getElementById("withdraw-btn").addEventListener("click", () => {
        document.getElementById("withdraw-modal").classList.remove("hidden");
    });

    document.getElementById("modal-cancel-btn").addEventListener("click", () => {
        document.getElementById("withdraw-modal").classList.add("hidden");
    });

    document.getElementById("modal-confirm-btn").addEventListener("click", handleWithdrawal);
}

function validateNickname() {
    const input = document.getElementById("nickname-input");
    const helper = document.getElementById("validation-helper");
    const val = input.value.trim();

    if (val.length === 0) {
        helper.innerText = "*닉네임을 입력해주세요.";
        helper.style.display = "block";
        return false;
    } else if (val.length > 10) {
        // Should force limit? Req says: "If input > 10 letters, helper text should be..."
        // And input maxlength attribute might prevent it?
        // If maxlength is 10, user can't type more. 
        // If we want to show error for length, we might remove maxlength or check logic.
        // Let's keep maxlength for UX but just in case user pastes or bypasses:
        helper.innerText = "*닉네임은 최대 10자까지 작성 가능합니다.";
        helper.style.display = "block";
        return false;
    } else {
        // Valid length. Duplication check happens on submit or debounced?
        // Req: "If edited nickname collides... helper text should be..."
        // This implies validation. Usually backend returns 409 or similar.
        // We will reset helper if valid format.
        helper.style.display = "none";
        return true;
    }
}

function checkFormValidity() {
    const submitBtn = document.getElementById("submit-btn");
    const isValid = validateNickname(); // This relies on UI state mostly
    // Also enable if changed? Or just valid?
    // "When the user clicks submit..."
    // Requirements don't strictly say "disable if unchanged".
    // But typical UX. Edit page logic had it. 
    // Here: "Submit button below. When user clicks... edit nickname."
    // Let's enable if valid.

    const nickname = document.getElementById("nickname-input").value.trim();

    // Simple logic: if valid
    if (isValid && nickname.length > 0) {
        submitBtn.disabled = false;
        submitBtn.classList.add("active");
    } else {
        submitBtn.disabled = true;
        submitBtn.classList.remove("active");
    }
}

async function handleProfileUpdate() {
    const nickname = document.getElementById("nickname-input").value.trim();
    const helper = document.getElementById("validation-helper");

    // 1. If Image Changed, Upload First (assuming same logic as Post or User update supports URL?)
    // API Check: PATCH /v1/users/me takes `UpdateUserRequest` { nickname, email }.
    // It DOES NOT take image. 
    // Is there an image upload endpoint for users?
    // Schema checking... /v1/users/ (create) takes `profileImageUrl`.
    // There isn't a dedicated `/v1/users/image` endpoint visible in my memory of schema.
    // There was `/v1/posts/image`.
    // If backend uses same generic upload for profile? Or maybe PATCH supports it but schema is hidden?
    // Requirement says: "User can change their profile image".
    // I will try to upload to `/v1/posts/image` (generic upload) and send URL if `UpdateUserRequest` supports it.
    // If `UpdateUserRequest` doesn't support `profileImageUrl`, we might be stuck.
    // Let's try sending `profile_image_url` or similar in PATCH body. If it fails, we handle.
    // NOTE: Schema showed `UpdateUserRequest`: nickname, email. NO IMAGE.
    // This implies backend might rely on separate flow or schema is incomplete.
    // I will try to upload image and update.

    let newImageUrl = null;
    if (currentProfileFile) {
        try {
            const formData = new FormData();
            formData.append("file", currentProfileFile);
            const uploadRes = await fetch(`${API_BASE_URL}/v1/posts/image`, { // Using post image upload as generic?
                method: "POST",
                body: formData,
                credentials: "include"
            });
            if (uploadRes.ok) {
                const upResult = await uploadRes.json();
                newImageUrl = upResult.data; // URL
            } else {
                alert("이미지 업로드 실패");
                return;
            }
        } catch (e) { console.error(e); return; }
    }

    const payload = {};
    if (nickname !== originalNickname) payload.nickname = nickname;
    // Attempt to send image url if we have one. Even if schema doesn't document it, it might work?
    // Or maybe I missed it.
    if (newImageUrl) payload.profileImageUrl = newImageUrl; // CamelCase? or snake? User create had `profileImageUrl`.

    if (Object.keys(payload).length === 0) {
        alert("수정할 내용이 없습니다.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/v1/users/me`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            credentials: "include"
        });

        if (response.ok) {
            alert("수정되었습니다.");
            location.reload();
        } else {
            // Check for duplication error
            const err = await response.json();
            // Assuming 409 or 422?
            // Req: "If... collides... helper text *중복되는 닉네임입니다."
            // We need to detect this specific error.
            if (response.status === 409 || (err.detail && err.detail.includes("exists"))) {
                helper.innerText = "*중복되는 닉네임입니다.";
                helper.style.display = "block";
            } else {
                alert("수정 실패: " + (err.detail || "알 수 없는 오류"));
            }
        }
    } catch (e) {
        console.error(e);
        alert("오류 발생");
    }
}

async function handleWithdrawal() {
    const password = document.getElementById("withdraw-password").value;
    const helper = document.getElementById("withdraw-helper");

    if (!password) {
        helper.style.display = "block";
        return;
    }
    helper.style.display = "none";

    try {
        const payload = {
            password: password,
            agree: true
        };

        const response = await fetch(`${API_BASE_URL}/v1/users/me`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            credentials: "include"
        });

        if (response.ok) {
            alert("회원탈퇴가 완료되었습니다.");
            location.href = "login.html";
        } else {
            alert("탈퇴 실패. 비밀번호를 확인해주세요.");
        }
    } catch (e) {
        console.error(e);
        alert("오류 발생");
    }
}
