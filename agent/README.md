# Deployment agent (repo copy)

This directory provides a deploy script that packages and uploads the frontend production build to a remote host. If `frontend/build` is missing, the script will automatically run the frontend install + production build before packaging.

Usage (from repository root):

```bash
DEPLOY_HOST=host DEPLOY_USER=user DEPLOY_PATH=/var/www/site DEPLOY_KEY=/path/to/key ./agent/deploy.sh
```
