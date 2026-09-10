# Deployment Agent

These scripts are the canonical Builder / Minuteman release path for the frontend. They build from the repository root, verify the production artifact, upload it, verify its SHA-256 checksum on the host, extract it into a uniquely named release directory, and atomically activate `current`.

## Build only

```bash
./agent/build.sh --no-install
```

Without `--no-install`, the builder uses `npm ci --legacy-peer-deps` when `frontend/package-lock.json` exists and otherwise uses `npm install --legacy-peer-deps`. It always runs the production build with `--no-sourcemap` and requires `frontend/build/index.html` afterward.

## Deploy

Set the host values in the private runner environment. Do not commit credentials or put secrets in source files.

```bash
DEPLOY_HOST=host DEPLOY_USER=user DEPLOY_PATH=/var/www/site \
	DEPLOY_KEY=/path/to/key ./agent/build.sh --deploy
```

You can use either `DEPLOY_KEY` or `DEPLOY_PASSWORD` for the remote credential.

```bash
DEPLOY_HOST=host DEPLOY_USER=user DEPLOY_PATH=/var/www/site \
	DEPLOY_PASSWORD=secret ./agent/build.sh --deploy
```

`--deploy` refuses to run unless the host, user, path, and one supported credential are present. The remote host must provide `ssh`, `scp`, `sha256sum`, `tar`, and permissions to create `$DEPLOY_PATH/.releases` and update `$DEPLOY_PATH/current`.

## Release verification

After a successful deploy, verify the host serves `$DEPLOY_PATH/current`, not an older extracted directory. A preview showing `/login` or the Emergent Code Server screen is host/routing state and is not evidence that the frontend build is missing. Confirm the target host, release timestamp, and application route before debugging assets or CSS.

For a local proof run:

```bash
/app/.venv/bin/pytest -q tests/test_builder.py tests/test_deploy_script.py
cd frontend && npm run build -- --no-sourcemap
```
