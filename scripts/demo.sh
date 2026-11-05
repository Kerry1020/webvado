#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
# 先启动 npm start；仅新建示例，不覆盖任何已有工程。
exec node scripts/demo.js "$@"
