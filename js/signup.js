// 프로필 이미지 미리보기 기능
const signupForm = document.getElementById("signup-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const passwordConfirmInput = document.getElementById("password-confirm");
const nicknameInput = document.getElementById("nickname");
const profileInput = document.getElementById('profile-upload');
const previewImg = document.getElementById('preview-img');
const placeholder = document.getElementById('preview-placeholder');

// 헬퍼 텍스트 보여주기
function showHelperText(inputElement, message, isError = true) {
    const wrapper = inputElement.closest(".input-group") || inputElement.closest(".profile-upload-container");
    const helperSpan = wrapper.querySelector("span") || wrapper.querySelector(".helper-text");

    if (helperSpan) {
        helperSpan.textContent = message;
        helperSpan.style.display = "block";
        helperSpan.style.color = isError ? "#FF3333" : "inherit"; // 에러면 빨간색
    }
}

// 헬퍼 텍스트 초기화하기
function clearHelperText(inputElement) {
    const wrapper = inputElement.closest(".input-group") || inputElement.closest(".profile-upload-container");
    const helperSpan = wrapper.querySelector("span") || wrapper.querySelector(".helper-text");
    if (helperSpan) {
        helperSpan.textContent = "";
    }
}

// 프로필 사진 업로드
if (profileInput) {
    profileInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                previewImg.classList.remove("hidden");
                placeholder.classList.add("hidden");
            };
            reader.readAsDataURL(file);
        } else {
            previewImg.src = "";
            previewImg.classList.add("hidden");
            placeholder.classList.remove("hidden");
        }
    });
}

// 회원가입 정보를 백엔드로 전달
if (signupForm) {
    signupForm.addEventListener("submit", async (event) => {
        event.preventDefault(); // 기본 제출 방지

        // --- 유효성 검사 시작 ---
        let isValid = true;

        // 비밀번호 확인 검사
        if (passwordInput.value !== passwordConfirmInput.value) {
            showHelperText(passwordConfirmInput, "* 비밀번호가 일치하지 않습니다.");
            isValid = false;
        } else {
            clearHelperText(passwordConfirmInput);
        }

        // (선택) 닉네임 길이 검사 등 추가 가능
        if (nicknameInput.value.trim() === "") {
            showHelperText(nicknameInput, "* 닉네임을 입력해주세요.");
            isValid = false;
        }

        if (!isValid) return; // 유효성 검사 실패 시 중단
        // --- 유효성 검사 끝 ---

        // 4. 데이터 전송 준비 (FormData 사용)
        const formData = new FormData();

        // 텍스트 데이터 추가
        formData.append("email", emailInput.value);
        formData.append("password", passwordInput.value);
        formData.append("nickname", nicknameInput.value);

        // 파일 데이터 추가 (파일이 선택된 경우에만)
        if (profileInput.files[0]) {
            formData.append("profile_image", profileInput.files[0]);
        }

        try {
            // API 호출
            // API_BASE_URL은 config.js에 정의되어 있음
            const response = await fetch(`${API_BASE_URL}/v1/users`, {
                method: "POST",
                body: formData, // JSON.stringify 하지 않고 FormData 그대로 전송
            });

            if (response.ok) {
                alert("회원가입이 완료되었습니다!");
                window.location.href = "login.html"; // 로그인 페이지로 이동
            } else {
                // 에러 처리
                const errorData = await response.json();
                alert(`회원가입 실패: ${errorData.message || "알 수 없는 오류"}`);
            }
        } catch (error) {
            console.error("회원가입 에러:", error);
            alert("서버 통신 중 오류가 발생했습니다.");
        }
    });
}

// 뒤로 가기 버튼
const backBtn = document.getElementById("back-btn");
if (backBtn) {
    backBtn.addEventListener("click", () => {
        window.history.back();
        if (document.referrer === "") { window.location.href = "index.html"; }
    });
}