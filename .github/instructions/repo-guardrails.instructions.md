---
applyTo: "**/*.{py,js,jsx,ts,tsx,md,yml,yaml,json}"
---
# Repo guardrails

## Must follow
- Preserve the working backend/frontend split.
- Keep product and deployment docs truthful and up to date.
- Prefer targeted fixes to broad cleanup.
- Validate each fix with the smallest relevant command.
- Respect the repo’s real app architecture and business constraints.

## Never do
- Do not invent or expose secrets, URLs, or credentials.
- Do not delete files without a clear, confirmed reason.
- Do not rewrite stable working logic just to refactor it.
- Do not claim production success without a fresh verification run.
- Do not blame missing graphics when the host is serving the wrong app or stale deployment.

## Known repo context
- Frontend assets are served from `frontend/public` with root-relative URLs.
- Preview environments can redirect to `/login`; this often reflects deployment drift rather than a missing image.
- The root project README is the source of truth for live publish requirements.
- The app has a real auth flow, KYC, cashier, and slot system that all need to be treated as connected parts of a deployed product.

## Fixing rules
- When a route is wrong, check host routing and deployment state before editing frontend code.
- When a page loads but graphics do not, verify `public` asset paths and the file names in the repo.
- When the issue is backend-driven, inspect the API contract and the route behavior before rewriting the frontend.
- When a fix is implemented, verify with the exact command that proves the relevant behavior.

## Operating safety
- The agent must be careful, evidence-driven, and minimal.
- Prefer preserving verified functionality over broad refactors.
- Keep repo docs and app behavior aligned with the actual code and deployment reality.
