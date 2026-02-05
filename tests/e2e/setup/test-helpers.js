// tests/e2e/setup/test-helpers.js
// E2E 테스트용 헬퍼 - ErrorBoundary를 전역으로 노출

import ErrorBoundary from '../../../js/utils/ErrorBoundary.js';

// 테스트를 위해 ErrorBoundary를 window 객체에 노출
window.ErrorBoundary = ErrorBoundary;

export { ErrorBoundary };
