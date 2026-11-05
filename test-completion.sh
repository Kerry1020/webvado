#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
# 实际测试入口；文件存在或 HTTP 200 不代表功能完成。
npm run check
npm test
npm run test:integration
npm run test:e2e
