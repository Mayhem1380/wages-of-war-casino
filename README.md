# Wages of War Casino

## Production Publish Checklist

This repo now enforces safer backend startup config. Complete these steps in your Publish panel before final go-live testing:

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
