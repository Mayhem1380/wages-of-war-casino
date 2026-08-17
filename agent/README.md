# Deployment agent (repo copy)

This directory provides a simple deploy script to upload `frontend/build` to a remote host.

Usage (from repository root):

```bash
cd frontend && npm ci && npm run build
DEPLOY_HOST=host DEPLOY_USER=user DEPLOY_PATH=/var/www/site DEPLOY_KEY=/path/to/key ./agent/deploy.sh
```
