# React 프론트엔드 재구축 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Camp Linux 커뮤니티 프론트엔드를 Vanilla JS MPA에서 React SPA로 재구축 (핵심 범위: 인증 + 게시판 + 프로필)

**Architecture:** Vite + React 19 + TypeScript SPA. React Router v7 (library 모드)로 클라이언트 라우팅. AuthContext/ThemeContext로 전역 상태. 기존 CSS를 전역 import하여 디자인 유지.

**Tech Stack:** React 19, TypeScript, Vite, @vitejs/plugin-react, React Router v7, marked, DOMPurify, highlight.js, lucide-react

**Spec:** `specs/2026-03-29-react-rebuild-design.md`

---

## File Map

### 신규 생성

| 파일 | 역할 |
|------|------|
| `src/main.tsx` | React DOM 마운트, CSS 전역 import |
| `src/App.tsx` | Provider 래핑 + Router 정의 |
| `src/types/auth.ts` | User, LoginRequest, LoginResponse 타입 |
| `src/types/post.ts` | Post, Comment, Category 타입 |
| `src/types/common.ts` | ApiResponse, PaginatedResponse 타입 |
| `src/constants/endpoints.ts` | API 엔드포인트 상수 (기존 constants.js에서 이전) |
| `src/constants/routes.ts` | SPA 라우트 경로 상수 |
| `src/constants/messages.ts` | UI 메시지 상수 (기존 constants.js에서 이전) |
| `src/services/api.ts` | HTTP 클라이언트 (JWT, refresh, trailing slash) |
| `src/utils/toast.ts` | Toast 싱글턴 구독 패턴 |
| `src/utils/formatters.ts` | 날짜/숫자 포맷 유틸 |
| `src/utils/validators.ts` | 폼 검증 유틸 |
| `src/contexts/AuthContext.tsx` | 인증 상태 전역 Context + Provider |
| `src/contexts/ThemeContext.tsx` | 다크모드 테마 Context + Provider |
| `src/hooks/useAuth.ts` | AuthContext 접근 훅 (useApi.ts는 핵심 범위에서 불필요 — 페이지가 api.ts를 직접 호출) |
| `src/components/LoadingSpinner.tsx` | 로딩 스피너 |
| `src/components/Toast.tsx` | 토스트 알림 |
| `src/components/Header.tsx` | 네비게이션 헤더 |
| `src/components/Sidebar.tsx` | 카테고리 사이드바 |
| `src/components/BottomTab.tsx` | 모바일 하단 탭 |
| `src/components/MainLayout.tsx` | Header + Sidebar + Outlet + BottomTab 조합 |
| `src/components/AuthGuard.tsx` | 인증 라우트 보호 |
| `src/components/Pagination.tsx` | 페이지네이션 |
| `src/components/PostCard.tsx` | 게시글 카드 |
| `src/components/PostActionBar.tsx` | 좋아요/북마크/공유/신고 |
| `src/components/MarkdownRenderer.tsx` | 마크다운 렌더링 (marked + DOMPurify로 XSS 방지) |
| `src/components/MarkdownEditor.tsx` | 마크다운 에디터 |
| `src/components/PostForm.tsx` | 게시글 작성/수정 공유 폼 |
| `src/components/CommentForm.tsx` | 댓글 입력 폼 |
| `src/components/CommentList.tsx` | 댓글 목록 (재귀 대댓글) |
| `src/components/Modal.tsx` | 범용 모달 |
| `src/pages/LoginPage.tsx` | 로그인 |
| `src/pages/SignupPage.tsx` | 회원가입 |
| `src/pages/PostListPage.tsx` | 게시글 목록 |
| `src/pages/PostDetailPage.tsx` | 게시글 상세 |
| `src/pages/PostWritePage.tsx` | 게시글 작성 |
| `src/pages/PostEditPage.tsx` | 게시글 수정 |
| `src/pages/ProfilePage.tsx` | 내 프로필 편집 |
| `src/pages/UserProfilePage.tsx` | 타인 프로필 보기 |
| `src/pages/NotFoundPage.tsx` | 404 |

### 수정

| 파일 | 변경 내용 |
|------|----------|
| `index.html` | MPA 엔트리 → SPA 단일 엔트리 (`<div id="root">` + `src/main.tsx` 로드) |
| `vite.config.js` → `vite.config.ts` | MPA rollup input 제거, @vitejs/plugin-react 추가, SPA 설정 |
| `tsconfig.json` | React JSX 지원 추가 (`jsx: "react-jsx"`, `src/` 포함) |
| `package.json` | React/React Router 등 의존성 추가 |
| `nginx.k8s.conf` | MPA 개별 라우트 → `try_files $uri /index.html` SPA fallback |

### CSS 이전 (복사)

기존 `css/` 디렉토리를 `src/styles/`로 복사. 파일 내용 변경 없음.

---

## Task 1: 프로젝트 초기화 & Vite + React 셋업

**Files:**
- Modify: `package.json`
- Modify: `vite.config.js` → 새로 작성 `vite.config.ts`
- Modify: `tsconfig.json`
- Modify: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`

- [ ] **Step 1: 새 브랜치 생성**

```bash
cd /Users/revenantonthemission/my-community/2-cho-community-fe
git checkout -b feat/react-rebuild
```

- [ ] **Step 2: React 의존성 설치**

```bash
npm install react react-dom react-router-dom marked dompurify highlight.js lucide-react
npm install -D @types/react @types/react-dom @types/dompurify @vitejs/plugin-react
```

- [ ] **Step 3: `vite.config.ts` 작성 (기존 `vite.config.js` 교체)**

기존 MPA 설정(30+ input entries, mpaRewritePlugin)을 제거하고 SPA 설정으로 교체:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: '.',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: { host: '127.0.0.1', port: 8080, strictPort: true },
  preview: { host: '127.0.0.1', port: 8080, strictPort: true },
});
```

- [ ] **Step 4: `tsconfig.json` 업데이트**

React JSX를 지원하도록 수정:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 5: `index.html`을 SPA 엔트리로 교체**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Camp Linux</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 6: `src/main.tsx` 작성**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 7: `src/App.tsx` 최소 작성**

```tsx
export default function App() {
  return <h1>Camp Linux — React</h1>;
}
```

- [ ] **Step 8: 개발 서버 실행 확인**

```bash
npx vite
```

브라우저에서 `http://127.0.0.1:8080`에 "Camp Linux — React"가 표시되는지 확인.

- [ ] **Step 9: 커밋**

```bash
git add -A
git commit -m "feat: Vite + React + TypeScript 프로젝트 초기화"
```

---

## Task 2: CSS 이전 & 전역 스타일 적용

**Files:**
- Create: `src/styles/` (기존 `css/` 복사)
- Modify: `src/main.tsx` (CSS import 추가)

- [ ] **Step 1: CSS 디렉토리 복사**

```bash
cp -r css/ src/styles/
```

- [ ] **Step 2: `src/styles/style.css` 내부의 상대 경로 확인**

기존 `style.css`가 `@import url('variables.css')` 등 상대경로를 사용하므로 디렉토리 구조가 동일하면 변경 불필요. 확인만 수행.

- [ ] **Step 3: 페이지별 CSS를 `style.css`에 추가**

기존 MPA에서는 각 HTML에서 개별 로드하던 페이지 CSS를 `src/styles/style.css` 하단에 추가. 먼저 `ls src/styles/pages/`로 실제 존재하는 파일 확인 후, 존재하는 파일만 import:

```css
/* 5. Pages - SPA에서는 전역 로드 */
/* ls src/styles/pages/ 결과 확인 후 존재하는 파일만 아래에 추가 */
@import url('pages/login.css');
@import url('pages/signup.css');
@import url('pages/detail.css');
@import url('pages/write.css');
@import url('pages/profile.css');
@import url('pages/find_account.css');
@import url('pages/admin.css');
@import url('pages/tags.css');
@import url('pages/wiki.css');
@import url('pages/packages.css');
@import url('pages/badges.css');
@import url('pages/social-signup.css');
```

- [ ] **Step 4: `src/main.tsx`에 CSS import 추가**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/style.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 5: Google Fonts 링크 `index.html`에 추가**

기존 HTML에 있던 Google Fonts 링크를 `index.html`의 `<head>`에 복사 (기존 HTML 파일에서 확인 후 동일하게 추가).

- [ ] **Step 6: 개발 서버에서 스타일 적용 확인**

```bash
npx vite
```

브라우저에서 CSS 변수(다크모드 색상), 폰트, 기본 레이아웃 스타일이 적용되는지 확인.

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "feat: 기존 CSS를 src/styles/로 이전 및 전역 로드"
```

---

## Task 3: TypeScript 타입 정의

**Files:**
- Create: `src/types/common.ts`
- Create: `src/types/auth.ts`
- Create: `src/types/post.ts`

- [ ] **Step 1: `src/types/common.ts` 작성**

```typescript
export interface ApiResponse<T = unknown> {
  code: string;
  message: string;
  data: T;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
}
```

- [ ] **Step 2: `src/types/auth.ts` 작성**

```typescript
export interface User {
  id: number;
  email: string;
  nickname: string;
  profile_image: string | null;
  bio: string | null;
  distro: string | null;
  role: 'user' | 'admin';
  email_verified: boolean;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}
```

- [ ] **Step 3: `src/types/post.ts` 작성**

```typescript
export interface Post {
  id: number;
  title: string;
  content: string;
  author_id: number;
  author_nickname: string;
  author_profile_image: string | null;
  author_distro: string | null;
  category_id: number;
  category_name: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  is_pinned: boolean;
  is_liked?: boolean;
  is_bookmarked?: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  content: string;
  author_id: number;
  author_nickname: string;
  author_profile_image: string | null;
  author_distro: string | null;
  post_id: number;
  parent_id: number | null;
  like_count: number;
  is_liked?: boolean;
  is_accepted?: boolean;
  created_at: string;
  updated_at: string;
  replies?: Comment[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
}
```

- [ ] **Step 4: 타입 체크 실행**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: 커밋**

```bash
git add src/types/
git commit -m "feat: TypeScript 타입 정의 (auth, post, common)"
```

---

## Task 4: 상수 이전 (endpoints, routes, messages)

**Files:**
- Create: `src/constants/endpoints.ts`
- Create: `src/constants/routes.ts`
- Create: `src/constants/messages.ts`

- [ ] **Step 1: `src/constants/endpoints.ts` 작성**

기존 `js/constants.js`의 `API_ENDPOINTS`를 TypeScript로 이전. 핵심 범위에 필요한 엔드포인트만:

```typescript
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/v1/auth/session',
    LOGOUT: '/v1/auth/session',
    REFRESH: '/v1/auth/token/refresh',
    ME: '/v1/auth/me',
  },
  USERS: {
    ROOT: '/v1/users',
    ME: '/v1/users/me',
    PASSWORD: '/v1/users/me/password',
    PROFILE_IMAGE: '/v1/users/profile/image',
  },
  POSTS: {
    ROOT: '/v1/posts',
    IMAGE: '/v1/posts/image',
  },
  CATEGORIES: {
    ROOT: '/v1/categories',
  },
  LIKES: {
    ROOT: (postId: number) => `/v1/posts/${postId}/likes`,
  },
  BOOKMARKS: {
    ROOT: (postId: number) => `/v1/posts/${postId}/bookmark`,
  },
  COMMENTS: {
    ROOT: (postId: number) => `/v1/posts/${postId}/comments`,
    DETAIL: (postId: number, commentId: number) =>
      `/v1/posts/${postId}/comments/${commentId}`,
  },
  COMMENT_LIKES: {
    ROOT: (postId: number, commentId: number) =>
      `/v1/posts/${postId}/comments/${commentId}/like`,
  },
  REPORTS: {
    ROOT: '/v1/reports',
  },
  FOLLOW: {
    FOLLOW: (userId: number) => `/v1/users/${userId}/follow`,
  },
  BLOCKS: {
    BLOCK: (userId: number) => `/v1/users/${userId}/block`,
  },
  REPUTATION: {
    USER: (userId: number) => `/v1/users/${userId}/reputation`,
    USER_BADGES: (userId: number) => `/v1/users/${userId}/badges`,
  },
} as const;
```

- [ ] **Step 2: `src/constants/routes.ts` 작성**

```typescript
export const ROUTES = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  HOME: '/',
  POST_DETAIL: (id: number | string) => `/detail/${id}`,
  POST_WRITE: '/write',
  POST_EDIT: (id: number | string) => `/edit/${id}`,
  PROFILE: '/edit-profile',
  USER_PROFILE: (id: number | string) => `/user-profile/${id}`,
} as const;
```

- [ ] **Step 3: `src/constants/messages.ts` 작성**

기존 `js/constants.js`의 `UI_MESSAGES`를 이전 (핵심 범위에 필요한 메시지만):

```typescript
export const UI_MESSAGES = {
  LOGIN_REQUIRED: '로그인이 필요합니다.',
  SERVER_ERROR: '서버 통신 중 오류가 발생했습니다.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
  POST_LOAD_FAIL: '게시글 목록을 불러오지 못했습니다.',
  POST_DETAIL_FAIL: '게시글을 불러오지 못했습니다.',
  POST_CREATE_SUCCESS: '게시글이 작성되었습니다.',
  POST_UPDATE_SUCCESS: '게시글이 수정되었습니다.',
  POST_DELETE_SUCCESS: '게시글이 삭제되었습니다.',
  DELETE_SUCCESS: '삭제되었습니다.',
  LIKE_FAIL: '좋아요 처리에 실패했습니다.',
  BOOKMARK_FAIL: '북마크 처리에 실패했습니다.',
  COMMENT_CREATE_FAIL: '댓글 등록 실패',
  COMMENT_UPDATE_FAIL: '댓글 수정 실패',
  SHARE_COPIED: '링크가 복사되었습니다.',
  REPORT_SUCCESS: '신고가 접수되었습니다.',
  SIGNUP_SUCCESS: '회원가입이 완료되었습니다!',
  LOGOUT_SUCCESS: '로그아웃 되었습니다.',
} as const;
```

- [ ] **Step 4: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: 커밋**

```bash
git add src/constants/
git commit -m "feat: 상수 이전 (endpoints, routes, messages)"
```

---

## Task 5: API 서비스 (services/api.ts)

**Files:**
- Create: `src/services/api.ts`

이 파일은 기존 `js/services/ApiService.js`를 TypeScript로 재작성합니다. 핵심 동작: JWT Bearer 토큰, trailing slash 보장, 401 자동 refresh (thundering herd 방지).

- [ ] **Step 1: `src/services/api.ts` 작성**

기존 `js/services/ApiService.js` + `js/config.js` 참고하여 구현:
- 환경별 API Base URL 감지 (Vite dev / Docker / K8s)
- `ensureTrailingSlash()` (FastAPI 307 방지)
- 모듈 스코프 `accessToken` (XSS 방지)
- `tryRefresh()` — thundering herd 방지 (동시 1회만)
- `request<T>()` — 공통 HTTP 요청 (Authorization 헤더, 401 자동 refresh)
- `api.get()`, `api.post()`, `api.put()`, `api.patch()`, `api.delete()` — JSON 메서드
- `api.postFormData()` — multipart/form-data (Content-Type 미설정, 브라우저 자동)

참고 파일:
- `js/services/ApiService.js` — 기존 구현
- `js/config.js` — 환경 감지 로직

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 커밋**

```bash
git add src/services/api.ts
git commit -m "feat: API 서비스 구현 (JWT, refresh, trailing slash)"
```

---

## Task 6: 유틸리티 (toast, formatters, validators)

**Files:**
- Create: `src/utils/toast.ts`
- Create: `src/utils/formatters.ts`
- Create: `src/utils/validators.ts`

- [ ] **Step 1: `src/utils/toast.ts` 작성**

싱글턴 구독 패턴: `onToast(listener)`, `offToast()`, `showToast(message, type)`.

- [ ] **Step 2: `src/utils/formatters.ts` 작성**

기존 `js/utils/formatters.js`를 TypeScript로 이전: `formatDate()`, `formatCount()`, `timeAgo()`.

- [ ] **Step 3: `src/utils/validators.ts` 작성**

`isValidEmail()`, `isValidPassword()`, `isValidNickname()`.

- [ ] **Step 4: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: 커밋**

```bash
git add src/utils/
git commit -m "feat: 유틸리티 함수 구현 (toast, formatters, validators)"
```

---

## Task 7: ThemeContext

**Files:**
- Create: `src/contexts/ThemeContext.tsx`

- [ ] **Step 1: `src/contexts/ThemeContext.tsx` 작성**

`ThemeProvider` + `useTheme()` 훅. `useState`로 theme 관리. `useEffect`로 `document.documentElement.setAttribute('data-theme', theme)` 동기화. 초기값: localStorage → OS 설정 → 'light'.

기존 참고: `js/services/ThemeService.js`

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 커밋**

```bash
git add src/contexts/ThemeContext.tsx
git commit -m "feat: ThemeContext 구현 (다크모드, DOM 동기화)"
```

---

## Task 8: AuthContext + useAuth 훅

**Files:**
- Create: `src/contexts/AuthContext.tsx`
- Create: `src/hooks/useAuth.ts`

- [ ] **Step 1: `src/contexts/AuthContext.tsx` 작성**

`AuthProvider`:
- `useState` — `user: User | null`, `isLoading: boolean`
- `useEffect` — 앱 시작 시 refresh token으로 인증 복원 (`POST /v1/auth/token/refresh` → `GET /v1/auth/me`)
- `login()` — `POST /v1/auth/session` → `setAccessToken` → `GET /v1/auth/me` → `setUser`
- `logout()` — `DELETE /v1/auth/session` → `setAccessToken(null)` → `setUser(null)`
- `setUser()` — 회원가입 후 수동 설정용

- [ ] **Step 2: `src/hooks/useAuth.ts` 작성**

`useContext(AuthContext)` 래퍼. null 체크 + 에러 throw.

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: 커밋**

```bash
git add src/contexts/AuthContext.tsx src/hooks/useAuth.ts
git commit -m "feat: AuthContext + useAuth 훅 구현"
```

---

## Task 9: 공통 컴포넌트 — LoadingSpinner, Toast, Modal

**Files:**
- Create: `src/components/LoadingSpinner.tsx`
- Create: `src/components/Toast.tsx`
- Create: `src/components/Modal.tsx`

- [ ] **Step 1: `LoadingSpinner.tsx`**

기존 CSS 클래스 `.loading-spinner-container`, `.loading-spinner` 사용.

- [ ] **Step 2: `Toast.tsx`**

`useState`로 toast 큐 관리. `useEffect`로 `onToast()` 구독. 3초 후 자동 제거. 기존 CSS `.toast-container`, `.toast`, `.toast-success`, `.toast-error` 사용.

- [ ] **Step 3: `Modal.tsx`**

Props: `isOpen`, `onClose`, `title?`, `children`. 오버레이 클릭으로 닫기. `body.overflow = 'hidden'` 제어. 기존 CSS `.modal-overlay`, `.modal-content` 사용.

- [ ] **Step 4: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: 커밋**

```bash
git add src/components/LoadingSpinner.tsx src/components/Toast.tsx src/components/Modal.tsx
git commit -m "feat: 공통 컴포넌트 구현 (LoadingSpinner, Toast, Modal)"
```

---

## Task 10: 레이아웃 — Header, Sidebar, BottomTab, MainLayout, AuthGuard

**Files:**
- Create: `src/components/Header.tsx`
- Create: `src/components/Sidebar.tsx`
- Create: `src/components/BottomTab.tsx`
- Create: `src/components/MainLayout.tsx`
- Create: `src/components/AuthGuard.tsx`

- [ ] **Step 1: `Header.tsx`**

기존 참고: `js/views/HeaderView.js` + `js/controllers/HeaderController.js` + `css/layout.css`

주요 요소: 로고 (Link to HOME), 검색 입력, 테마 토글 (`useTheme()`), 로그인/프로필 메뉴 (`useAuth()`).

- [ ] **Step 2: `Sidebar.tsx`**

기존 참고: `js/views/SidebarView.js` + `css/modules/sidebar.css`

`GET /v1/categories/`에서 카테고리 목록 가져와 표시. 현재 선택된 카테고리 하이라이트 (`useSearchParams`).

- [ ] **Step 3: `BottomTab.tsx`**

기존 참고: `js/components/BottomTabComponent.js` + `css/modules/bottom-tabs.css`

- [ ] **Step 4: `MainLayout.tsx`**

```tsx
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomTab from './BottomTab';

export default function MainLayout() {
  return (
    <>
      <Header />
      <div className="main-container">
        <Sidebar />
        <main className="content">
          <Outlet />
        </main>
      </div>
      <BottomTab />
    </>
  );
}
```

- [ ] **Step 5: `AuthGuard.tsx`**

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';
import { ROUTES } from '../constants/routes';

export default function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />;
  return <Outlet />;
}
```

- [ ] **Step 6: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: 커밋**

```bash
git add src/components/Header.tsx src/components/Sidebar.tsx src/components/BottomTab.tsx src/components/MainLayout.tsx src/components/AuthGuard.tsx
git commit -m "feat: 레이아웃 컴포넌트 구현 (Header, Sidebar, BottomTab, MainLayout, AuthGuard)"
```

---

## Task 11: App.tsx 라우터 + Provider 연결 + 페이지 placeholder

**Files:**
- Modify: `src/App.tsx`
- Create: `src/pages/NotFoundPage.tsx`
- Create: `src/pages/LoginPage.tsx` (placeholder)
- Create: `src/pages/SignupPage.tsx` (placeholder)
- Create: `src/pages/PostListPage.tsx` (placeholder)
- Create: `src/pages/PostDetailPage.tsx` (placeholder)
- Create: `src/pages/PostWritePage.tsx` (placeholder)
- Create: `src/pages/PostEditPage.tsx` (placeholder)
- Create: `src/pages/ProfilePage.tsx` (placeholder)
- Create: `src/pages/UserProfilePage.tsx` (placeholder)

- [ ] **Step 1: `NotFoundPage.tsx`**

404 표시 + 홈 링크.

- [ ] **Step 2: 페이지 placeholder 생성**

각 페이지를 `export default function XxxPage() { return <div>Xxx — TODO</div>; }` 형태로 생성.

- [ ] **Step 3: `App.tsx` 라우터 + Provider 완성**

`BrowserRouter > ThemeProvider > AuthProvider > Toast + Routes`. 설계 문서의 라우트 구조를 그대로 구현 (spec 107-131행).

- [ ] **Step 4: 개발 서버 + 라우팅 확인**

```bash
npx vite
```

확인:
- `/` → PostListPage placeholder + Header/Sidebar
- `/login` → LoginPage placeholder (레이아웃 없음)
- `/write` → 미인증이면 `/login`으로 리다이렉트
- `/asdf` → NotFoundPage

- [ ] **Step 5: 커밋**

```bash
git add src/
git commit -m "feat: App.tsx 라우터 + Provider 연결, 페이지 placeholder"
```

---

## Task 12: LoginPage 구현

**Files:**
- Modify: `src/pages/LoginPage.tsx`

기존 참고:
- `js/controllers/LoginController.js` — 로그인 로직
- `js/views/LoginView.js` — 폼 HTML 구조
- `html/user_login.html` — 전체 페이지 구조
- `css/pages/login.css` — 스타일 (클래스명 확인)

- [ ] **Step 1: `LoginPage.tsx` 구현**

주요 기능:
- 이메일/비밀번호 입력 폼 (`useState` 바인딩)
- `handleSubmit` → `useAuth().login(email, password)`
- 성공 시 `navigate(ROUTES.HOME)`
- 에러 시 에러 메시지 표시
- 회원가입 링크 (`Link to ROUTES.SIGNUP`)
- 기존 CSS 클래스명 사용 (`.login-container`, `.form-group` 등 — `html/user_login.html` 확인 필수)

- [ ] **Step 2: BE 서버와 연동 테스트**

BE 서버 실행 중이어야 함 (`uvicorn main:app --reload --port 8000`).

- [ ] **Step 3: 커밋**

```bash
git add src/pages/LoginPage.tsx
git commit -m "feat: LoginPage 구현"
```

---

## Task 13: SignupPage 구현

**Files:**
- Modify: `src/pages/SignupPage.tsx`

기존 참고:
- `js/controllers/SignupController.js`
- `js/views/SignupView.js`
- `html/user_signup.html`
- `css/pages/signup.css`

- [ ] **Step 1: `SignupPage.tsx` 구현**

주요 기능:
- 이메일, 비밀번호, 비밀번호 확인, 닉네임 입력 폼
- 클라이언트 검증 (`validators.ts` 사용)
- `api.postFormData()` → `POST /v1/users/` (multipart/form-data, `FormData` 객체 구성)
- 성공 시 `navigate(ROUTES.LOGIN)` + `showToast(UI_MESSAGES.SIGNUP_SUCCESS)`

> **주의**: 회원가입 API는 JSON이 아닌 `multipart/form-data`.

- [ ] **Step 2: 연동 테스트**

- [ ] **Step 3: 커밋**

```bash
git add src/pages/SignupPage.tsx
git commit -m "feat: SignupPage 구현"
```

---

## Task 14: PostListPage + PostCard + Pagination

**Files:**
- Modify: `src/pages/PostListPage.tsx`
- Create: `src/components/PostCard.tsx`
- Create: `src/components/Pagination.tsx`

기존 참고:
- `js/controllers/MainController.js`
- `js/views/PostListView.js`
- `js/models/PostModel.js`

- [ ] **Step 1: `Pagination.tsx`**

Props: `page: number`, `totalPages: number`, `onPageChange: (page: number) => void`.

- [ ] **Step 2: `PostCard.tsx`**

Props: `post: Post`. 제목, 작성자, 좋아요/댓글/조회 수, 카테고리, 태그. 클릭 시 `navigate(ROUTES.POST_DETAIL(post.id))`.

- [ ] **Step 3: `PostListPage.tsx` 구현**

- `useSearchParams()`로 `page`, `sort`, `category_id` 관리
- 정렬 탭 렌더링
- `useEffect`로 파라미터 변경 시 `api.get(API_ENDPOINTS.POSTS.ROOT + '?...')` 호출
- PostCard 목록 + Pagination
- 로딩/에러 상태

- [ ] **Step 4: 연동 테스트**

- [ ] **Step 5: 커밋**

```bash
git add src/pages/PostListPage.tsx src/components/PostCard.tsx src/components/Pagination.tsx
git commit -m "feat: PostListPage + PostCard + Pagination 구현"
```

---

## Task 15: MarkdownRenderer

**Files:**
- Create: `src/components/MarkdownRenderer.tsx`

기존 참고: `js/utils/markdown.js`

- [ ] **Step 1: `MarkdownRenderer.tsx` 작성**

`marked` + `DOMPurify` + `highlight.js` 연동. `useMemo`로 렌더링 캐싱.

> **보안**: `DOMPurify.sanitize()`로 반드시 새니타이즈한 HTML만 렌더링. 기존 FE와 동일한 XSS 방지 패턴.

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

> `@types/dompurify`는 Task 1에서 이미 설치됨.

- [ ] **Step 3: 커밋**

```bash
git add src/components/MarkdownRenderer.tsx
git commit -m "feat: MarkdownRenderer 구현 (marked + DOMPurify + highlight.js)"
```

---

## Task 16: PostDetailPage + PostActionBar

**Files:**
- Modify: `src/pages/PostDetailPage.tsx`
- Create: `src/components/PostActionBar.tsx`

기존 참고:
- `js/controllers/DetailController.js`
- `js/views/PostDetailView.js`
- `html/post_detail.html` + `css/pages/detail.css`

- [ ] **Step 1: `PostActionBar.tsx`**

Props: `postId`, `isLiked`, `likeCount`, `isBookmarked`, `onLike`, `onBookmark`, `onShare`, `onReport`.

- [ ] **Step 2: `PostDetailPage.tsx` 구현**

- `useParams()`로 `id` 추출
- `api.get()` → `GET /v1/posts/{id}/`
- MarkdownRenderer로 본문 렌더링
- PostActionBar 연결
- 작성자 본인이면 수정/삭제 버튼 (`useAuth().user?.id === post.author_id`)
- CommentList는 placeholder (Task 18에서 구현)

- [ ] **Step 3: 연동 테스트**

- [ ] **Step 4: 커밋**

```bash
git add src/pages/PostDetailPage.tsx src/components/PostActionBar.tsx
git commit -m "feat: PostDetailPage + PostActionBar 구현"
```

---

## Task 17: MarkdownEditor + PostForm + PostWritePage + PostEditPage

**Files:**
- Create: `src/components/MarkdownEditor.tsx`
- Create: `src/components/PostForm.tsx`
- Modify: `src/pages/PostWritePage.tsx`
- Modify: `src/pages/PostEditPage.tsx`

기존 참고:
- `js/components/MarkdownEditor.js`
- `js/views/WriteView.js` + `js/views/EditView.js`
- `js/controllers/WriteController.js` + `js/controllers/EditController.js`
- `css/pages/write.css`

- [ ] **Step 1: `MarkdownEditor.tsx`**

Props: `value`, `onChange`. 마크다운 툴바, textarea, 미리보기 토글. 이미지 업로드 (`POST /v1/posts/image/`).

- [ ] **Step 2: `PostForm.tsx`**

Props: `initialData?: Post`, `onSubmit: (data) => Promise<void>`. 카테고리 선택 (`GET /v1/categories/`), 제목, MarkdownEditor, 태그 입력.

- [ ] **Step 3: `PostWritePage.tsx`**

`PostForm` + `api.post(API_ENDPOINTS.POSTS.ROOT, data)`. 성공 시 홈으로 이동.

- [ ] **Step 4: `PostEditPage.tsx`**

`useParams()`로 id → `api.get()` 로드 → `PostForm initialData` → `api.patch()` 수정.

- [ ] **Step 5: 연동 테스트**

- [ ] **Step 6: 커밋**

```bash
git add src/components/MarkdownEditor.tsx src/components/PostForm.tsx src/pages/PostWritePage.tsx src/pages/PostEditPage.tsx
git commit -m "feat: MarkdownEditor + PostForm + PostWritePage + PostEditPage 구현"
```

---

## Task 18: CommentList + CommentForm

**Files:**
- Create: `src/components/CommentList.tsx`
- Create: `src/components/CommentForm.tsx`
- Modify: `src/pages/PostDetailPage.tsx` (CommentList 연결)

기존 참고:
- `js/controllers/CommentController.js`
- `js/views/CommentListView.js`
- `css/modules/comments.css`

- [ ] **Step 1: `CommentForm.tsx`**

Props: `postId`, `parentId?`, `initialContent?`, `onSubmit`.

- [ ] **Step 2: `CommentList.tsx`**

Props: `postId`, `comments`, `onCommentChange`. 대댓글 재귀, 좋아요, 수정/삭제, 답글.

- [ ] **Step 3: PostDetailPage에 CommentList 연결**

placeholder 교체.

- [ ] **Step 4: 연동 테스트**

- [ ] **Step 5: 커밋**

```bash
git add src/components/CommentList.tsx src/components/CommentForm.tsx src/pages/PostDetailPage.tsx
git commit -m "feat: CommentList + CommentForm 구현"
```

---

## Task 19: ProfilePage + UserProfilePage

**Files:**
- Modify: `src/pages/ProfilePage.tsx`
- Modify: `src/pages/UserProfilePage.tsx`

기존 참고:
- `js/controllers/ProfileController.js` + `js/views/ProfileView.js`
- `js/controllers/UserProfileController.js` + `js/views/UserProfileView.js`
- `css/pages/profile.css`

- [ ] **Step 1: `ProfilePage.tsx`**

프로필 이미지 업로드 (`api.postFormData()`), 닉네임/자기소개/배포판 수정 (`api.patch()`). AuthContext `setUser()` 반영.

- [ ] **Step 2: `UserProfilePage.tsx`**

`useParams()`로 id. 프로필 + 평판 로드. 팔로우/차단. 작성글 탭 (PostCard 재활용).

- [ ] **Step 3: 연동 테스트**

- [ ] **Step 4: 커밋**

```bash
git add src/pages/ProfilePage.tsx src/pages/UserProfilePage.tsx
git commit -m "feat: ProfilePage + UserProfilePage 구현"
```

---

## Task 20: nginx 설정 변경 & 최종 확인

**Files:**
- Modify: `nginx.k8s.conf`

- [ ] **Step 1: `nginx.k8s.conf` SPA fallback 수정**

```nginx
location / {
    root /usr/share/nginx/html;
    index index.html;
    try_files $uri $uri/ /index.html;
}
```

API 프록시 설정은 유지.

- [ ] **Step 2: 빌드 확인**

```bash
npm run build
```

- [ ] **Step 3: 프리뷰 확인**

```bash
npx vite preview
```

- [ ] **Step 4: 전체 기능 수동 테스트**

| 기능 | 확인 항목 |
|------|----------|
| 로그인 | 이메일/비밀번호 → 홈 이동 |
| 회원가입 | 폼 제출 → 로그인 페이지 |
| 게시글 목록 | 카드, 정렬, 페이지네이션, 카테고리 |
| 게시글 상세 | 마크다운, 좋아요, 북마크, 공유 |
| 게시글 작성 | 에디터, 카테고리, 태그, 제출 |
| 게시글 수정 | 기존 데이터 로드, 수정 저장 |
| 댓글 | 목록, 작성, 대댓글, 좋아요, 수정, 삭제 |
| 프로필 편집 | 이미지, 닉네임, 자기소개 |
| 타인 프로필 | 정보, 팔로우, 차단 |
| 다크모드 | 토글, 새로고침 유지 |
| 인증 | 새로고침 시 로그인 유지 |
| AuthGuard | /write → /login 리다이렉트 |
| 404 | 잘못된 경로 → NotFoundPage |
| 반응형 | 모바일: BottomTab, Sidebar 숨김 |

- [ ] **Step 5: nginx 설정 커밋**

```bash
git add nginx.k8s.conf
git commit -m "feat: nginx SPA fallback 설정 변경"
```

- [ ] **Step 6: Phase 1 완료 확인**

모든 기능이 정상 동작하면 Phase 1 완료. 기존 MPA 파일(`html/`, `js/`, `css/`)은 이 브랜치에서 유지하고 별도 정리 PR에서 삭제.
