#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: DEPLOY_HOST=host DEPLOY_USER=user DEPLOY_PATH=/path [DEPLOY_KEY=/path/to/key] ./deploy.sh"
  exit 1
}

HOST=${DEPLOY_HOST:-}
USER=${DEPLOY_USER:-}
DEST=${DEPLOY_PATH:-}
KEY=${DEPLOY_KEY:-}

[ -n "$HOST" ] || usage
[ -n "$USER" ] || usage
[ -n "$DEST" ] || usage

echo "Packaging frontend build..."
if [ -d frontend/build ]; then
  TARFILE="wagesofwar_build_$(date +%Y%m%d%H%M%S).tar.gz"
  tar -czf "$TARFILE" -C frontend build
else
  echo "frontend/build not found — please run the frontend build first." >&2
  exit 2
fi

echo "Uploading $TARFILE to $USER@$HOST:$DEST"
if [ -n "$KEY" ]; then
  scp -i "$KEY" "$TARFILE" "$USER@$HOST:$DEST/"
else
  scp "$TARFILE" "$USER@$HOST:$DEST/"
fi

echo "Upload complete. Connect to host and extract:"
echo "ssh $USER@$HOST 'cd $DEST && tar -xzf $TARFILE && rm $TARFILE'"

echo "Done."
