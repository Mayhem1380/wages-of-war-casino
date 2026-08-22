---
applyTo: "**/*.{py,js,jsx,ts,tsx,md,yml,yaml,json}"
---
# Repo guardrails

## Must follow
- Preserve the working backend/frontend split.
- Keep product and deployment docs truthful and up to date.
- Prefer targeted fixes to broad cleanup.
- Validate each fix with the smallest relevant command.

## Never do
- Do not invent or expose secrets, URLs, or credentials.
- Do not delete files without a clear, confirmed reason.
- Do not rewrite stable working logic just to refactor it.
- Do not claim production success without a fresh verification run.

## Known repo context
- Frontend assets are served from `frontend/public` with root-relative URLs.
- Preview environments can redirect to `/login`; this often reflects deployment drift rather than a missing image.
- The root project README is the source of truth for live publish requirements.
