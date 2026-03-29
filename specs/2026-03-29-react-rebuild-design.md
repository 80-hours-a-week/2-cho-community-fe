# React 프론트엔드 재구축 설계

## 개요

Camp Linux 커뮤니티 프론트엔드를 Vanilla JS MPA에서 React SPA로 재구축합니다.

### 동기
- 학습/포트폴리오 목적 (React 첫 프로젝트)

### 범위
- **핵심 (Phase 1)**: 인증 + 게시판(CRUD + 댓글) + 프로필
- **확장 (Phase 2+)**: 알림 → DM → 위키 → 패키지 → 관리자 (점진적 추가)

### 제약
- 기존 디자인(CSS) 유지
- 기존 백엔드 API 변경 없음
- `2-cho-community-fe/` 레포에서 새 브랜치로 작업

---

## 기술 스택

| 항목 | 선택 | 이유 |
|------|------|------|
| 빌드 | Vite | 기존 FE에서 사용 중, 빠른 HMR |
| UI | React 19 | 학습 목표 |
| 언어 | TypeScript (.tsx) | props 타입 정의, 업계 표준 |
| Vite 플러그인 | @vitejs/plugin-react | JSX 변환 + React Fast Refresh (필수) |
| 라우팅 | React Router v7 (library 모드) | SPA 클라이언트 라우팅. framework 모드(파일 기반 라우팅) 아님 |
| 상태 관리 | useState / useContext | 최소 시작, 필요 시 확장 |
| CSS | 기존 CSS 그대로 이전 | 디자인 유지, 학습 부담 감소 |
| 마크다운 | marked + DOMPurify + highlight.js | 기존 의존성 유지 |
| 아이콘 | lucide-react | 기존 lucide의 React 버전 |

---

## 디렉토리 구조 (Type-based)

```
2-cho-community-fe/
├── index.html                 # 단일 SPA 엔트리
├── vite.config.ts
├── tsconfig.json
├── package.json
├── src/
│   ├── main.tsx               # React DOM 마운트 포인트
│   ├── App.tsx                # Router + 전역 Provider
│   ├── components/            # 재사용 UI 컴포넌트
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── BottomTab.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   ├── Pagination.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── PostCard.tsx
│   │   ├── PostForm.tsx
│   │   ├── PostActionBar.tsx
│   │   ├── CommentList.tsx
│   │   ├── CommentForm.tsx
│   │   ├── MarkdownEditor.tsx
│   │   └── MarkdownRenderer.tsx
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── SignupPage.tsx
│   │   ├── PostListPage.tsx
│   │   ├── PostDetailPage.tsx
│   │   ├── PostWritePage.tsx
│   │   ├── PostEditPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── UserProfilePage.tsx
│   │   └── NotFoundPage.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useApi.ts
│   ├── services/
│   │   └── api.ts
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── constants/
│   │   ├── endpoints.ts
│   │   ├── routes.ts
│   │   └── messages.ts
│   ├── types/
│   │   ├── auth.ts
│   │   ├── post.ts
│   │   └── common.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   └── validators.ts
│   └── styles/                # 기존 CSS 이전
│       ├── variables.css
│       ├── base.css
│       ├── layout.css
│       ├── style.css
│       ├── modules/
│       └── pages/
├── public/
└── nginx.k8s.conf             # SPA용 수정
```

---

## 라우팅

### 라우트 정의

```tsx
<Routes>
  {/* 인증 불필요 — 독립 레이아웃 */}
  <Route path="/login" element={<LoginPage />} />
  <Route path="/signup" element={<SignupPage />} />

  {/* 공통 레이아웃 (Header + Sidebar + BottomTab) */}
  <Route element={<MainLayout />}>
    {/* 인증 불필요 (읽기) */}
    <Route path="/" element={<PostListPage />} />
    <Route path="/detail/:id" element={<PostDetailPage />} />
    <Route path="/user-profile/:id" element={<UserProfilePage />} />

    {/* 인증 필요 */}
    <Route element={<AuthGuard />}>
      <Route path="/write" element={<PostWritePage />} />
      <Route path="/edit/:id" element={<PostEditPage />} />
      <Route path="/edit-profile" element={<ProfilePage />} />
    </Route>
  </Route>

  <Route path="*" element={<NotFoundPage />} />
</Routes>
```

### URL 설계 변경

| 기존 (MPA) | 새 (React SPA) |
|-------------|----------------|
| `/detail?id=123` | `/detail/123` |
| `/edit?id=123` | `/edit/123` |
| `/user-profile?id=5` | `/user-profile/5` |
| `/?sort=latest&page=1` | `/?sort=latest&page=1` (유지) |

### 레이아웃 구조

- **MainLayout**: Header + Sidebar + `<Outlet />` + BottomTab
- **AuthGuard**: `useAuth()`의 `isLoading`과 `isAuthenticated`를 확인. `isLoading` 중이면 `<LoadingSpinner />`표시, 로딩 완료 후 미인증이면 `<Navigate to="/login" />`으로 리다이렉트, 인증됐으면 `<Outlet />`으로 자식 라우트 렌더링
- 로그인/회원가입은 MainLayout 밖 (독립 레이아웃)

---

## 인증

### 방식 (기존 유지)
- Access Token: 메모리 저장 (XSS 방지)
- Refresh Token: HttpOnly 쿠키 (`credentials: 'include'`)
- 401 시 자동 갱신 (thundering herd 방지)

### AuthContext

```typescript
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;  // 회원가입 후 수동 설정용
}
```

### 주요 API 엔드포인트

- 로그인: `POST /v1/auth/session` (JSON) — access_token 응답
- 로그아웃: `DELETE /v1/auth/session`
- 토큰 갱신: `POST /v1/auth/token/refresh` (쿠키 기반)
- 내 정보: `GET /v1/auth/me`
- 회원가입: `POST /v1/users/` (**multipart/form-data** — Form + File)

### 회원가입 흐름

SignupPage에서 `api.postFormData()`으로 `POST /v1/users/` 호출 → 성공 시 로그인 페이지로 이동 (자동 로그인 없음, 이메일 인증 필요할 수 있음).

### 앱 시작 인증 흐름

1. AuthProvider 마운트
2. Refresh Token 쿠키로 `POST /v1/auth/token/refresh`
3. 성공 시: Access Token 메모리 저장 + `GET /v1/auth/me` → user 설정
4. 실패 시: user = null (비로그인)
5. isLoading = false → 앱 렌더링 시작

### API 서비스 (services/api.ts)

- `setAccessToken()` / `getAccessToken()` — 모듈 스코프 변수
- `request()` — Authorization 헤더 주입, trailing slash 보장, 401 자동 refresh
- `api.get()`, `api.post()`, `api.put()`, `api.patch()`, `api.delete()` — JSON 메서드
- `api.postFormData()` — `multipart/form-data` 전송 (회원가입, 이미지 업로드용)

---

## 게시판

### 페이지

| 페이지 | URL | API |
|--------|-----|-----|
| PostListPage | `/` | `GET /v1/posts/` |
| PostDetailPage | `/detail/:id` | `GET /v1/posts/{id}/` + `GET /v1/posts/{id}/comments/` |
| PostWritePage | `/write` | `POST /v1/posts/` |
| PostEditPage | `/edit/:id` | `GET /v1/posts/{id}/` + `PUT /v1/posts/{id}/` |

### 컴포넌트

- **PostCard**: 목록에서 개별 게시글 카드
- **PostForm**: 작성/수정 공유 폼 (`initialData` prop으로 구분)
- **PostActionBar**: 좋아요/북마크/공유/신고 버튼
- **CommentList**: 댓글 목록 + 대댓글 (재귀 렌더링)
- **CommentForm**: 댓글 입력/수정 폼
- **MarkdownEditor**: 마크다운 입력 (toolbar + textarea + 미리보기)
- **MarkdownRenderer**: marked + DOMPurify + highlight.js 렌더링
- **Pagination**: 페이지 번호 네비게이션

### PostListPage 상태

- `posts: Post[]` — 게시글 목록
- `page`, `sort`, `categoryId` — URL 쿼리 파라미터 (`useSearchParams`)
- `isLoading`, `error` — 로딩/에러 상태

### PostDetailPage 상태

- `post: Post | null` — 게시글 데이터
- `comments: Comment[]` — 댓글 목록
- `isLiked`, `isBookmarked` — 사용자 상호작용

---

## 프로필

### ProfilePage (내 프로필 편집, `/edit-profile`)

- 프로필 이미지 업로드, 닉네임, 자기소개, 배포판 플레어
- API: `PATCH /v1/users/me/` + `POST /v1/users/profile/image/`

### UserProfilePage (타인 프로필, `/user-profile/:id`)

- 프로필 정보 + 팔로우/차단/DM 버튼
- 탭: 작성글 | 댓글 | 뱃지
- API:
  - 프로필: `GET /v1/users/{id}/`
  - 평판: `GET /v1/users/{id}/reputation/`
  - 작성글 탭: `GET /v1/posts/?author_id={id}`
  - 댓글 탭: `GET /v1/users/{id}/comments/` (확장 시 구현)
  - 뱃지 탭: `GET /v1/users/{id}/badges/`

---

## 공통 컴포넌트

| 컴포넌트 | 역할 |
|---------|------|
| Header | 로고, 검색, 테마 토글, 알림, 프로필 메뉴 |
| Sidebar | 카테고리 목록, 현재 선택 표시 |
| BottomTab | 모바일 하단 네비게이션 |
| Modal | 확인/취소 다이얼로그, 신고 폼 등 |
| Toast | 성공/에러 알림 — 아래 Toast 구현 패턴 참고 |
| LoadingSpinner | 데이터 로딩 표시 |

### ThemeContext

```typescript
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}
```

초기값: localStorage → OS 설정 → 'light' (기존 ThemeService 로직 유지)

`toggleTheme()`은 React state 변경과 함께 반드시 `document.documentElement.setAttribute('data-theme', theme)`도 호출해야 함. 기존 CSS가 `[data-theme="dark"]` 선택자에 의존하기 때문.

### Toast 구현 패턴

`utils/toast.ts`에 싱글턴 구독 패턴으로 구현:

```typescript
// utils/toast.ts
type ToastListener = (message: string, type: 'success' | 'error') => void;
let listener: ToastListener | null = null;

export function onToast(fn: ToastListener) { listener = fn; }
export function showToast(message: string, type: 'success' | 'error') {
  listener?.(message, type);
}
```

- `Toast.tsx` 컴포넌트가 마운트 시 `onToast()`로 구독 → 메시지 수신 시 렌더링
- `App.tsx`에 `<Toast />` 한 번만 배치
- `services/api.ts` 등 비-React 코드에서도 `showToast()` 호출 가능

---

## CSS 이전 전략

1. 기존 `css/` 디렉토리를 `src/styles/`로 복사
2. `src/main.tsx`에서 전역 import (`import './styles/style.css'`)
3. CSS Modules 등 새 기술 도입하지 않음
4. 기존 클래스명을 React 컴포넌트의 `className`에 그대로 사용

---

## nginx 변경 (배포)

기존 MPA용 개별 라우트 매핑을 SPA fallback으로 교체:

```nginx
location / {
    try_files $uri /index.html;
}
```

---

## 점진적 확장 계획

| 순서 | 기능 | 주요 추가 사항 |
|------|------|--------------|
| 1 | 알림 | NotificationPage, WebSocketService |
| 2 | DM | DMListPage, DMDetailPage, WebSocket 채팅 |
| 3 | 위키 | WikiListPage, WikiDetailPage, 리비전/diff |
| 4 | 패키지 리뷰 | PackageListPage, PackageDetailPage |
| 5 | 관리자 | AdminDashboardPage, AdminReportsPage |
| 6 | 내 활동/뱃지 | MyActivityPage, BadgesPage |

확장을 위해 핵심 단계에서 미리 고려할 것:
- AuthContext `user` 타입에 `role: 'user' | 'admin'` 포함
- `api.ts`를 깔끔하게 유지하여 WebSocketService 추가가 자연스럽도록
- 사용하지 않는 라우트/컴포넌트를 미리 만들지 않음 (YAGNI)
