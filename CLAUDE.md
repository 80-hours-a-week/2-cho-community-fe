# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vanilla JavaScript 프론트엔드 for AWS AI School 2기 커뮤니티 포럼 "아무 말 대잔치". FastAPI로 정적 파일을 서빙하며, 별도의 FastAPI 백엔드(Port 8000)와 통신합니다.

## Commands

```bash
# 개발 서버 실행 (Port 8080)
source .venv/bin/activate
uvicorn main:app --reload --port 8080

# E2E 테스트 (백엔드 + 프론트엔드 실행 상태에서)
npx playwright test

# 단일 E2E 테스트 파일 실행
npx playwright test tests/e2e/full_flow.spec.js
```

## Architecture

### MVC 패턴 (엄격히 준수)

```
js/
├── app/           # 진입점 - HTML별 초기화 (예: main.js → post_list.html)
├── controllers/   # 비즈니스 로직, Model과 View 조율
├── models/        # API 호출 담당 (ApiService 사용)
├── views/         # DOM 조작 및 렌더링
├── services/      # ApiService (HTTP 클라이언트)
├── utils/         # formatters, validators, Logger, dom 헬퍼
├── config.js      # API_BASE_URL 설정
└── constants.js   # API_ENDPOINTS, UI_MESSAGES, NAV_PATHS
```

### 데이터 흐름

1. `js/app/*.js` - DOMContentLoaded에서 Controller 초기화
2. Controller가 Model 호출 → Model이 ApiService로 API 요청
3. Controller가 결과를 View에 전달 → View가 DOM 업데이트

### 주요 컴포넌트

- **ApiService** (`js/services/ApiService.js`): 모든 HTTP 요청 처리. 401 에러 시 `auth:session-expired` 이벤트 발생
- **createElement** (`js/utils/dom.js`): XSS 방지를 위한 안전한 DOM 생성 (textContent 사용)
- **Logger** (`js/utils/Logger.js`): `console.log` 대신 사용

### 파일 네이밍

- JS: `PascalCase` (클래스), `camelCase` (파일)
- HTML: `snake_case` (예: `post_list.html`, `user_login.html`)

## Key Files

- `js/config.js`: 백엔드 API URL 설정 (`API_BASE_URL`)
- `js/constants.js`: API 엔드포인트, UI 메시지 상수
- `main.py`: FastAPI 라우팅 (HTML 파일 서빙)
- `playwright.config.js`: E2E 테스트 설정 (baseURL: `http://127.0.0.1:8080`)

## Development Notes

- 모든 Model/View/Controller 메서드는 `static`으로 구현
- 무한 스크롤: `IntersectionObserver` 사용 (MainController)
- 사용자 입력 렌더링 시 반드시 `createElement` 또는 `textContent` 사용 (innerHTML 금지)
