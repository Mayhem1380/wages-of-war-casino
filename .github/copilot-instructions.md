# Copilot instructions for Wages of War Casino

This repository is a casino app with a Python/FastAPI backend and a React frontend. Keep changes aligned to the verified project architecture and prioritize surgical fixes over broad rewrites.

## Primary working assumptions
- Keep the backend logic in `backend/` and the frontend UI in `frontend/src/`.
- Preserve the deployment checklist in `README.md` before final production work.
- Prefer root-cause fixes over cosmetic changes.
- Never invent secrets, production credentials, or payment keys.
- Treat the repo as a deployable app with real operational risk, not a toy starter project.

## Verified repo facts
- Frontend production build succeeds with the project’s existing setup.
- Brand and slot asset files exist under `frontend/public/brand` and `frontend/public/slots`.
- Live preview redirects to `/login` when the host is serving the wrong app or stale deployment, so check deployment state before blaming asset paths.
- The app uses root-relative asset paths like `/brand/...` and `/slots/...` and expects those files to exist in `public`.
- The repo includes a working backend, frontend, and deployment docs, so default to preserving the working architecture.

## Guardrails
- Do not remove or rewrite working files unless the issue is confirmed.
- Keep code changes minimal and linked to a real problem.
- Validate using the narrowest check that proves the fix.
- Treat `memory/`, `README.md`, and `test_result.md` as operational project context.
- If a deployment is redirecting to a login screen, inspect host state and redirect logic before editing frontend graphics paths.

## Good workflow
1. Find the exact file and route involved.
2. Confirm the cause and expected behavior.
3. Make the smallest safe fix.
4. Run the closest validation command.
5. Summarize the evidence and any follow-up risk.
6. If the issue depends on the host or preview state, document that clearly and avoid blaming the wrong layer.

## App-specific checks to run before broad fixes
- Confirm whether the app is actually the one being served by the host.
- Check whether UI assets resolve under `/brand` and `/slots`.
- Confirm the frontend build still compiles before discussing rendering issues.
- Check KYC/cashier paths only when the issue is specifically in banking or verification.

## What the agent should learn from this repo
- This is a real casino app, not a generic template.
- There are protected deployment requirements and compliance-sensitive sections.
- The right fix is often in deployment state or config, not in CSS or image files.
- The agent must remain surgical, explicit, and evidence-driven.
