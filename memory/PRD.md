# Wages of War Casino — PRD

## Original Problem Statement
Legal Entity: Wages of War Operations Ltd. Domain: wagesofwarcasino.com. Licence: MGA/B2C/912/2025 (Gaming Service Licence Type 1 – Online Casino & Virtual Slot Content), effective Jan 2, 2025. Build an elite military night-vision-ops themed online casino ("Wages of War Casino") with gold branding, review/finish end-to-end, and publish. Brand must always read "Wages of War" — never "War of Wages".

Note: The starting repo was actually an empty CRA/FastAPI template; the full casino was built from that base.

## User Choices
- Money model: play-money virtual credits + Stripe deposit flow to buy credits (test mode).
- Games: 6 themed slot machines (popular-first) + Warhead Keno + Dog-Tag Flip (coinflip).
- Auth: JWT email/password AND Emergent-managed Google login.
- Daily bonus / free-credit top-up: yes (VIP-scaled, 24h cooldown).
- Extras: VIP tiers, leaderboard, responsible-gaming page.

## Architecture
- Frontend: React 19 + craco, Tailwind, shadcn/ui, @phosphor-icons/react, framer-motion, sonner. Design: dark tactical (deep black + night-vision green + elite gold), HUD corner brackets, Bebas Neue / Barlow Condensed / IBM Plex Mono.
- Backend: FastAPI + Motor (MongoDB). All routes under /api. games.py holds server-authoritative RNG engine (slots 5x3, 20 paylines, wild/scatter; keno 80/20; VIP tiers; credit packages).
- Auth: bcrypt + JWT httpOnly cookie (access_token) with Bearer fallback; Google via Emergent OAuth (session_token cookie). CORS reflects any origin (regex) with credentials.
- Payments: Stripe Flow A claimable sandbox. Onboarding URL to claim: available via Stripe dashboard/Payments tab.

## User Personas
- Casual player: quick play-money fun, daily bonus, slots.
- High-roller/VIP: climbs ranks, chases leaderboard, buys credit packs.

## Implemented (2026-06-XX)
- Auth: register (10,000 starting credits), login, logout, /me, Google session exchange, seeded admin.
- Slots: 6 machines (Gates of Glory, Book of Ops, Big Bass Bombardment, Sweet Ammo, Wild West Recon, Money Train Convoy) with paytables, wilds, scatters, free-spin payouts, animated reels, win highlighting.
- Warhead Keno (1-10 picks, up to 5000x) and Dog-Tag Flip coinflip (1.96x).
- Wallet: balance HUD, 5 credit packages, Stripe checkout, transaction history, payment success polling.
- Daily supply drop (VIP-scaled, 24h cooldown), 8 VIP tiers with cashback, leaderboard, profile dossier with VIP progress, responsible-gaming page, MGA-compliant footer.
- Brand assets (hero, emblem, coin, giveaway) wired in; favicon + title set.

## Implemented (2026-06-XX, iteration 2)
- Battle sounds: Web Audio synth engine (src/lib/sounds.js) for spin/reel-stop/win/big-win/lose/coin/scatter; header mute toggle persisted in localStorage (SoundContext). Wired into slots, keno, coinflip.
- Interactive Free Spins: 3+ scatters open a real free-spins session (backend /api/games/slots/freespin) with a rising multiplier (+1 per winning spin), retriggers (+5 spins on 3+ scatters), winnings-only credit, and a COLLECT summary. Fixed a bug where wild/scatter symbols were never on the reels (added to each machine's weight table).

## Testing
- iteration_1: backend 28/28 pytest pass; frontend 100% of tested flows. No critical/minor issues. "War of Wages" never appears. Deployment scan: PASS.

## Backlog (P1/P2)
- P1: Free-spins mini-session for scatter triggers (currently paid as bonus, not an interactive round).
- P1: Cashback auto-credit based on VIP tier.
- P2: Tournaments/seasonal missions; sound effects; achievements; email receipts (Resend).
- P2: Split server.py into auth/payments modules; cache Stripe price lookups in DB.

## Next Tasks
- Publish to production and share Stripe onboarding link if the user wants to claim the sandbox.
