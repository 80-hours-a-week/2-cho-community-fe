# Frontend — CLAUDE.md

Vanilla JS MPA (Port 8080, Vite 빌드). 상세 아키텍처는 `README.md` 참조.

## Commands

```bash
npm run dev                                   # Vite 개발 서버 (HMR, 클린 URL)
npm run build                                 # 프로덕션 빌드 → dist/
npm run preview                               # 빌드 결과물 로컬 서빙
npx playwright test                           # E2E 전체
npx playwright test tests/e2e/full_flow.spec.js  # 단일 파일
npx playwright test --ui                      # UI 모드
npx playwright test --headed                  # 브라우저 표시
```

## MVC 패턴

- `js/app/`: 페이지별 진입점 (HTML별 1:1 매핑)
- `js/components/`: 재사용 컴포넌트 (`MarkdownEditor.js`)
- `js/controllers/`: 비즈니스 로직, Model과 View 조율
- `js/models/`: API 호출 (ApiService 사용)
- `js/views/`: DOM 렌더링 (정적 메서드)
- `js/services/ApiService.js`: HTTP 클라이언트, Bearer 토큰 관리, 401 시 silent refresh → 자동 재시도 (`_isRetry` 플래그) → 실패 시 `auth:session-expired` 이벤트. 403 `account_suspended` 시 `auth:account-suspended` 이벤트
- `js/utils/dom.js`: `createElement()` — XSS 방지 DOM 생성
- `js/utils/icons.js`: `Icons` — SVG 아이콘 팩토리 (`createElementNS`, `currentColor`로 테마 자동 대응)
- `js/config.js`: `resolveNavPath()` — 클린 URL → HTML 파일 경로 변환. **주의**: `navigation.js`는 존재하지 않음

## 프론트엔드 규칙

### 보안
- **XSS 방지**: `createElement()` 또는 `textContent` 사용 (innerHTML 금지). 유일한 예외: `js/utils/markdown.js`의 `renderMarkdownTo()`/`renderMarkdown()` — `marked` → `DOMPurify.sanitize()` → `<template>.innerHTML`
- **innerHTML 보안 훅**: DOMPurify sanitized HTML도 첫 번째 시도가 차단됨 — 의도된 동작, 두 번째 시도에서 통과

### 아이콘 & CSS
- **아이콘**: `js/utils/icons.js` SVG 팩토리만 사용. 이모지 금지. `stroke="currentColor"` 필수 (`stroke="black"` 금지)
- **CSS 토큰**: `css/variables.css` 60+ 토큰. 하드코딩 금지. import 순서: `variables.css` → `base.css` → `layout.css` → `modules/` → `pages/`
- **`animations.css` button:hover**: `transform: translateY(-2px)`가 모든 `<button>`에 적용. 절대 위치 버튼은 기존 transform과 결합 필수
- **`overflow-x: auto` 주의**: CSS 스펙상 `overflow-y`도 자동 `auto`. 수평 스크롤 컨테이너에 상하 패딩 확보
- **다크 모드**: `variables.css` `:root` 토큰 오버라이드로 21개 CSS 자동 전환

### UI 패턴
- **토스트**: `showToast()` in `helpers.js`가 유일한 진입점. 중복 `.toast` 클래스 정의 금지
- **CustomEvent**: `window.dispatchEvent(new CustomEvent('event:name', { detail }))` — 발신/수신 양쪽 이벤트 이름과 대상(`window`) 일치 필수
- **모달 리스너 정리**: 커스텀 모달은 `cloneNode(true)` + `replaceChild`로 버튼 교체하여 이전 리스너 제거
- **비동기 응답 무효화**: `loadGeneration` 카운터로 stale 응답 무시 (`MainController.js`)
- **낙관적 UI**: 좋아요/북마크는 API 전 즉시 업데이트+롤백. 댓글 좋아요는 서버 새로고침 (`_reloadComments()`)
- **UI 모드 상호 배제**: `CommentController`의 수정/답글 모드는 상호 배타적
- **MentionDropdown 연결**: `PostFormView._initMentionDropdown()`에서 게시글 에디터에 연결. `CommentController.setupInputEvents()`에서 댓글 입력에 연결. 새 textarea에 멘션 추가 시 두 곳 참조
- **md-editor-wrapper overflow**: `position: relative` + `overflow: visible` 설정됨 (MentionDropdown 드롭다운 표시용). `overflow: hidden`으로 되돌리면 드롭다운 잘림
- **댓글 정렬 버튼**: `CommentController._bindSortEvents()`가 `dataset.sort` 값을 동적으로 읽음. 새 정렬 옵션 추가 시 `CommentListView.renderComments()`에 버튼만 추가하면 자동 연동
- **render() 내 addEventListener 금지**: DOM 요소를 재사용하면서 `render()`마다 `addEventListener`하면 핸들러 N중 등록. 플래그(`_bound`)로 1회만 바인딩하거나 이벤트 위임 사용
- **API 응답 경로**: BE `create_response(data={...})` → FE `response.data?.data?.필드`. `extractUploadedImageUrl()` 패턴 참조

### 반응형 & 모바일
- **반응형 CSS**: `css/modules/responsive.css`에 모든 미디어 쿼리 집중. 마지막 모듈로 import. 브레이크포인트: 480px(모바일), 768px(태블릿), `hover: none`(터치)
- **iOS 입력 줌 방지**: `input`/`textarea`/`select`는 `font-size: 16px` 이상 필수
- **viewport-fit=cover**: 모든 HTML viewport 메타 태그에 포함. `env(safe-area-inset-*)` 필요
- **터치 디바이스 hover**: `@media (hover: none) and (pointer: coarse)`로 hover 잔상 제거 + `:active`에 `scale()` 피드백

### Vite & 빌드
- **Vite 빌드**: 22개 HTML MPA 엔트리포인트 + 클린 URL 리라이트. FOUC 인라인 스크립트는 Vite가 변환하지 않음
- **Vite IPv6 바인딩 (macOS)**: `localhost`가 IPv6(`::1`)로만 바인딩 가능. `vite.config.js`에 `host: '127.0.0.1'` 명시

### 초기화 & WebSocket
- **`app/*.js` 진입점 초기화 순서**: `headerController.init()`은 알림 서비스를 백그라운드 시작. `getCurrentUser()` 필요 페이지만 `await headerController.init()`, 나머지는 `await` 없이 호출
- **인증 필요 페이지 `await` 필수**: `myActivity`, `edit_profile`, `password`, `notifications`, `dm`, `dm_list`, `dm_detail` 등 인증 API를 호출하는 페이지는 반드시 `await headerController.init()`. 미 await 시 silent refresh 완료 전 API 호출 → 401 → 이중 refresh → 토큰 회전 충돌로 세션 만료
- **WebSocket 인증 타임아웃**: `AUTH_TIMEOUT`(5초) 적용. `auth_ok` 미수신 시 자동 연결 종료 → 폴링 폴백
- **MPA 인증 타이밍 레이스**: `loginViaUI` 후 `getAccessToken()` 동기 체크가 silent refresh 완료 전 실행 가능. E2E 테스트에서 `page.waitForSelector()` + `page.evaluate()`로 수동 해제

## E2E 테스트

- **`TESTING=true` 필수**: `.env`에 설정. `/v1/test/*` 엔드포인트 활성화
- **회원가입 테스트**: `UPLOAD_DIR`이 로컬에서 쓰기 불가이므로 `page.route(/\/v1\/users\/?$/)` 인터셉트 필수
- **Playwright baseURL**: `127.0.0.1` 사용 (IPv6 문제 방지)
- **MySQL CURRENT_TIMESTAMP 정밀도**: 같은 초 내 INSERT+UPDATE 시 `updated_at == created_at`이 되어 "(수정됨)" 배지 미표시. 수정 테스트에서 `setTimeout(1000)` 대기 필요

## 새 페이지 추가 체크리스트

1. HTML 파일
2. `js/app/*.js` 진입점
3. `js/controllers/*Controller.js`
4. `js/models/*Model.js` (필요시)
5. `js/views/*View.js` (필요시)
6. `css/modules/*.css`
7. `constants.js`의 `NAV_PATHS` + `HTML_PATHS`
8. `vite.config.js`의 `rollupOptions.input` + `rewrites`
9. CloudFront Function `routes` 맵 동기화 (인프라)

## 코드 스타일

- **뒤로가기 버튼**: 진입 페이지 외 모든 페이지에 `<button id="back-btn" class="back-button">` + SVG chevron
- **관리자 페이지**: `/admin/*` 경로는 `vite.config.js` rewrites + `constants.js` HTML_PATHS + CloudFront Function routes 3곳 동기화
