// login.js: 로그인 기능을 담당하는 핵심 파일.
const loginForm = document.getElementById("login-form");

loginForm.addEventListener("submit", async (event) => {
    // 이벤트를 명시적으로 처리하지 않을 때도 기본 액션을 수행하지 않도록 함.
    event.preventDefault();

    const emailStr = document.getElementById("email").value;
    const passwordStr = document.getElementById("password").value;

    // FastAPI는 JSON을 받기 때문에 JSON.stringify()를 사용하여 DOM에서 긁어온 username과 password를 JSON으로 변환.
    const bodyData = JSON.stringify({ email: emailStr, password: passwordStr });
    const contentType = "application/json";

    try {
        const response = await fetch(`${API_BASE_URL}/v1/auth/session`, {
            method: "POST",
            headers: {
                "Content-Type": contentType,
            },
            body: bodyData,
            // 서로 다른 서버 간에 쿠키를 공유하기 위한 필수 요소
            // https://developer.mozilla.org/ko/docs/Web/API/Request/credentials
            credentials: "include",
        });

        if (response.ok) {
            // 로그인에 성공했으며 브라우저가 자동으로 'Set-Cookie' 헤더를 보고 세션 ID를 저장했다.
            // 이제부터 모든 요청에 이 쿠키가 자동으로 포함된다.
            alert("로그인 성공!");
            window.location.href = "/index.html";
        } else {
            const errorData = await response.json();
            alert(`로그인 실패: ${errorData.detail || "아이디 또는 비밀번호가 일치하지 않습니다."}`);
        }
    } catch (error) {
        console.error("로그인 에러: ", error);
        alert("서버와 통신할 수 없습니다.");
    }
});