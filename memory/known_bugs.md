# Known bugs & root causes

## CRITICAL — Modals rendering off-screen (auth/login popup) — FIXED 2026-08-29
- Symptom: On mobile, tapping ENLIST/Login showed only a black overlay; the dialog
  rendered 8k–40k px BELOW the viewport. Users could not register or log in.
- Root cause: `.hud { position: relative }` in `index.css` was overriding the shadcn
  DialogContent's Tailwind `position: fixed` (same specificity, index.css loaded after
  Tailwind utilities). AuthDialog's DialogContent uses className="hud hud-gold ...", so
  it became `position: relative`, dropping to the bottom of the (very tall) <body> portal
  target; `top:50%` then pushed it thousands of px further down. The overlay had no `.hud`
  so it stayed fixed (the black screen users saw).
- Fix: `/app/frontend/src/components/ui/dialog.jsx` DialogContent now sets inline
  `style={{ position: "fixed" }}` (inline beats any class) + `max-h-[92vh] overflow-y-auto`.
- RULE: Never rely on Tailwind `fixed`/`absolute` alone when a component also gets a
  class that sets `position` (like `.hud`). Any `.hud`-styled overlay/modal must force
  its own position via inline style or `!` important. If you build new modals with `.hud`,
  verify computed position is `fixed` and the element is inViewport.
