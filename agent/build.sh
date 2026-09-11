#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: ./agent/build.sh [--no-install] [--deploy] [--watch]"
  echo "If DEPLOY_HOST, DEPLOY_USER, and DEPLOY_PATH are set, the script deploys automatically."
  exit 1
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -d "$PWD/frontend" ] && [ -f "$PWD/frontend/package.json" ]; then
  REPO_ROOT="$PWD"
else
  REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
fi
FRONTEND_DIR="$REPO_ROOT/frontend"
BUILD_DIR="$FRONTEND_DIR/build"
SKIP_INSTALL=false
FORCE_DEPLOY=false
WATCH=false

for arg in "$@"; do
  case "$arg" in
    --help|-h)
      usage
      ;;
    --no-install)
      SKIP_INSTALL=true
      ;;
    --deploy)
      FORCE_DEPLOY=true
      ;;
    --watch)
      WATCH=true
      ;;
  esac
done

if [ ! -f "$FRONTEND_DIR/package.json" ]; then
  echo "frontend/package.json not found in $FRONTEND_DIR" >&2
  exit 2
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required to build the frontend bundle." >&2
  exit 2
fi

ensure_frontend_dependencies() {
  local package_lock="$FRONTEND_DIR/package-lock.json"

  if [ "$SKIP_INSTALL" = "true" ]; then
    return 0
  fi

  if [ -f "$package_lock" ]; then
    npm ci --legacy-peer-deps --omit=optional
  else
    npm install --legacy-peer-deps
  fi
}

build_frontend() {
  echo "Preparing frontend production build..."
  (
    cd "$FRONTEND_DIR"
    ensure_frontend_dependencies
    npm run build -- --no-sourcemap
  )
}

if [ "$WATCH" = "true" ] || [ "$FORCE_DEPLOY" = "true" ] || [ ! -d "$BUILD_DIR" ] || [ ! -f "$BUILD_DIR/index.html" ]; then
  build_frontend
fi

if [ ! -d "$BUILD_DIR" ] || [ ! -f "$BUILD_DIR/index.html" ]; then
  echo "Frontend build did not produce $BUILD_DIR/index.html" >&2
  exit 2
fi

HOST="${DEPLOY_HOST:-}"
USER="${DEPLOY_USER:-}"
DEST="${DEPLOY_PATH:-}"
KEY="${DEPLOY_KEY:-}"

if [ "$FORCE_DEPLOY" = "true" ] && { [ -z "$HOST" ] || [ -z "$USER" ] || [ -z "$DEST" ]; }; then
  echo "--deploy requires DEPLOY_HOST, DEPLOY_USER, and DEPLOY_PATH." >&2
  exit 2
fi

deploy_once() {
  local checksum remote_dir
  checksum="$(sha256sum "$TARFILE" | awk '{print $1}')"
  remote_dir="$DEST/.releases/$(basename "$TARFILE" .tar.gz)"

  echo "Uploading $(basename "$TARFILE") to $USER@$HOST:$DEST"
  if [ -n "$KEY" ]; then
    scp -i "$KEY" "$TARFILE" "$USER@$HOST:$DEST/"
    ssh -i "$KEY" "$USER@$HOST" "mkdir -p '$remote_dir' && sha256sum '$DEST/$(basename "$TARFILE")' | grep -q '$checksum' && tar -xzf '$DEST/$(basename "$TARFILE")' -C '$remote_dir' && ln -sfn '$remote_dir/build' '$DEST/current' && rm '$DEST/$(basename "$TARFILE")'"
  else
    scp "$TARFILE" "$USER@$HOST:$DEST/"
    ssh "$USER@$HOST" "mkdir -p '$remote_dir' && sha256sum '$DEST/$(basename "$TARFILE")' | grep -q '$checksum' && tar -xzf '$DEST/$(basename "$TARFILE")' -C '$remote_dir' && ln -sfn '$remote_dir/build' '$DEST/current' && rm '$DEST/$(basename "$TARFILE")'"
  fi
  rm -f "$TARFILE"
  echo "Deployment verified and activated at $DEST/current"
}

if [ "$FORCE_DEPLOY" = "true" ] || { [ -n "$HOST" ] && [ -n "$USER" ] && [ -n "$DEST" ]; }; then
  if ! command -v scp >/dev/null 2>&1 || ! command -v ssh >/dev/null 2>&1; then
    echo "scp and ssh are required for deployment." >&2
    exit 2
  fi
  echo "Packaging frontend build for deployment..."
  TARFILE="$REPO_ROOT/wagesofwar_build_$(date +%Y%m%d%H%M%S).tar.gz"
  tar -czf "$TARFILE" -C "$FRONTEND_DIR" build
  deploy_once
  if [ "$WATCH" = "true" ]; then
    echo "Watching frontend source for changes. Press Ctrl-C to stop."
    last_signature="$(find "$FRONTEND_DIR/src" "$FRONTEND_DIR/public" -type f -printf '%T@ %p\n' 2>/dev/null | sha256sum | awk '{print $1}')"
    while true; do
      current_signature="$(find "$FRONTEND_DIR/src" "$FRONTEND_DIR/public" -type f -printf '%T@ %p\n' 2>/dev/null | sha256sum | awk '{print $1}')"
      if [ "$current_signature" != "$last_signature" ]; then
        build_frontend
        TARFILE="$REPO_ROOT/wagesofwar_build_$(date +%Y%m%d%H%M%S).tar.gz"
        tar -czf "$TARFILE" -C "$FRONTEND_DIR" build
        deploy_once
        last_signature="$current_signature"
      fi
      sleep 2
    done
  fi
else
  echo "Frontend build ready: $BUILD_DIR"
fi
