#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
npm run check
npm run test:e2e
