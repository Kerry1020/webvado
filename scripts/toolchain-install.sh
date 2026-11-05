#!/bin/sh
# 安装固定版本的 OSS CAD Suite；先校验官方摘要，再解压。
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
VERSION=20261105
EXPECTED=9e8bcfe983a566e266b868863edde2ffb62fc41f07d99bce89a6b87ab7fc221c
URL=${WEBVADO_TOOLCHAIN_URL:-https://github.com/YosysHQ/oss-cad-suite-build/releases/download/2026-11-05/oss-cad-suite-darwin-arm64-20261105.tgz}
if [ "$(uname -s)-$(uname -m)" != Darwin-arm64 ]; then
  echo 'This pinned installer supports macOS arm64. On other platforms install OSS CAD Suite and set WEBVADO_TOOLCHAIN to its bin directory.' >&2
  exit 1
fi
if [ -e "$ROOT/tools/oss-cad-suite" ]; then
  echo 'tools/oss-cad-suite already exists; refusing to overwrite it.' >&2
  exit 1
fi
WORK=$(mktemp -d "${TMPDIR:-/tmp}/webvado-toolchain.XXXXXX")
trap 'rm -rf "$WORK"' EXIT HUP INT TERM
ARCHIVE=${1:-$WORK/oss-cad-suite-$VERSION.tgz}
if [ "$#" -eq 0 ]; then curl -fL --retry 3 -o "$ARCHIVE" "$URL"; fi
ACTUAL=$(shasum -a 256 "$ARCHIVE" | cut -d ' ' -f 1)
if [ "$ACTUAL" != "$EXPECTED" ]; then
  echo "SHA256 mismatch: $ACTUAL" >&2
  exit 1
fi
tar -xzf "$ARCHIVE" -C "$WORK"
mkdir -p "$ROOT/tools"
mv "$WORK/oss-cad-suite" "$ROOT/tools/oss-cad-suite"
echo "Installed OSS CAD Suite $VERSION (SHA256 $ACTUAL)"
