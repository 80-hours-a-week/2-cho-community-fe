// login.js: 로그인 기능을 담당하는 핵심 파일.
const loginForm = document.getElementById("login-form");
const loginBtn = document.querySelector(".login-btn");
const inputFields = document.querySelectorAll(".input-group input");

const showUserError = (fieldId, message) => {
    const input = document.getElementById(fieldId);
    const span = input.nextElementSibling;
    span.textContent = message;
    input.classList.add("error-border");
}

const clearUserError = () => {
    document.querySelectorAll(".input-group span").forEach(span => span.textContent = "");
}

const resetButton = () => {
    loginBtn.disabled = false;
    loginBtn.textContent = "로그인";
}

inputFields.forEach((input) => {
    if (input.classList.contains("error-border"))
        input.classList.remove("error-border");
    const span = input.nextElementSibling;
    if (span && span.textContent)
        span.textContent = "";
})

loginForm.addEventListener("submit", async (event) => {
    // 이벤트를 명시적으로 처리하지 않을 때도 기본 액션을 수행하지 않도록 함.
    event.preventDefault();
    clearUserError();

    const emailStr = document.getElementById("email").value;
    const passwordStr = document.getElementById("password").value;

    // 이메일과 비밀번호의 포맷을 검사
    if (!emailStr || !passwordStr) {
        if (!emailStr) showError(emailInput, "이메일을 입력해주세요.");
        if (!passwordStr) showError(passwordInput, "비밀번호를 입력해주세요.");
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "로그인 중...";

    try {
        const response = await fetch(`${API_BASE_URL}/v1/auth/session`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            // FastAPI는 JSON을 받기 때문에 JSON.stringify()를 사용하여 DOM에서 긁어온 username과 password를 JSON으로 변환.
            body: JSON.stringify({ email: emailStr, password: passwordStr }),
            // 서로 다른 서버 간에 쿠키를 공유하기 위한 필수 요소
            // https://developer.mozilla.org/ko/docs/Web/API/Request/credentials
            credentials: "include",
        });

        if (response.ok) {
            // 로그인에 성공했으며 브라우저가 자동으로 'Set-Cookie' 헤더를 보고 세션 ID를 저장했다.
            // 이제부터 모든 요청에 이 쿠키가 자동으로 포함된다.
            window.location.href = "/index.html";
        } else {
            let errorMsg = "이메일 또는 비밀번호가 일치하지 않습니다.";
            try {
                const errorData = await response.json();
                if (errorData && errorData.detail) {
                    errorMsg = errorData.detail.error;
                }
            } catch (e) {
                console.warn("JSON 파싱 실패 (백엔드 데이터 형식을 확인하세요):", e);
                // 파싱에 실패하면 위에서 설정한 기본 errorMsg("이메일 또는...")가 유지됩니다.
            }
            showUserError("password", errorMsg);
            resetButton();
            //alert(`로그인 실패: ${errorData.detail || "아이디 또는 비밀번호가 일치하지 않습니다."}`);
        }
    } catch (error) {
        console.error("로그인 에러: ", error);
        showUserError("password", "서버와 통신할 수 없습니다.");
        resetButton();
        //alert("서버와 통신할 수 없습니다.");
    }
});