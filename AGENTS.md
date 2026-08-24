# Wages of War Casino — repo agent guide

This repository is a full-stack casino app with a Python/FastAPI backend and a React frontend built via CRA/Craco. It is a real product, not a starter project.

## Mission
Operate as an elite repo specialist. Learn what is already working, keep architecture intact, fix root causes, and improve the product across design, slot systems, payments, KYC, support automation, and deployment operations.

## What this project contains
- Backend runtime: `backend/`
- Frontend app: `frontend/`
- Deployment and automation: `agent/`, `scripts/`, root `docker-compose.yml`
- Product docs: `memory/`, `README.md`, `test_result.md`
- Environment and release config: Docker Compose, backend `.env` usage, frontend runtime helpers

## Verified project realities
- The frontend production build succeeds with `cd /app/frontend && npm run build -- --no-sourcemap`.
- Brand and slot asset files exist under `frontend/public/brand` and `frontend/public/slots` and are referenced with root-relative URLs such as `/brand/...` and `/slots/...`.
- Preview hosts can redirect to `/login` when the app is served from the wrong directory, stale deployment, or wrong host binding. This is usually deployment drift, not a missing asset bug.
- `README.md` and `memory/` are the authoritative operational docs for deployment expectations.
- Do not invent secrets, production domains, payment credentials, or live keys.

## Architecture map
- `backend/server.py`: main FastAPI app, auth routes, payment/cashier integration, core API surface
- `backend/cashier.py`: payment provider adapters, vault helpers, real-money cash flow logic, transaction handling
- `backend/games.py`: slot mechanics, payouts, game definitions, jackpot logic, spin resolution
- `frontend/src/components`: shared UI, overlays, animated scenes, app-wide shells, brand assets, chat and support widgets
- `frontend/src/pages`: route-level pages such as `Landing`, `Lobby`, `Cashier`, `Kyc`, `Wallet`, `SlotGame`, `FlagshipSlot`
- `frontend/src/data/gameMeta.js`: slot metadata, brand asset IDs, symbol definitions, machine art mapping
- `frontend/src/lib/runtime.js`: base-path and origin detection for preview/deploy environments
- `frontend/src/context/AuthContext.jsx`: auth state, login/logout, refresh, auth modal flow
- `frontend/src/lib/api.js`: backend API client and request defaults

## Core work domains
- Game design and slot polish
- Branding, media, and visual identity
- Smooth event flows and responsive layout
- Backend and frontend integration
- Payments, deposits, withdrawals, payout logic
- KYC/compliance validation flow
- Support and help automation
- Deployment verification and host-state checks
- Asset integrity and build health

## Guardrails and operating rules
- Prefer the smallest fix that addresses the actual root cause.
- Keep backend and frontend responsibilities separated.
- Validate with the narrowest check that proves the fix.
- Do not remove files unless they are clearly unused and confirmed obsolete.
- Treat `README.md`, `memory/`, and `test_result.md` as project truth files.
- If something is flaky only in preview or production, check deploy state before blaming asset paths.
- Never treat a 302 login page as proof that the slot graphics or banking page code is absent.

## Workflow for advanced work
1. Understand the route, feature, and file involved.
2. Trace the actual data flow and behavior.
3. Confirm the root cause before changing code.
4. Make the smallest correct fix.
5. Validate with the smallest relevant command.
6. Summarize what changed and why, with evidence.
7. If deploy state is involved, verify host/server state before blaming code.

## Deployment and environment rules
- Build and runtime checks happen in the repo first.
- `FRONTEND_URL` and `REACT_APP_BACKEND_URL` are deployment-sensitive and must be explicit in hosted environments.
- A wrong host target, stale build, or redirect loop can hide real app health.
- The app must be proven by fresh evidence before being treated as fixed.

## Validation commands
- Frontend build: `cd /app/frontend && npm run build -- --no-sourcemap`
- Backend tests: `cd /app/backend && pytest -q`
- Docker sanity check: `cd /app && docker compose config`
- Asset checks: `curl -I` on the relevant `/brand/...` or `/slots/...` URL

## Operating principle
The project already contains strong working building blocks. The job is to preserve them, fix root causes, improve design and gameplay quality, and avoid noisy or speculative rewrites.

## Final rule
When in doubt, verify with code and fresh build evidence instead of guessing from a stale preview or login redirect. Build quality, product polish, and deployment correctness must be proven before being claimed complete.
7785fc6b-5e92-4d8d-955a-7e7fe7ea9ac5
live link https://night-vision-gold.emergent.host. 

