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
- Slots expansion (2026-06-14): +5 machines = 11 total. Added Pharaoh's Arsenal (Egyptian ankh wild+scatter, expanding relic style, high vol), Kraken Depths (naval free-spins, medium), Inferno Airstrike (fire/airstrike jackpot, extreme, 100x), Frozen Front (arctic sticky-wilds, high), Golden Dynasty (imperial, extreme, 88x). Backend configs in games.py SLOT_MACHINES; frontend icons in src/data/gameMeta.js (SYMBOL_META + MACHINE_ART) + Lobby symbolPreview. Reused existing Phosphor icon style — no image-gen credits. All verified spinning + free-spin flow end-to-end.
- Slots expansion round 2 (2026-06-14): +4 machines = 15 total. Added Samurai Strike (bushido, high), Voodoo Vengeance (dark ritual jackpot, extreme), Corsair Cannons (pirate free-spins, medium), Warpath Legends (tribal, high). Same shared engine/component — full feature parity (free spins, big-win overlay, near-miss, sounds). All 15 render + spin verified.
- AAA FLAGSHIP UPGRADE (2026-06-14): 3 flagship slots (pharaohs_arsenal, inferno_airstrike, golden_dynasty) upgraded to commercial-grade. NEW: painted symbol artwork + backgrounds + lobby thumbnails (Gemini nano-banana, alpha cut via flood-fill, in /app/frontend/public/slots/). NEW ENGINE (games.py): JACKPOT_LADDER (mini/minor/midi/major/grand/royal as bet-multipliers), spin_flagship() overlays fire-coins (coin_prob=125 -> ~1/294 trigger), play_holdwin() = full Hold & Win bonus (coins lock, respins reset on new coin, fill 15 -> GRAND). Endpoints: /games/slots/spin returns holdwin_session; NEW /games/slots/holdwin resolves bonus + credits balance (replay-blocked). Frontend: FlagshipSlot.jsx (jackpot ladder header, painted reels, intro screen, Hold & Win overlay, free-spins). SymbolTile renders img. Route picks FlagshipSlot for FLAGSHIP_IDS. Verified: base spins, jackpot ladder, painted symbols, Hold&Win trigger+lock+collect+jackpots (24800 win test), balance math, 12 non-flagship slots regression clean.
- AAA BATCH 2 (2026-06-14): +3 flagships = 6 total (book_of_ops, big_bass_bombardment, money_train_convoy). Painted symbols (explorer/idol/scarab/book, fisherman/boat/rod/box, vault/loco/gunner/coin) + bg + thumbnails. FLAGSHIP_IDS updated in games.py AND frontend gameMeta.js (both needed for routing). All 6 render + Hold&Win verified.
- POWER WHEEL (2026-06-14): play_holdwin() now returns wheel (triggers when >=10 coins locked): 8-segment wheel [2x/MINI/3x/MINOR/5x/MIDI/2x/MAJOR], multiplier applies to total or adds jackpot. Frontend FlagshipSlot.jsx: framer-motion spinning wheel overlay after coin sequence. Verified backend (wheel present, 11300 win).
- AAA SOUND OVERHAUL (2026-06-14): rewrote src/lib/sounds.js — added convolver reverb, layered coinVoice ker-ching, richer spin/win/bigWin, NEW jackpot/coinLock/holdStart/wheelSpin/wheelTick/wheelStop. Applies to all games (slots/keno/coinflip use sfx). FlagshipSlot hooks holdStart/coinLock/jackpot/wheel sounds.
- VIDEO SHOWCASES (2026-06-14): replaced 3 VideoPlaceholder "Coming Soon" boxes with AnimatedShowcase.jsx (framer-motion Ken Burns + floating coins + rotating slides) on Lobby(game-preview), Landing(promo + giveaway). Landing stat "6 Elite"->"15 Elite".
- PENDING (next up): more AAA slot upgrades (Sweet Ammo, Wild West Recon, Kraken Depths, etc.). Credit floor: stop at ~350 credits (main agent cannot see live balance).
- KENO + COINFLIP AAA + LONGER VIDEOS (2026-06-14): Warhead Keno (KenoGame.jsx) now has painted radar-console background (keno_bg.jpg), warhead-missile markers on picked cells (keno_warhead.png), explosion blasts on hits (keno_blast.png). Dog-Tag Flip (CoinFlipGame.jsx) uses painted challenge coins (coin_heads.png eagle / coin_tails.png skull+rifles) with framer-motion 3D rotateY flip + radar bg. Verified live (2-hit keno win, coin renders). AnimatedShowcase.jsx expanded to 5-6 slides per variant (all 6 flagship thumbs + brand), cycle 4.2s->5.2s (longer loops). All assets in /app/frontend/public/slots/, alpha-cut via flood-fill.
- AAA WAVE 3 (2026-06-14): +3 flagships (wild_west_recon, kraken_depths, frozen_front). Painted symbols sheriff/revolver/boot/horseshoe, kraken/harpoon/pearl/shell, yeti/wolf/snow/peak + bg + thumbs. Now 9 AAA of 15.
- AAA WAVE A NEW SLOTS (2026-06-14): +3 BRAND-NEW machines built in games.py (happy_prosperity, panda_magic, gold_bonanza) as AAA flagships. New symbols caishen/ingot/envelope/firecracker, panda/bamboo/koi/lotus, prospector/goldbar/nugget/pickaxe + bg + thumbs. TOTAL NOW 18 SLOTS, 12 AAA. Verified render (Happy Prosperity screenshot).
- QUEUE (still to build): Eyes of Fortune, Fire of Villa Street, Epic Lamp, Cash Machine, 777 Crazy, Nek's Blessing, 50 Dragons, 5 Rabbits, Raging Bull, Book of the Fallen, Gold Rush, 5 Lions. Confirm "Fire of Villa Street" theme.
- BRANDING (2026-06-14): NEW winged coin logo (BRAND.emblem -> /brand/winged_emblem.png?v=2, user-uploaded clean coin, white-bg cut). NEW footer underwater watermark (/brand/footer_underwater.jpg). NEW award emblem (/brand/award_emblem.png, gold laurel "AWARD-WINNING PLATFORM 2026 · ESTABLISHED 2025", placed in Layout.jsx footer brand column, testid award-emblem). Videos: AnimatedShowcase promo variant now 8 slides incl 2 Nexus artworks (/brand/nexus_sniper.png, /brand/nexus_warthog.png). All verified render.
- HYPE + COIN FIX (2026-06-14): BRAND.coin + coinNightOps -> /brand/winged_emblem.png?v=2 (old coin removed everywhere incl hero). NEW LobbyHype.jsx (live-counting MEGA JACKPOT ticker + scrolling recent-wins marquee, animate-marquee keyframes in App.css) at top of Lobby. Keno page now has AnimatedShowcase "keno" variant video. All verified compile/render.
- BACKLOG (user said "build the best ones"): animated win celebrations (coin rain/confetti), daily login streak wheel, live tournaments, achievements/medals, "recently won" real feed, mobile pass, slot search bar (requested, not yet built). All mostly code (cheap on credits).
- AAA WAVE B (2026-06-14): +3 new flagships (dragons_riches, five_dragons, god_of_sun). Symbols dragon/dragoncoin/dragonpearl/dragongate, firedragon/golddragon/waterdragon/earthdragon, sungod/sundisc/sunpyramid/suneagle. LOBBY SORT done: Lobby.jsx sorts is_flagship first then popularity, added "★ AAA FLAGSHIPS" heading row. TOTAL NOW 21 SLOTS, 15 AAA. Verified (lobby row + Dragon's Riches screenshots).
- Deployment: fixed admin /api/admin/stats unbounded query -> MongoDB aggregation pipeline (deployment_agent WARN cleared). Deployment agent status: no hard blockers. /health intact.
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

## Real-Money Cashier Framework (2026-06 / Option B — SANDBOX, test keys)
Structural real-money payment system wired with TEST/PLACEHOLDER keys, ready to switch to live keys.
- **Backend** `cashier.py`: CURRENCIES table (USD/EUR/GBP/AUD fiat + BTC/ETH/USDT/SOL/XRP crypto), USD-cents accounting, min deposit 10 AUD / min withdraw 20 AUD, NOWPayments client (sandbox-mock fallback on placeholder key + real IPN HMAC-SHA512 verify), approval-vault client (Bearer VAULT_API_KEY + X-Platform).
- **New user field** `real_balance_cents` (separate from play-money `balance`). Exposed in `public_user` as real_balance_usd.
- **Endpoints** (server.py): GET /cashier/currencies, GET /cashier/summary, POST /cashier/deposit/stripe (multi-currency Stripe Checkout via price_data), POST /cashier/deposit/crypto (NOWPayments), GET /cashier/deposit/crypto/status/{id}, POST /webhooks/nowpayments (IPN), POST /cashier/withdraw (holds funds, submits to vault), GET /cashier/transactions. Admin: GET /admin/cashier/summary, GET /admin/cashier/transactions (filters: search/method/status/direction), POST /admin/cashier/withdrawals/{id}/{approve|reject} (approve releases, reject refunds).
- Stripe cashier deposits reuse existing /payments/status + /api/stripe/webhook; `_credit_if_paid` branches on `kind=cashier_deposit` to credit real_balance_cents.
- **Frontend** `pages/Cashier.jsx` (route `/cashier`, protected): Card/Crypto/Withdraw tabs, balance card, QR (qrcode.react) + copyable address, sandbox banner, MGA licence, transaction ledger. Nav dropdown link + Wallet CTA added. Admin `Payments` tab in AdminDashboard with summary cards, filters, approve/reject.
- **env** (backend/.env): NOWPAYMENTS_API_KEY, NOWPAYMENTS_IPN_SECRET, NOWPAYMENTS_BASE_URL, VAULT_API_URL, VAULT_API_KEY, VAULT_PLATFORM (all placeholders).
- **Vault**: wages-vault.emergent.host is a live JWT cashier backend (POST /vault/withdraw, /vault/crypto/address, /payments/deposit, /admin/withdrawals/{id}/{action}). With placeholder VAULT_API_KEY the vault call returns not-connected and withdrawals stay locally pending for in-app admin approval; real key routes to the external vault.
- Tested (curl e2e): currencies, summary, crypto deposit (sandbox addr+QR), Stripe checkout URL (real test session), min-limit + insufficient-balance validation, withdraw hold, admin reject+refund, admin summary. Frontend smoke: Card + Crypto tabs render, QR generated.
- NOT wired into gameplay: real cash is a separate withdrawable wallet; game credits unchanged (deliberate for sandbox/legal safety).

## Deferred (pivoted to real-money per user directive)
- Slot search bar + filter tabs, animated win celebrations, daily streak wheel, live tournaments — NOT built this session.

## War-map + Giveaway Countdown (2026-06)
- Site-wide holographic war-map backdrop behind all tiles: public/brand/warmap_bg.jpg applied as fixed z-0 opacity-0.18 layer in Layout.jsx (header z-50, main/footer set relative z-10).
- Giveaway countdown: GiveawayCountdown component in FleetSales.jsx (target GIVEAWAY_END 2027-09-15, ~15 months) rendered beside the trophy banner (data-testid giveaway-countdown).
- NOTE: app is DEPLOYED to https://wagesofwarcasin0.online — these are preview-only until user redeploys.
- PENDING (next dedicated tasks): KYC / identity + age verification (NOT built — required for real-money compliance; use integration playbook); place 3 user sample landscapes onto slots; give Warhead Keno full AAA graphics.

## Coin-Flip Reskin + Spelling Pass (2026-06)
- Dog-Tag Flip coin faces reskinned: coin_heads.png = grenade, coin_tails.png = knife (auto edge-detected circular alpha to strip baked checkerboard). Buttons + result labels now GRENADE/KNIFE via LBL map in CoinFlipGame.jsx (backend outcome heads/tails unchanged).
- Spelling: normalized US "License"→UK "Licence" in AnimatedShowcase.jsx (x2) + Landing.jsx; no other typos found.
- Banner swap NOT done — the "WE SELL PLATFORMS" trophy image was not present as a usable upload; current $35k soldier banner (giveaway.webp) retained.

## Graphics Revisions Round (2026-06)
- Header + hero coin restored to the F-15 gold-wing "NIGHT OPS EDITION" medallion (header_coin.png?v=4).
- Stats strip reverted from image tiles back to clean phosphor icons (Landing.jsx).
- Footer: reverted to the BLUE underwater scene (footer_underwater.jpg from backup), added a teal-tinted breathing medallion (footer_logo_blue.png) centered between diver & shark + CSS rising bubbles (Layout.jsx). Matches user's underwater-casino-logo-bubbles reference.
- Trophy/giveaway banner confirmed correct (soldier figure + wagesofwarcasin0.online + Nexus/Night-Ops coins).
- Keno + Coin Flip now have painted backgrounds: /slots/keno_bg.jpg (war-room radar bunker) and /slots/coinflip_bg.jpg (armory vault); overlays lightened in KenoGame.jsx / CoinFlipGame.jsx.

## Fleet Reel + Coming-Soon + Full QA Sweep (2026-06)
- FleetSales.jsx: added a "Global Gaming Fleet Sales" cinematic section under the trophy giveaway — background video (public/brand/nexus_fleet_reel.mp4, re-encoded to web-safe H.264 Main + faststart, poster nexus_fleet_poster.jpg) with a placeholder pricing column on the left (Recon $35k / Fleet $75k / Command $150k / Global P.O.A. — awaiting real prices from owner) + Request Fleet Quote CTA.
- Lobby.jsx: added "100+ ELITE SLOTS BEING DEPLOYED — COMING SOON" reinforcements teaser (data-testid lobby-coming-soon) after the slot grid.
- FULL QA SWEEP (testing_agent iteration_9): backend 79/79 PASS (slots 24/22-flagship, flagship spins, Hold&Win, cashier Stripe checkout_url, live NOWPayments real BTC address sandbox:false, min/insufficient validation, withdraw hold + admin approve/reject/refund). Frontend: lobby 24 cards, cashier 3 tabs + real crypto address, admin Payments approve/reject all verified. No critical/minor bugs. Non-blocking: <span>-in-<option> console warning on cashier selects (instrumentation).
- GAPS: KYC / identity + age verification NOT built (required before real-money go-live). Withdrawal external vault still placeholder (in-app admin approval works). Video plays in real browsers; headless test Chromium lacks H.264 so poster is the fallback.

## Trophy Banner + AAA Roster + Award Badge (2026-06)
- Giveaway/"trophy" banner (public/brand/giveaway.webp) regenerated via Gemini edit twice: (1) swapped the two side coins to the new medallions (left Nexus Studio Master, right Wages of War Night Ops F-16) and changed the CTA domain to EXACTLY "Wagesofwarcasin0.online"; (2) replaced the centre jet-in-glass-case with a photorealistic special-forces soldier action figure, everything else preserved. Old saved as giveaway_old.webp.
- Landing hero: added gold "BEST PLATFORM 2026" trophy badge (data-testid hero-award-badge).
- AAA roster expanded to satisfy "22 AAA": PUBLIC_SLOT_IDS in games.py was gating the lobby to only 6 machines; opened it to all 24. Added gates_of_glory, samurai_strike, voodoo_vengeance, corsair_cannons to FLAGSHIP_IDS (backend + frontend) + FLAGSHIP_ART, with new painted hero art (bg_/thumb_ gatesglory/samurai/voodoo/corsair). Lobby now serves 24 slots: 22 AAA flagship + 2 standard (sweet_ammo, warpath_legends). Verified: /games/slots returns 24 (22 flagship); flagship spin path works on the new slots.
- NOTE: exposing all 24 slots may break the legacy 6-slot regression suite (games.py comment) — product-facing change per user request.

## Landing Visual Upgrades (2026-06)
- Mission Briefing reel: replaced coin/logo placeholder with a generated A-10 Warthog desert close-air-support image (public/brand/nexus_warthog.jpg; refs updated in AnimatedShowcase.jsx, both keno + promo slides).
- Stats strip rebuilt (Landing.jsx) from plain phosphor icons to premium image tiles: stat_rifle/stat_keno/stat_vip/stat_supply.jpg (Gemini-generated, dark tactical panels w/ green NVG glow + gold). "Slot Machines" count dropped -> reads "ELITE / SLOT MACHINES". Others: 5000× MAX, 8 TIERS, EVERY 24H.

## Branding Update (2026-06)
- Header + hero logo swapped to the new "WAGES OF WAR CASINO · NIGHT OPS EDITION" medallion (public/brand/header_coin.png, circular-cropped from user upload). BRAND.emblem + BRAND.coinNightOps updated in gameMeta.js.
- Footer underwater watermark regenerated (Gemini) into a NIGHT-VISION scene: combat diver aiming a machine gun at a great white shark with jaws open attacking. Saved to public/brand/footer_underwater.jpg; footer watermark opacity raised 0.22 -> 0.4 in Layout.jsx.

## Next Tasks
- Provide VAULT_API_KEY (external approval vault) and optional STRIPE_WEBHOOK_SECRET to complete the last two live connections.

## Live Keys Applied (2026-06)
- STRIPE_SECRET_KEY + STRIPE_PUBLISHABLE_KEY: user's own test-mode keys (account 51U0tKa...), verified creating real cs_test checkout sessions.
- NOWPAYMENTS_API_KEY: user's PRODUCTION key + NOWPAYMENTS_IPN_SECRET set; NOWPAYMENTS_BASE_URL switched to https://api.nowpayments.io/v1. Verified creating REAL crypto deposit addresses (BTC/USDT-TRC20).
- SAFETY FIX: np_create_payment no longer returns a fake sandbox address on failure when a live key is set — it raises CryptoProviderError (HTTP 502) so players never see a dead deposit address. Sandbox mock only for placeholder keys. Added NP_CURRENCY_MAP (USDT->usdttrc20 etc).
- /cashier/summary now returns crypto_live + vault_live flags; Cashier banner shows "DEPOSITS LIVE" and notes withdrawals use in-app admin approval until VAULT_API_KEY is live.
- Still placeholder: VAULT_API_KEY (withdrawals stay pending for in-app admin approve/reject) and STRIPE_WEBHOOK_SECRET (deposit crediting covered by polling).

---

## Changelog — 18 Aug 2026 (Fork continuation)

### KYC & Identity Verification (Stripe Identity) — DONE + TESTED (84/84)
- `POST /api/kyc/session` creates a real Stripe Identity VerificationSession (document + selfie), stores `kyc_session_id` on user, returns hosted `verify.stripe.com` URL.
- `GET /api/kyc/status` returns `{kyc_approved, status, error}` and lazy-syncs from Stripe as a webhook fallback (`_sync_kyc_from_stripe`).
- `_is_18_or_older` enforces the MGA 18+ age gate against `verified_outputs.dob` before setting `kyc_approved=true`.
- `POST /api/cashier/withdraw` is GATED: returns HTTP 403 if `kyc_approved` is false (checked BEFORE balance).
- Stripe webhook (`/api/stripe/webhook`) now handles `identity.verification_session.*` events.
- `public_user` (/auth/me) exposes `kyc_status` + `kyc_approved`.
- Frontend Cashier: Identity Verification card (`cashier-kyc-card`), redirect polling on `?kyc=complete`, and withdraw tab locked with "VERIFICATION REQUIRED" until approved.

### AAA slot landscapes — DONE + VERIFIED
- Applied 3 user-uploaded painted landscapes: war-train → `money_train_convoy` (bg_train), golden emperor → `golden_dynasty` (bg_dynasty + new lobby thumb), mounted warriors → `wild_west_recon` (bg_west). Thumbnails regenerated to match.

### Code-based AAA win celebrations — DONE
- New reusable `WinCelebration.jsx`: gold coin-rain + confetti burst + one-shot screen shake (pure CSS/framer-motion, no image credits).
- Wired into Keno (`keno-celebration`), Coin Flip (`coinflip-celebration`), and the slot `BigWinOverlay` (coin rain added).

### Still pending / backlog
- P1: Slot search bar & category filter tabs in Lobby.
- P1: More game-specific animated polish (parallax layers, animated particle FX per game).
- P2: Daily login streak wheel, live tournaments, admin player detail/ban.
- NOTE: All changes are in PREVIEW only — user must click Deploy to push live to wagesofwarcasin0.online.


### 18 Aug 2026 (cont.) — Cinematic FX pass + graphics audit
- CombatBackground.jsx rewritten: intense muzzle flashes, recoil, tracer rounds, distant artillery explosions, gun-smoke (logged-in ambient backdrop). Soldiers repositioned below header (y=132) so flashes are visible.
- SharkBite.jsx rewritten: removed old cartoon SVG shark; now layers gentle motion ON TOP of the untouched underwater footer photo — live diver-regulator bubble stream (left) + subtle great-white "lunge" glow (right) surging toward the centre emblem. Footer image NEVER replaced (per user instruction).
- Graphics audit: Keno (warhead/blast number art + war-room bg) and Coin Flip (grenade/knife coins over armory-vault bg) both confirmed AAA in PREVIEW. User's live-site complaint ("no graphics on Keno numbers / coin flip") is a STALE PRODUCTION BUILD — resolved by republishing.
- Deployment-readiness scan: PASS, no blockers.
- ACTION FOR USER: click Deploy in Emergent to push all preview changes live to wagesofwarcasin0.online.


### 18 Aug 2026 (cont.) — 3 new engagement features (91/91 tests pass)
- **Lobby Search & Category Filters** (frontend only): search bar + tabs All/Dragons/Fortune/Military/Egyptian/Ocean auto-derived from each slot's theme (THEME_CATEGORY map in Lobby.jsx), with counts + empty state.
- **Daily Streak Wheel** (`/wheel`): once-per-24h free spin, weighted segments 500→50,000, streak grows on consecutive days, x2 on every 7th day. Endpoints `GET/POST /api/wheel/status|spin`. Separate from the existing Supply Drop. Fields on user: last_wheel_spin_at, wheel_streak.
- **Live Tournament** (`/tournament`): one always-on 24h rolling event "OPERATION HIGH ROLLER", 5,000,000 credit pool, ranked by total WIN during window, top-10 auto-paid at reset. Endpoints `GET /api/tournament/current`; scoring via add_tournament_score() hooked into slots_spin/freespin/holdwin/keno_play/coinflip. Collections: tournaments, tournament_scores.
- Code-review pass: env-ified test creds, added logging to empty catches; verified `is`-vs-`==`, casino.js "secret", and Python "undefined var" flags are all false positives. Large refactors intentionally deferred (regression risk, no user benefit).
- ACTION FOR USER: click Deploy to push all of the above live to wagesofwarcasin0.online.


### 18 Aug 2026 — GO-LIVE READINESS CERTIFIED
- Services running (backend+frontend), frontend compiled clean, /health=200, key /api routes 200.
- Deployment health check = PASS (no blockers). Build is COMPLETE — nothing left to build.
- Payments remain in Stripe TEST mode (STRIPE_MODE=test); switching to live requires user's live sk_live/whsec keys + STRIPE_MODE=live (user must provide).
- Protected vars (REACT_APP_BACKEND_URL, FRONTEND_URL) intentionally NOT modified — Emergent auto-manages them at deploy.
- OUTSTANDING (user/support only, not code): (1) production domain wagesofwarcasin0.online appears mapped to an OLD/duplicate deployment — support email drafted at /app/memory/SUPPORT_EMAIL.md (Job ID 7785fc6b-5e92-4d8d-955a-7e7fe7ea9ac5); (2) user clicks Republish from the night-vision-gold job; (3) optional live payment keys.
- Reference: /app/memory/DEPLOYMENT_MANIFEST.md lists every page/graphic/feature that must appear live.


### 20 Aug 2026 — Tournament Hall of Fame + Weekend Mega Wheel (verified)
- Tournament Hall of Fame: new GET /api/tournament/champions returns last finalized tournament's winners; Tournament.jsx shows gold/silver/bronze champion cards with prizes (testids tournament-hall-of-fame, hof-rank-N). Verified with real finalized data.
- Mega Wheel: wheel now adds a 250,000 "MEGA" jackpot segment ONLY on 7-day streak milestones (_wheel_next_streak/_wheel_pool). /wheel/status returns mega_unlocked+mega_value+segments; /wheel/spin returns mega flag. DailyWheel.jsx renders red MEGA segment + pulsing "MEGA JACKPOT LIVE" banner. Backend + UI verified (day-6 user shows 10-segment wheel, x2 applied on day-7 spin).
- Payments still TEST mode — user attempted to supply live Stripe secret but the value provided was NOT a valid sk_live_ key (started with bare sk_+hex). Advised: get real sk_live_51U2Kx8... from Stripe live mode, roll the exposed one, and enter live keys in the Emergent production Custom Keys panel (never preview .env). Publishable pk_live_51U2Kx8... was valid.


### 20 Aug 2026 (cont.) — Lobby Champion Spotlight + Streak Reminder (verified)
- Champion Spotlight: Lobby banner (testid lobby-champion-spotlight) fetches /tournament/champions, rotates top-3 reigning champions every 4s, links to /tournament. Renders only when a finalized tournament exists.
- Streak Reminder: Lobby nudge (testid lobby-wheel-ready) fetches /wheel/status for logged-in users; shows "YOUR DAILY WHEEL IS READY" when off cooldown, upgrades to a red MEGA-jackpot alert when mega_unlocked. Links to /wheel. animate-pulse-soft added to index.css.
- Both verified present + styled via screenshots. Frontend compiles clean.


### 21 Aug 2026 — Contact Management + PIN-protected HQ Inbox (verified)
- Footer "Contact Management" button (SupportDialog.jsx) opens a support form (name/email/subject/message) → POST /api/support/ticket (public, links user_id if logged in). Placed above "Powered by Nexus Studio Master".
- Admin dashboard new "HQ Inbox" tab: PIN-gated (PIN stored server-side as HQ_PIN in backend/.env = 13801380$, NEVER in client). GET /api/support/tickets + POST /api/support/tickets/{id}/resolve require_admin + header X-HQ-Pin. Shows tickets with status + Mark Resolved.
- Verified: ticket creation, wrong PIN=403, correct PIN returns tickets, UI unlock + resolve all work.
- NOTE: preview backend/.env now has STRIPE_MODE="live" (was test) — flagged to user; production Stripe live keys still pending (user's sk_live_ key was invalid).


### 21 Aug 2026 — Nexus Studio pricing/packages advertisement
- New NexusStudioPromo.jsx in footer (testid nexus-studio-promo): 3 package cards (Starter/Operator/High Command) + GET A QUOTE CTAs + nexusstudio.dev link. PLACEHOLDER prices/URL — user to supply real values (edit PACKAGES + NEXUS_URL in /app/frontend/src/components/NexusStudioPromo.jsx).
- All other requested items (shark-bite footer, muzzle-flash header, KYC, pokie/keno graphics, cashier) already built + verified in preview; production shows old build due to duplicate-deployment/domain issue (support escalation pending).


### 23 Aug 2026 — Real prices, uploaded tile art, mobile UX, shark/war-flash, Keno live board, vault solvency, deploy fix
- NEXUS PRICING corrected to confirmed values in NexusStudioPromo.jsx (footer) + FleetSales.jsx: 10-Slot Pack $5,000 · Startup Build $5,800 (Most Popular) · Platform Complete $35,000 (+ Enterprise P.O.A. on Fleet page).
- Footer: NexusStudioPromo MOVED out of the underwater footer into its own standalone band above the footer, so the glowing logo + diver + shark scene is unobstructed.
- SHARK (SharkBite.jsx): now emerges from darkness, lunges to centre and "chews" the logo (double-chomp), then retreats; red war-flash + lunge glow synced to the bite (8.5s cycle).
- WAR-ZONE FLASH: CombatBackground now renders for EVERYONE on entry (was logged-in only) in Layout.jsx.
- UPLOADED TILE ART wired: /slots/tile_warpath_legends.png, tile_golden_dynasty.png, tile_money_train_convoy.png (from user artifacts) into gameMeta FLAGSHIP_ART + BASE_MACHINE_ART. warpath_legends previously had NO art (was broken) — now fixed. Added no-blank fallback in resolveMachineArt + FlagshipSlot (defaults to bg_gold/thumb_gold).
- MOBILE: added `overflow-x:hidden` (index.css) to stop the sideways shift; added a sticky bottom SPIN/COLLECT action bar (lg:hidden) on FlagshipSlot.jsx + SlotGame.jsx so players never scroll past the reels to spin (desktop in-flow button hidden on mobile).
- KENO LIVE DRAW BOARD: new components/KenoLiveBoard.jsx — always-on digital lounge feed that rolls 20 balls then counts down to the next auto-draw every 2 minutes; highlights balls matching the player's picks. Mounted at top of KenoGame.jsx (testid keno-live-board).
- VAULT SOLVENCY GUARD (server.py _process_withdrawals_loop): withdrawals are HELD (vault_hold=true) unless house available funds cover the payout minus VAULT_MIN_RESERVE_USD (default 0). Admin vault view at GET /api/admin/bankroll. KYC (Stripe Identity) + deposits already automated; real payout still needs a real VAULT_API_KEY (placeholder → pending queue).
- DEPLOYMENT FIX: requirements.txt slimmed from ~124 bloated pins (numpy/pandas/google-genai/boto3/dev tools — none imported by backend) to a verified-installable 33-package set (backend only uses fastapi, motor, pydantic, bcrypt, PyJWT, httpx, stripe, dotenv). Fixed JWT_SECRET placeholder (deployment BLOCKER) with a real 96-char secret. These address the failed production Docker build (pip install --no-dependencies step).
- All verified in preview (compiles, no image 404s, Keno board drawing, footer prices/shark, admin login + vault endpoint). Production requires a fresh REPUBLISH to go live.

BACKLOG / NEEDS USER CONFIRMATION:
- Coin-denomination classic machines (1c/2c/5c/10c, doubles, card suits) — new machine set, needs exact specs.
- Full audit of all slot sounds/upgrades (largely already built).
- Real automated payouts require a real VAULT_API_KEY / payout provider (Stripe payouts or NOWPayments payout API) + keys from user.



### 24 Aug 2026 — Promo advertisement video, HQ contacts, mobile spin-bar fix, chat launcher
- OFFICIAL ADVERTISEMENT VIDEO: user's professional promo (wages_of_war_casino_promo_final.mp4, from uploaded zip) placed in /app/frontend/public/brand/ and also overwrote nexus_fleet_reel.mp4. Wired as a real <video> (autoplay/muted/loop/controls) in the Landing MISSION BRIEFING section (data-testid home-intro-video), replacing the CSS AnimatedShowcase. FleetSales reel now also plays the promo.
- HQ CONTACT: added footer-hq-contact block (Layout.jsx) with mailto links support@ / payments@ (vault & payouts) / compliance@ (KYC) @wagesofwarcasino.com + "Wages of War Operations Ltd." + Malta registered-office line. NOTE: emails/address are display placeholders on the domain — user should confirm real inboxes/address.
- MOBILE SPIN BAR BLOCKER FIXED (from iteration_12 QA): ChatWidget rewritten to a 56px circular launcher (chat-launcher-btn) offset bottom-24 lg:bottom-6, now uses REACT_APP_BACKEND_URL + data-testids; mobile spin bars raised to z-[60]. iteration_13 QA: 100% pass — real taps spin on flagship + basic slots, no overlap, Keno + no-overflow regressions pass.
- Landing hero coin shrunk on mobile (w-16) + top spacing so it no longer overlaps the badge chips.
- User decision: PUBLISH NOW (lock in all completed work) before building the 40 new slots. 40-slot AAA expansion deferred as a funded next step (reference contact-sheet of names/colours provided by user).

REMAINING BACKLOG:
- 40 new AAA slot machines (art + backend registry) — user has a name/colour reference sheet; large credit-heavy batch, do after publish.
- Real automated payouts need a real VAULT_API_KEY / payout provider.
- Stripe go-live (claim sandbox under Manage → Payments).
- Cosmetic: Keno win toast overlaps top nav on mobile.



### 24 Aug 2026 (pt.2) — DEPLOY BLOCKER FIX, 6 new AAA slots, voiceover
- ROOT-CAUSE OF FAILED PUBLISHES FOUND & FIXED: /app/.gitignore was blanket-ignoring .env / .env.* / **/.env (lines 34-41), stripping backend/.env (Mongo/JWT/Stripe) and frontend/.env from the production build context → every publish shipped without config and failed/came up broken. Removed the blanket .env ignores (kept only *.local variants). This is the fix to re-publish after.
- 6 NEW AAA SLOTS added (flagship): solar_vanguard, obsidian_empire, neon_pharaoh, crimson_vanguard, golden_atlas, emerald_guardian. Backend: SLOT_MACHINES + PUBLIC_SLOT_IDS + FLAGSHIP_IDS in games.py (reuse existing symbol pools/paytables). Frontend: FLAGSHIP_ART + BASE_MACHINE_ART + FLAGSHIP_IDS in gameMeta.js. AAA tiles generated via Gemini image gen, saved /app/frontend/public/slots/tile_<id>.jpg. Verified: listed as flagship, spin returns 200, tiles render in lobby.
- PROMO VOICEOVER: generated a military-radio-comms MP3 via OpenAI TTS (tts-1-hd, voice=onyx) → /app/frontend/public/brand/wages_of_war_voiceover.mp3, wired as a "◉ RADIO BROADCAST" <audio> player under the Landing ad video (data-testid promo-voiceover). EMERGENT_LLM_KEY added to backend/.env. NOTE: full combat-SFX VIDEO (bombs/jets/machine-guns composited) is NOT possible with current tooling — user must supply finished video and we wire it in, OR use the generated voiceover over their footage.
- Advertisement video (wages_of_war_casino_promo_final.mp4) already wired on Landing MISSION BRIEFING.

STILL REQUIRES USER: click Re-publish (after .gitignore fix). Remaining 34 new slots (batches), real VAULT_API_KEY for payouts, Stripe go-live.

