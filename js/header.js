
// js/header.js
// Handles global header logic: Auth check, Profile Image, Dropdown Menu

document.addEventListener("DOMContentLoaded", () => {
    setupHeader();
});

let headerCurrentUser = null;

async function setupHeader() {
    const profileCircle = document.getElementById("header-profile");
    if (!profileCircle) return; // Not all pages might have header active or loaded yet if script order varies

    try {
        const response = await fetch(`${API_BASE_URL}/v1/users/me`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        });

        if (response.ok) {
            const result = await response.json();
            const user = result.data.user;
            headerCurrentUser = user;

            // Set Profile Image
            if (user.profile_image) {
                profileCircle.style.backgroundImage = `url(${user.profile_image})`;
            } else {
                profileCircle.style.backgroundColor = "#555";
            }

            // Setup Dropdown
            setupDropdown(profileCircle);

        } else {
            // Not logged in
            // Identify if we should redirect to login? 
            // Header script generally runs on protected pages based on current app structure (except login/signup).
            // But main page (index.html) might be visible to guests? 
            // Requirement says "On every page with a profile icon...". 
            // If fetching fails, we might just redirect to login for now as per previous logic in main.js
            // Or if it's index.html, maybe allowed? 
            // Previous main.js logic redirected to login if auth failed.
            if (!location.pathname.endsWith("signup.html") && !location.pathname.endsWith("login.html")) {
                location.href = "login.html";
            }
        }
    } catch (error) {
        console.error("Header Auth Check Failed:", error);
        if (!location.pathname.endsWith("signup.html") && !location.pathname.endsWith("login.html")) {
            location.href = "login.html";
        }
    }
}

function setupDropdown(profileBtn) {
    // Create Dropdown Element if not exists
    let dropdown = document.getElementById("header-dropdown");
    if (!dropdown) {
        dropdown = document.createElement("div");
        dropdown.id = "header-dropdown";
        dropdown.className = "header-dropdown hidden";

        dropdown.innerHTML = `
            <ul>
                <li id="menu-edit-info">회원정보수정</li>
                <li id="menu-change-pw">비밀번호수정</li>
                <li id="menu-logout">로그아웃</li>
            </ul>
        `;

        // Append to body or relative to header-auth
        // Requirement requests "below the profile icon".
        // Structurally better to append to `header-auth` container if relative positioning used.
        const headerAuth = document.querySelector(".header-auth");
        if (headerAuth) {
            headerAuth.appendChild(dropdown);
        } else {
            document.body.appendChild(dropdown);
        }
    }

    // Toggle logic
    profileBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("hidden");
    });

    // Close when clicking outside
    document.addEventListener("click", (e) => {
        if (!profileBtn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add("hidden");
        }
    });

    // Menu Actions
    document.getElementById("menu-edit-info").addEventListener("click", () => {
        location.href = "edit_profile.html";
    });

    document.getElementById("menu-change-pw").addEventListener("click", () => {
        location.href = "password.html";
    });

    document.getElementById("menu-logout").addEventListener("click", handleGlobalLogout);
}

async function handleGlobalLogout() {
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
        console.error("Logout Error:", error);
        location.href = "login.html";
    }
}
