#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: DEPLOY_HOST=host DEPLOY_USER=user DEPLOY_PATH=/path [DEPLOY_KEY=/path/to/key] ./deploy.sh"
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

HOST=${DEPLOY_HOST:-}
USER=${DEPLOY_USER:-}
DEST=${DEPLOY_PATH:-}
KEY=${DEPLOY_KEY:-}

[ -n "$HOST" ] || usage
[ -n "$USER" ] || usage
[ -n "$DEST" ] || usage

echo "Generating a fresh frontend production bundle..."
if [ ! -f "$FRONTEND_DIR/package.json" ]; then
  echo "frontend/package.json not found in $FRONTEND_DIR" >&2
  exit 2
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required to build the frontend bundle." >&2
  exit 2
fi
(
  cd "$FRONTEND_DIR"
  npm ci --legacy-peer-deps
  npm run build -- --no-sourcemap
)

if [ ! -d "$BUILD_DIR" ] || [ ! -f "$BUILD_DIR/index.html" ]; then
  echo "frontend/build/index.html still not found after npm build" >&2
  exit 2
fi

echo "Packaging frontend build..."
TARFILE="$REPO_ROOT/wagesofwar_build_$(date +%Y%m%d%H%M%S).tar.gz"
TARBASENAME="$(basename "$TARFILE")"
trap 'rm -f "$TARFILE"' EXIT
tar -czf "$TARFILE" -C "$FRONTEND_DIR" build
CHECKSUM="$(sha256sum "$TARFILE" | awk '{print $1}')"
RELEASE_NAME="$(basename "$TARFILE" .tar.gz)"
REMOTE_TAR="$DEST/$(basename "$TARFILE")"
REMOTE_RELEASE="$DEST/.releases/$RELEASE_NAME"

echo "Uploading $TARFILE to $USER@$HOST:$DEST"
if [ -n "$KEY" ]; then
  scp -i "$KEY" "$TARFILE" "$USER@$HOST:$DEST/"
  ssh -i "$KEY" "$USER@$HOST" "set -eu; mkdir -p '$REMOTE_RELEASE'; printf '%s  %s\\n' '$CHECKSUM' '$REMOTE_TAR' | sha256sum -c -; tar -xzf '$REMOTE_TAR' -C '$REMOTE_RELEASE'; ln -sfn '$REMOTE_RELEASE/build' '$DEST/current'; rm -f '$REMOTE_TAR'"
else
  scp "$TARFILE" "$USER@$HOST:$DEST/"
  ssh "$USER@$HOST" "set -eu; mkdir -p '$REMOTE_RELEASE'; printf '%s  %s\\n' '$CHECKSUM' '$REMOTE_TAR' | sha256sum -c -; tar -xzf '$REMOTE_TAR' -C '$REMOTE_RELEASE'; ln -sfn '$REMOTE_RELEASE/build' '$DEST/current'; rm -f '$REMOTE_TAR'"
fi

echo "Upload complete. Connect to host and extract:"
echo "ssh $USER@$HOST 'cd $DEST && tar -xzf $TARBASENAME && rm $TARBASENAME'"

echo "Done."
