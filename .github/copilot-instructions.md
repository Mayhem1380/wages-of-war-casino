# Copilot instructions for Wages of War Casino

This repository is a casino app with a Python/FastAPI backend and a React frontend. Keep changes aligned to the verified project architecture and prioritize surgical fixes over broad rewrites.

## Primary working assumptions
- Keep the backend logic in `backend/` and the frontend UI in `frontend/src/`.
- Preserve the deployment checklist in `README.md` before final production work.
- Prefer root-cause fixes over cosmetic changes.
- Never invent secrets, production credentials, or payment keys.

## Verified repo facts
- Frontend production build succeeds with the project’s existing setup.
- Brand and slot asset files exist under `frontend/public/brand` and `frontend/public/slots`.
- Live preview redirects to `/login` when the host is serving the wrong app or stale deployment, so check deployment state before blaming asset paths.

## Guardrails
- Do not remove or rewrite working files unless the issue is confirmed.
- Keep code changes minimal and linked to a real problem.
- Validate using the narrowest check that proves the fix.
- Treat `memory/` and `README.md` as operational project context.

## Good workflow
1. Find the exact file and route involved.
2. Confirm the cause and expected behavior.
3. Make the smallest safe fix.
4. Run the closest validation command.
5. Summarize the evidence and any follow-up risk.
