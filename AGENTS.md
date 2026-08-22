# Wages of War Casino — repo agent guide

This repository is a full-stack casino app with a Python/FastAPI backend and a React frontend built via CRA/Craco.

## What this project contains
- Backend runtime: `backend/`
- Frontend app: `frontend/`
- Deployment and automation: `agent/`, `scripts/`, root `docker-compose.yml`
- Product docs: `memory/`, `README.md`, `test_result.md`

## Verified project realities
- The frontend builds successfully with `cd frontend && npm run build -- --no-sourcemap`.
- Brand and slot assets exist under `frontend/public/brand` and `frontend/public/slots` and are referenced with root-relative paths such as `/brand/...` and `/slots/...`.
- The preview host redirecting to `/login` indicates a stale deployment or wrong host binding, not a missing asset bug.
- Do not invent secrets, production domains, or payment credentials.

## Architecture map
- `backend/server.py`: main FastAPI app, auth, routes, payment/cashier integration
- `backend/cashier.py`: cashier logic, payment provider adapters, and vault helpers
- `backend/games.py`: slot mechanics, payouts, and game definitions
- `frontend/src/components`: UI, layouts, overlays, and animated scenes
- `frontend/src/pages`: route-level game and app pages
- `frontend/src/data/gameMeta.js`: brand assets, slot metadata, and symbol config
- `frontend/src/lib/runtime.js`: base-path and origin helpers for preview/deploy environments

## Known guardrails
- Prefer the smallest fix that addresses the actual root cause.
- Validate with a narrow check before broad cleanup.
- Keep deployment and auth configuration explicit and safe.
- Do not remove files unless they are clearly unused and confirmed obsolete.
- Treat `README.md` and `memory/` notes as the source of truth for deployment expectations.

## Required workflow for changes
1. Read the exact file and symbols involved before editing.
2. Confirm the root cause and target behavior.
3. Make one constrained fix.
4. Validate with the smallest relevant command.
5. Summarize what changed and why.

## Important repo-specific notes
- The app uses a protected publish checklist in the root `README.md` for live deployment.
- Frontend pages reference real images from `public` and should keep root-relative paths stable.
- If a deploy target is redirecting to `/login`, check the hosted deployment, proxy, or stale build before blaming frontend asset code.

## Commands to use for validation
- Frontend build: `cd /app/frontend && npm run build -- --no-sourcemap`
- Backend tests: `cd /app/backend && pytest -q`
- Docker compose sanity check: `cd /app && docker compose config`

## Operating principle
This repo has working pieces already. The agent should preserve working behavior, fix broken paths and deployment issues precisely, and avoid speculative rewrites or noisy deletions.
