# Wages of War Casino

## Production Publish Checklist

This repo now enforces safer backend startup config. Complete these steps in your Publish panel before final go-live testing:

### Builder / Minuteman reliability checklist
- Use the verified frontend build command before claiming completion: `cd /app/frontend && npm run build -- --no-sourcemap`
- If dependencies need installation, prefer `npm ci --legacy-peer-deps` when `frontend/package-lock.json` exists; otherwise fall back to `npm install --legacy-peer-deps`
- Only deploy when `DEPLOY_HOST`, `DEPLOY_USER`, and `DEPLOY_PATH` are set in the live environment
- Treat `/login` redirects as a deploy-state check, not proof the app visuals are missing
- Keep build output and deployment state aligned with the actual live host before calling the release complete

1. Set production secrets and redeploy:
	- `STRIPE_SECRET_KEY` (live key, starts with `sk_live_`)
	- `STRIPE_WEBHOOK_SECRET` (starts with `whsec_`)
	- `NOWPAYMENTS_API_KEY`
	- `NOWPAYMENTS_IPN_SECRET`
	- `NOWPAYMENTS_BASE_URL` (live endpoint)
	- `VAULT_API_KEY` (non-test value)

2. Confirm URLs:
	- `FRONTEND_URL` points at your live domain
	- frontend `REACT_APP_BACKEND_URL` points at your live backend URL

3. Redeploy after any secret changes.

## Local Development

- Copy `backend/.env.example` to `backend/.env` and fill values.
- Never commit real secrets to git.

## Secret handling and vault workflow

- Keep all live credentials in a private vault or platform secret manager.
- Store only placeholder values or masked examples in the repository.
- Inject real values at deploy time via the host environment or CI/CD secret store.
- Treat the following as sensitive: `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`, `VAULT_API_KEY`, `ADMIN_PASSWORD`, and any live production URLs.
- If a value is not in the vault, it must not be committed, pasted into chat, or saved in source-control files.
- This repo already expects that pattern: the backend rejects placeholder production config values before deploy.
