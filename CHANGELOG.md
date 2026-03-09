# Changelog

## 2026-03 (Mar)

- **03-09: 팔로잉 피드 + 연관 게시글 UI**
  - 팔로잉 피드: 게시글 목록에 "팔로잉" 토글 버튼 (로그인 시만 표시, 기존 정렬과 조합 가능)
  - 연관 게시글: 상세 페이지에 관련 게시글 섹션 (태그/카테고리 기반, lazy load, 0건이면 숨김)
  - 팔로잉 빈 상태 메시지: "팔로우한 사용자의 게시글이 여기에 표시됩니다."

- **03-08: DM 쪽지 기능**
  - DM 대화 목록 (`dm_list.html`) + 상세 페이지 (`dm_detail.html`)
  - 프로필에서 "메시지 보내기" 버튼, 헤더 DM 아이콘 + 읽지 않은 배지
  - MarkdownEditor 컴팩트 모드 (5버튼), WebSocket `type: "dm"` 실시간 수신

- **03-06: 투표 생성/참여 UI**
  - 게시글 작성 시 "투표 추가" 토글 — 질문, 동적 옵션(2~10개), 만료일 입력
  - 게시글 상세: 미투표 시 라디오 버튼 + 투표 버튼, 투표 후 수평 바 차트 결과
  - 만료된 투표는 결과만 표시, 총 투표수 + 만료일 정보

- **03-06: 관리자 대시보드 페이지**
  - `/admin/dashboard` 신규 페이지 (비관리자 리다이렉트)
  - 요약 통계 카드 (총 사용자/게시글/댓글/오늘 가입자)
  - 30일 일별 통계 테이블, 사용자 관리 (검색 + 무한 스크롤 + 정지/해제)

- **03-06: 팔로우/팔로잉 UI**
  - 타 사용자 프로필에 팔로우/언팔로우 버튼 (본인 프로필 숨김)
  - 프로필 stats에 팔로워/팔로잉 수 표시
  - 알림 페이지에서 팔로우 알림 타입 (새 게시글 작성 알림) 렌더링

- **03-04: 마크다운 에디터**
  - 렌더링: `marked`(GFM) + `DOMPurify`(XSS 방지) + `highlight.js`(구문 강조 9언어)
  - 에디터: `MarkdownEditor` 컴포넌트 — 풀 모드(게시글, 14버튼 툴바) / 컴팩트 모드(댓글, 5버튼)
  - 미리보기 토글, Ctrl+B/I 단축키, `breaks: true` 기존 플레인텍스트 호환
  - CSS: 코드 하이라이팅 15 토큰 + 다크 모드 대응, `markdown.css` 신규

- **03-04: 프론트엔드 계정 정지 UI**
  - 로그인 차단: 정지된 사용자 로그인 시 403 → 해제 예정일 + 사유 인라인 표시
  - 글로벌 정지 감지: `ApiService` 403 `account_suspended` → `auth:account-suspended` 이벤트 → 로그인 페이지 리다이렉트 (관리자 API 제외)
  - 관리자 프로필 정지: 타 사용자 프로필에서 기간(일) + 사유 입력 모달, 정지/해제 토글
  - 신고 처리 연동: 관리자 신고 처리 시 체크박스로 작성자 동시 정지 (`suspend_days`)
  - 정지 배지: 정지된 사용자 프로필에 "정지 중 (날짜까지)" 배지 표시

- **03-04: Vite 빌드 시스템 도입**
  - `vite.config.js` 신규: 14개 HTML MPA 엔트리포인트 + 클린 URL 리라이트 플러그인
  - `package.json` 스크립트 전환: `serve` → `vite` (dev/build/preview)
  - Dockerfile 멀티 스테이지 빌드: `node:20-alpine` → `nginx:alpine`
  - `nginx.conf`에 `/assets/` 장기 캐싱 규칙 추가 (해시된 에셋, 1년 만료)
  - CD 워크플로우: Node.js 빌드 스텝 + `dist/` S3 sync

- **03-03: CSS 디자인 토큰 시스템 (Design System Cleanup Stage 1)**
  - `css/variables.css` 신규: 60+ 디자인 토큰 (색상, 타이포그래피, 간격, 반경, 그림자, z-index, 트랜지션)
  - 21개 CSS 파일 하드코딩 값 → `var()` 참조 전환 (200+ 교체)
  - `helpers.js` 내 하드코딩 색상 → CSS 변수 참조로 변경
  - 토스트 시스템 통합: `modals.css` 중복 `.toast` 제거 → `toast.css`의 `#toast` 단일 시스템

- **03-02: 핵심 커뮤니티 기능 (북마크, 댓글 좋아요, 공유, 다중 이미지, 사용자 차단, 인기 게시글)**
  - 북마크: 게시글 상세 stat-box + 낙관적 UI 토글, 내 활동 > 북마크 탭 추가
  - 댓글 좋아요: 댓글/대댓글 ♡ 버튼 + 카운트, 서버 리프레시 방식 (트리 재구축)
  - 공유: 모바일 Web Share API + 데스크톱 클립보드 복사, 토스트 피드백
  - 다중 이미지: 게시글 작성/수정 시 최대 5장 업로드, 상세 갤러리 뷰, `image_url` 하위 호환
  - 사용자 차단: 게시글 상세 차단/해제 버튼, 차단된 사용자 게시글·댓글 숨김
  - 인기순 정렬: "핫" 정렬 옵션 추가 (좋아요×3 + 댓글×2 + 조회수×0.5, 시간 감쇠)
  - 카드 UI 확장: 북마크 카운트 표시, 정렬 버튼에 "핫" 추가

- **03-02: 관리자 역할, 신고, 카테고리, 게시글 고정 UI**
  - 카테고리 탭: 게시글 목록 상단 가로 스크롤 탭, 카테고리별 필터링
  - 게시글 작성/수정: 카테고리 select 드롭다운, 공지사항은 관리자만 선택 가능
  - 신고: 게시글/댓글 신고 버튼, 사유 선택 모달 (4종: 스팸/욕설/부적절/기타)
  - 관리자 기능: 타인 게시글/댓글 삭제, 고정/해제, 신고 관리 페이지 (`/admin/reports`)
  - 고정 배지 + 카테고리 배지 UI, 드롭다운에 관리자 메뉴

- **03-02: 이메일 인증, 알림, 내 활동, 사용자 프로필 UI**
  - 이메일 인증 페이지: 토큰 검증 결과 표시, 성공 시 로그인 페이지 리다이렉트
  - 알림 페이지: 무한 스크롤 목록, 읽음/삭제 처리, 헤더 벨 아이콘 + 뱃지 (30초 폴링)
  - 내 활동 페이지: 탭 UI (내가 쓴 글/댓글/좋아요한 글), 탭별 무한 스크롤
  - 사용자 프로필: 공개 프로필 + 작성 글 목록, 닉네임 클릭으로 이동 (게시글 목록/상세/댓글)
  - 헤더 드롭다운에 "내 활동" 메뉴 추가, `PostModel.getPosts()`에 `authorId` 필터 추가

- **03-08: 실시간 알림 (WebSocket)**
  - `js/services/WebSocketService.js`: 연결 생명주기 싱글턴 (인증, 지수 백오프 재연결, heartbeat)
  - `HeaderController.js`: WebSocket 우선 연결, 실패 시 기존 ETag 폴링 자동 폴백
  - `config.js`: `WS_BASE_URL` 추가 (로컬 `ws://`, 프로덕션 `wss://`)
  - 실시간 알림 수신 → 즉시 뱃지 업데이트 + 토스트 표시

## 2026-02 (Feb)

- **02-28: 뒤로가기 버튼 UI 통일**
  - `user_signup.html`: `<a>` 텍스트 `<` → `<button>` SVG chevron 통일 (기존 JS 바인딩 미작동 수정)
  - `user_find_account.html`: 누락된 뒤로가기 버튼 추가

- **02-28: 계정 찾기 페이지 (이메일 찾기 + 비밀번호 재설정)**
  - `user_find_account.html`: 탭 UI (이메일 찾기 / 비밀번호 찾기)
  - 이메일 찾기: 닉네임 입력 → 마스킹 이메일 결과 표시
  - 비밀번호 재설정: 이메일 입력 → 임시 비밀번호 발송 토스트
  - MVC 패턴: `FindAccountController` + `FindAccountView`, 429 Rate Limit 처리

- **02-28: 전체 코드 리뷰 기반 버그 수정**
  - Silent refresh: 401 시 토큰 갱신 후 원래 요청 자동 재시도 (`_isRetry` 플래그로 무한 루프 방지)
  - 이미지 미리보기: `post_write.html`, `post_edit.html`에 누락된 `#image-preview` 요소 추가
  - Detail 페이지 이중 인증 요청 제거 (HeaderController에서 유저 전달)
  - Dead code 정리: `escapeHtml()`, `CommentModel.getComments()`, `FormValidator.updateButtonState()` 제거

- **02-27: GitHub Actions CD 파이프라인 구축**
  - `deploy-frontend.yml`: `workflow_dispatch` → Vite build (`npm ci && npm run build`) → `dist/` S3 sync → CloudFront invalidation
  - OIDC 인증 (GitHub → AWS IAM Role), 환경 선택 (dev/staging/prod)
  - Vite 빌드 결과(`dist/`)를 S3에 동기화, 해시된 에셋으로 CDN 장기 캐싱

- **02-25: JWT 인증 전환**
  - 세션 기반 → JWT (Access Token 30분 + Refresh Token 7일)
  - `ApiService.js`: Bearer 토큰 관리, silent refresh, thundering herd 보호
  - CSRF 관련 코드 완전 제거 (Bearer 토큰이 CSRF 방어 역할)

- **02-09 ~ 12: 보안 강화 + 개발 환경 개선**
  - XSS 정책 100% 준수: innerHTML 완전 제거, `escapeCssUrl` 전면 적용, URL sanitization
  - CSRF Double Submit Cookie 구현 (이후 JWT 전환으로 제거)
  - Python 의존성 제거, `npm serve` 마이그레이션 (Port 8080)

- **02-02 ~ 06: 코드 품질 + 성능**
  - `ErrorBoundary` 도입 (지수 백오프 재시도, GET 자동 재시도)
  - 애니메이션 모듈 (스켈레톤, 스피너, 토스트, 좋아요 heartPop)
  - Lazy Loading, debounce, 댓글 부분 업데이트
  - 코드 리팩토링: `NAV_PATHS`/`UI_MESSAGES` 상수 통합, 중복 제거

## 2026-01 (Jan)

- **01-28 ~ 30: 안정화 + UX**
  - MVC 패턴 강화, 이미지 표시 버그 수정
  - 회원탈퇴 모달, 토스트 알림 (`alert()` 제거)
  - 무한 스크롤 버그 수정, 401 리다이렉션

- **01-21 ~ 25: 초기 구현**
  - 전체 페이지 구현 (로그인, 회원가입, 메인, 상세, 작성, 수정, 프로필, 비밀번호)
  - MVC 패턴 도입 (Model/View/Controller 분리)
  - 무한 스크롤, 좋아요, 댓글 CRUD, 이미지 업로드
