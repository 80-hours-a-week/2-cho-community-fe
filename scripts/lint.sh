#!/usr/bin/env bash
# 코드 품질 검사 스크립트
set -euo pipefail

echo "=== ESLint ==="
npx eslint js/

echo ""
echo "=== TypeScript Check ==="
npx tsc --noEmit

echo ""
echo "=== Vite Build Check ==="
npx vite build --mode production > /dev/null 2>&1

echo ""
echo "✅ All quality checks passed"
