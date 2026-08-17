#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<EOF
Usage: export values then run this script to set GitHub Actions secrets via gh CLI.

Required env vars:
  GITHUB_REPO   owner/repo (e.g. Mayhem1380/wages-of-war-casino)
  DEPLOY_HOST
  DEPLOY_USER
  DEPLOY_KEY    (path to private key file or the key content)
  DEPLOY_PATH

Optional env vars:
  DEPLOY_PORT
  DEPLOY_AFTER_CMD

Example:
  export GITHUB_REPO=Mayhem1380/wages-of-war-casino
  export DEPLOY_HOST=wagesofwarcasin0.online
  export DEPLOY_USER=deploy
  export DEPLOY_KEY="$(cat ~/.ssh/id_rsa)"
  export DEPLOY_PATH=/var/www/wagesofwar/host
  ./scripts/set-gh-secrets.sh
EOF
  exit 1
}

[ -n "${GITHUB_REPO:-}" ] || usage
[ -n "${DEPLOY_HOST:-}" ] || usage
[ -n "${DEPLOY_USER:-}" ] || usage
[ -n "${DEPLOY_KEY:-}" ] || usage
[ -n "${DEPLOY_PATH:-}" ] || usage

echo "Setting secrets for $GITHUB_REPO (requires gh CLI authenticated)"

gh secret set DEPLOY_HOST --repo "$GITHUB_REPO" --body "$DEPLOY_HOST"
gh secret set DEPLOY_USER --repo "$GITHUB_REPO" --body "$DEPLOY_USER"
gh secret set DEPLOY_PATH --repo "$GITHUB_REPO" --body "$DEPLOY_PATH"

if [ -n "${DEPLOY_PORT:-}" ]; then
  gh secret set DEPLOY_PORT --repo "$GITHUB_REPO" --body "$DEPLOY_PORT"
fi

if [ -n "${DEPLOY_AFTER_CMD:-}" ]; then
  gh secret set DEPLOY_AFTER_CMD --repo "$GITHUB_REPO" --body "$DEPLOY_AFTER_CMD"
fi

# DEPLOY_KEY may be a path to a file or the raw key content
if [ -f "$DEPLOY_KEY" ]; then
  KEY_CONTENT=$(cat "$DEPLOY_KEY")
else
  KEY_CONTENT="$DEPLOY_KEY"
fi

gh secret set DEPLOY_KEY --repo "$GITHUB_REPO" --body "$KEY_CONTENT"

echo "Secrets set. Trigger the workflow via GitHub Actions or run:"
echo "  gh workflow run 'Build and Deploy Frontend via SCP' --repo $GITHUB_REPO --ref main"
