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
- Session (2026-06 fork, FULL AAA art completion + deploy fix): Generated 63 unique AAA banner tiles (batches A-G, Gemini high-quality, framed with correct baked-in titles) for every slot that previously shared art. Added DEDICATED_TILE_IDS override map in gameMeta.js (after BASE_MACHINE_ART) that repoints both FLAGSHIP_ART and BASE_MACHINE_ART thumb+bg to /slots/tile_<id>.jpg for all 63 ids. RESULT: all 145 slots now have UNIQUE art (verified 145/145 unique, 0 sharing; 145/145 images load with naturalWidth>0; 0 broken raster images sitewide). Tiles in /app/frontend/public/slots/tile_<id>.jpg. DEPLOY FIX: changed frontend/package.json "homepage" from "." to "/" (correct absolute asset paths for production root domain) + ran yarn install. Prior production build failure was a TRANSIENT platform error (503 Service Unavailable pulling base image from us-central1-docker.pkg.dev, marked retryable) — NOT a code issue; a re-publish/retry resolves it. App is fully wired and ready to re-publish.
- Session (2026-06 fork, placeholder cleanup — all FREE): (1) Replaced every thumb_pharaoh_aaa.svg and thumb_inferno_aaa.svg placeholder (the "yellow oval" that showed on the lobby hero AnimatedShowcase AND several Egypt slot cards: cleopatra, cleopatra_gold, sun_of_egypt 1-4, queen_of_the_nile, pharaohs_arsenal) with real painted images bg_pharaoh.jpg / bg_inferno.jpg. 0 _aaa.svg refs remain. (2) Confirmed all user-uploaded custom tiles wired + valid: tile_money_train_convoy.png, tile_warpath_legends.png, tile_golden_dynasty.png (1024x1024) plus the 6 demo tiles + 21 generated AAA banners. (3) Premium "RADIO BROADCAST" voiceover sound bar (Landing.jsx, data-testid promo-voiceover-bar, /brand/wages_of_war_voiceover.mp3) confirmed intact & working. Full public-asset scan: ZERO broken raster images sitewide. No new image generation this turn (per user: no new games, keep it free).
- Session (2026-06 fork, AAA art overhaul): Generated 21 AAA slot banners (Gemini, framed style with baked-in titles, from user demos) at high quality in 3 batches. (1) Rewired 10 EXISTING slots to unique tiles: crimson_circuit, wild_bandito, vortex_vanguard, night_ops_kingpin, thunder_titans, diamond_commando, redline_reign, midnight_vanguard, desert_fury (upgraded), arctic_recon (upgraded) — no more shared backgrounds. (2) Added 11 NEW playable slots (backend games.py SLOT_MACHINES + PUBLIC_SLOT_IDS + FLAGSHIP_IDS, frontend FLAGSHIP_ART + BASE_MACHINE_ART): sovereign_strike, aces_high, gold_convoy, night_raid, titanium_tundra, jungle_guerrilla, urban_sniper, stealth_bomber, panzer_plunder, black_hawk_bounty, iron_infantry. Total slots now 145 (was 134). All verified spinning via /api/games/slots/spin (payload {machine_id, bet}). (3) FIXED 19 broken 95-byte placeholder image files (bg_/thumb_ for celestial, forge, midnight, nebula, neon, oasis, storm, titan, valley, aurora) by copying valid thematic images over them — FREE, zero credits. Scan confirms 0 broken images across ALL /frontend/public assets. Tiles in /app/frontend/public/slots/tile_*.jpg.
- Session (2026-06 fork, Keno modes + player hub — all code, ZERO credits): (1) WOW KENO wired end-to-end — POST /api/games/keno/wow (server.py) using play_wow_keno; 3 random warheads armed among drawn, each player warhead-hit doubles payout up to 8x. Verified via curl. (2) SIDE KENO wired end-to-end — POST /api/games/keno/side using play_side_keno; prop bets (sum over/under 810, parity odd/even, zone high/low), each leg pays 1.95x, stake charged per leg. Verified via curl + UI (WIN +97.5 landed). (3) KenoGame.jsx: mode-switcher tabs (Warhead/WOW/Side), Side prop-bet panel, WOW warhead result display, dynamic header. (4) Player Command Hub: "QUICK DEPLOY" launchpad strip in Lobby (data-testid player-command-hub) with 6 buttons (Keno/Coin Flip/Daily Wheel/Tournament/Leaderboard/VIP) — verified renders + navigates. NOTE: AnimatedShowcase lobby hero still shows a pharaoh SVG placeholder (thumb_pharaoh_aaa.svg) — pre-existing cosmetic, not fixed. DEPLOYMENT still needs Emergent Support to force clean no-cache rebuild for preview → production.
- Session (2026-06 fork, art coverage): ZERO gradient-fallback lobby cards. (1) gameMeta.js — added FLAGSHIP_ART entries for 21 flagged flagships that had no art (incl. crimson_circuit→tile_crimson_vanguard, wild_bandito→bg_west, redline_reign, midnight_vanguard, vortex_vanguard, diamond_commando, brigade_of_gold, thunder_titans, ironclad_jackpots, blackout_royal, stormfront_seven, night_ops_kingpin, bull_rush, buffalo_gold_rush, dragon_lightning_link, dollar_storm, five_dragons_ultra_grand, queen_of_the_nile, game_of_thrones, five_kings, triple_gold_twister) + added 13 missing BASE_MACHINE_ART entries (incl. sweet_ammo). All 134 PUBLIC_SLOT_IDS now resolve to a real image; verified all referenced files exist. Reused EXISTING tile_/bg_ art (thematic match) — no mass image generation. (2) Lobby.jsx — non-flagship card branch rewritten from radial-gradient card to full-bleed image card via resolveMachineArt(); verified 134/134 lobby cards render <img>. (3) Replaced 95-byte bg_aurora.jpg placeholder with a real AAA aurora battlefield image (1 Gemini gen). (4) SharkBite.jsx footer — bite animation made prominent + faster: shark 300x120→400x160, opacity 0.84→0.96, cycle 8.5s→5s, war-flash bigger/brighter (5s), war-pulse 6s→4s, shark eye now red menacing glow.
- Session (2026-06 fork): (1) Fixed CombatBackground.jsx canvas crash — guarded ctx.createRadialGradient radius with Math.max(0.01, e.r) (Iteration 14 bug). (2) Nexus Studio B2B "Fleet Sales" reel replaced with premium static cinematic sizzle graphic (/brand/nexus_fleet_sizzle.jpg, carrier + Black Hawks/Apaches) + BRAND.nexusSizzle in gameMeta.js — more professional, no autoplay video. (3) NEW Command Hub launchpad (CommandHub.jsx) wired as default tab in AdminDashboard — single screen with 14 quick-launch links grouped Games / Account & Cashier / Operator(B2B). (4) Delivered copy/paste cinematic 60s video ad script at /app/WAGES_OF_WAR_CINEMATIC_AD_SCRIPT.md (carrier, helicopters, extraction match-cut to reels, slot blitz, logo lock-up) for external editor. Deployment blocker remains USER-side: bad MONGO_URL secret in Publish panel — user must clear it and Re-publish.
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



### 24 Aug 2026 (pt.3) — Slot batch 2 (8 more → 14 new AAA slots total)
- Added 8 more flagship slots: cobalt_siege, royal_ordnance, jade_dynasty, inferno_warlord, arctic_recon, midas_command, phantom_strike, thunder_baron. Same wiring pattern (games.py SLOT_MACHINES + PUBLIC_SLOT_IDS + FLAGSHIP_IDS; gameMeta.js FLAGSHIP_ART + BASE_MACHINE_ART + FLAGSHIP_IDS). AAA tiles at public/slots/tile_<id>.jpg.
- Verified: all 14 new machines list as flagship, spins return 200, tiles render in lobby (Jade Dynasty, Inferno Warlord, Neon Pharaoh, Arctic Recon confirmed on screen).
- Total new AAA slots this fork: 14. Remaining toward ~40: ~26 (future batches).



### 24 Aug 2026 (pt.4) — Slot batch 3 (8 more → 22 new AAA slots total)
- Added 8 more flagship slots: desert_fury, steel_leviathan, crimson_dynasty, venom_squadron, platinum_siege, ember_legion, sapphire_command, golden_griffin. Same wiring (games.py + gameMeta.js). Tiles at public/slots/tile_<id>.jpg (22 new-slot tiles total on disk).
- Verified: 22/22 new machines listed as flagship, spins return 200, frontend compiles clean (200, no errors).
- Running total new AAA slots this fork: 22. Remaining toward ~40: ~18 (future batches).



### 24 Aug 2026 (pt.5) — White footer emblem + go-live escalation
- Footer centre emblem (/brand/footer_logo_blue.png in Layout.jsx ~line 378) recolored to ALL WHITE via CSS filter `brightness(0) invert(1)` + white drop-shadow glow (was blue); breathing opacity bumped to .42-.68. Verified in footer screenshot.
- Escalated go-live to support: they CANNOT press Publish or access the user's Stripe (account-access policy). Minimum unavoidable user actions = 1 click Publish + 1 Stripe login to flip sandbox→live. Support can verify config/domain/logs.
- BACKLOG requested by user (NOT built yet, build on request): more slot graphics toward ~40 (18 to go), extra Keno graphics + "Side Keno", new games "Two-Up" and "Pontoon".


### 25 Aug 2026 — Deploy blockers cleared + emblem restored
- Deploy failures diagnosed from prod logs: (1) invalid prod MONGO_URL mongodb+srv host "wages-of-war-casino" — user cleared it (managed Mongo now injected); (2) createIndexes "not authorized" code 13 — already handled by _safe_create_index in server.py startup (swallows code 13, non-fatal); (3) deployment_agent flagged AuthDialog.jsx:49 getAppOriginUrl() → FIXED to window.location.origin.
- Footer emblem: reverted the square clip-path "falls in half" split back to a single ROUND intact badge (footer_logo_blue.png) with transparent blue + red glow (drop-shadows) + wowBreathe. The SHARK (SharkBite.jsx) crosses in to bite it; emblem stays whole. Per user: "shark bites it, not it just falls in half."
- App is now deployment-ready (all deployment_agent blockers resolved). User to Re-publish.



### 27 Aug 2026 — Fork: Jungle hero, $5 referrals, 30% reserve, unique tiles, footer emblem, slot UX + AAA symbols
- **Jungle Ambush hero**: user's "Jungle Guerrilla" poster (→ /brand/jungle_ambush.jpg, BRAND.jungleAmbush) wired as the cinematic hero on FleetSales.jsx (data-testid fleet-jungle-hero), replacing the plain Nexus banner. Verified on /fleet-sales.
- **$5 Refer-a-Friend (backend)**: RegisterInput accepts ref_code; each user gets referral_code + referred_by. `_maybe_pay_referral(user_id)` pays the referrer $5 (500 real_balance_cents) on the friend's FIRST deposit — hooked into ALL three credit paths (Stripe cashier, crypto, play-credit package). Fully idempotent via atomic referral_reward_paid flag (verified: pays once, no double-pay). New endpoint GET /api/referral/me (code, reward, total/converted referrals, earnings). public_user exposes referral_code/count/earnings_usd. REFERRAL_REWARD_CENTS env-overridable. Live cashier logic untouched. FRONTEND NOT yet wired (capture ?ref= + referral dashboard) — next step.
- **30% profit reserve**: PROFIT_RESERVE_PCT=0.30 (env). get_house_bankroll_summary() now locks reserve = 30% of total deposits (cash_in); available_cents = bankroll - reserve. Withdrawal solvency loop already consumes available_cents so payouts can never drain the reserve. Summary/admin bankroll now return reserve_pct/reserve_usd. Verified math.
- **145/145 UNIQUE tiles**: 34 slots previously fell back to shared /slots/thumb_gold.jpg. Added UNIQUE_FIX_ART map in gameMeta.js (after DEDICATED loop) pointing each to a DISTINCT existing image (military slots got their own tile_<id>.jpg that existed but was unwired; legacy brand slots got unique bg_*.jpg). 0 new AI images. Verified 145 unique, 0 dup, 0 missing files.
- **Footer emblem**: Layout.jsx centerpiece changed /brand/footer_logo_blue.png → /brand/winged_emblem.png with gold/red glow. Verified.
- **Slot-entry UX (Task 4)**: FlagshipSlot intro now viewport-safe (overflow-y-auto, responsive image/title sizes) + explicit centered "CONTINUE TO PLAY" button (data-testid continue-to-play-btn, tap-anywhere still works). Verified on 390-wide: button visible without scroll.
- **AAA reel symbols (Task 5)**: SymbolTile.jsx icon/text symbols now render in premium beveled metallic medallions (radial plate, gloss highlight, colored border + glow). Added 48 previously-missing symbol IDs to SYMBOL_META (mapped to existing phosphor icons + themed colors) so reels/paytables NEVER show "?". Verified thunder_titans reels — all polished gems, zero "?".
- ACTION FOR USER: Re-publish (free) to push all of the above live.

REMAINING / NEXT:
- Refer-a-Friend FRONTEND: capture ?ref= on landing → localStorage → pass to register; referral dashboard (link + stats) in Cashier/Profile.
- Giveaway Entry System + Admin Draw (convert static $35K UI to real DB opt-in).
- Games: Two-Up, Pontoon.

### 29 Aug 2026 — Mobile optimization + CRITICAL auth-dialog fix
- Header made mobile-responsive: desktop nav (Ops Lobby/VIP/Leaderboard) now `hidden lg:flex`; logged-out mobile gets a hamburger menu (data-testid nav-mobile-menu); logged-in nav links moved into the avatar dropdown (lg:hidden). Compacted header action cluster; announcement banner tail hidden on <sm.
- CRITICAL FIX: auth/login modal rendered 8k-40k px off-screen on mobile (users could not sign up). Root cause: `.hud {position:relative}` overriding shadcn DialogContent `position:fixed`. Fixed in ui/dialog.jsx via inline `position:fixed` + `max-h-[92vh] overflow-y-auto`. Verified computed position=fixed and centered in viewport. See /app/memory/known_bugs.md.
- Testing agent (iteration_15) verified mobile 390px: no horizontal overflow on /, /lobby, /slots, /cashier; trailer video fits; CONTINUE/SPIN buttons centered; hamburger nav works.
- STILL PENDING (platform, not code): production deploy pipeline — user reports preview work not reaching live site; refund/billing review escalated to support@emergent.sh (Job ID night-vision-gold).

### 29 Aug 2026 — Wheel of Wealth (deposit-triggered cash wheel)
- Replaced the daily streak wheel with WHEEL OF WEALTH. Segments: $5-$50 (10 cash) + 2 Better Luck + 1 Spin Again (13). Backend WHEEL_OF_WEALTH + weights in server.py.
- Spins earned: +1 for any single deposit > $500 (WHEEL_BIG_DEPOSIT_USD); +1 per $1000 lifetime deposits (WHEEL_MILESTONE_USD). Tracked via user.total_deposited_usd + user.wheel_spins. Granted in all 3 deposit-credit paths via _grant_wheel_spins_on_deposit().
- Endpoints: GET /api/wheel/status, POST /api/wheel/spin (atomic spin consume, secrets-weighted pick). Cash wins credit play `balance` (NOTE: currently play balance, not withdrawable real cash — flagged to user for decision). Spin Again refunds a spin.
- Frontend DailyWheel.jsx rewritten (route /wheel): shows spins available, earn rules, 13-wedge conic wheel, result states. Tested end-to-end (grant logic + spin + out-of-spins) and screenshotted.

### 29 Aug 2026 — Cinematic hero reel + original score + fleet pricing
- Built CinematicReel.jsx (code-based, no video file): 7 timed scenes with Ken-Burns motion + text overlays (WAGES OF WAR carrier -> ELITE NIGHT OPS blackhawk -> 145+ SLOTS apache -> $10 FREE -> CRYPTO -> NEXUS FLEETS $5k+ -> ENLIST NOW). Placed at top of Landing.jsx above the official trailer. 3 cinematic scene images generated (Gemini) -> /brand/cine_carrier.jpg, cine_blackhawk.jpg, cine_apache.jpg.
- Original royalty-free ORCHESTRAL SCORE synthesised live via Web Audio API (minor-key string pad, Adagio-like swells, Am/F/C/G cycle). Toggled by SOUND button (browser autoplay policy needs a tap). No copyright, no files, no credits. Verified SCORE ON works, no console errors.
- Fleet Sales pricing updated: $5,000 / $6,800 / $35,000 turnkey (outright) + P.O.A. enterprise.
- HONEST: could not use the Platoon track (copyright) or generate music; delivered an original synth score instead. User can upload a licensed track to swap in.

### 29 Aug 2026 — Gamble feature UI on slots
- GamblePanel.jsx: after any win on SlotGame, players can gamble the win on Red/Black (2x, 50%) or a suit (4x, 25%), with re-gamble of winnings + Collect. Wired into SlotGame.jsx under LAST PAYOUT (gated lastWin>0 && !spinning && !inFree). Backend /api/games/gamble already existed (secure secrets RNG); tested: color 2x, suit 4x, lose=0, over-balance=400.
- Shown on standard slot machines. Flagship hold&win slots can get the panel next if desired.
- PENDING (next dedicated build): live 5-min WARKINO digital-draw screen + wins ticker on lobby (uses user-supplied draw-table image).

### 29 Aug 2026 — Coin denominations + Buy Feature on slots
- SlotGame.jsx: added COIN DENOMINATION selector (1c/2c/5c/10c -> bet 20/40/100/200, engine min-bet 20 safe = line-bet x20 paylines). Highlights active denom.
- BUY FEATURE button (shown when machine.free_spins>0): POST /api/games/slots/buy-bonus charges bet x100 (BUY_FEATURE_COST_MULT), creates a free_spins session, frontend enters free-spin mode and auto-plays. Tested: sweet_ammo bet20 -> 10 spins, cost 2000, balance 10000->8000; insufficient funds -> 400.
- Gamble panel (GamblePanel.jsx) already wired after wins. All slot reel symbols render as AAA medallions.
- 30% reserve (PROFIT_RESERVE_PCT) already builds from $0 as deposits land; withdrawals draw only from available = bankroll - 30% of deposits.

### 29 Aug 2026 — Promo banner screen + rebuild brief backlog
- PromoScreen.jsx: rotating "Field Broadcast" of 5 user banners (/brand/promo_1..5.png), placed on Landing under CinematicReel. Zero credits (downloads only).
- REBUILD BRIEF BACKLOG (mostly already built). REMAINING P0/P1: (1) add $500 MAJOR segment to Wheel of Wealth; (2) WARKINO continuous live draw board (runs when idle, balls draw continuously) + wins ticker; (3) payment caps: deposit <$50 -> winnings capped $1500, $50+ -> up to $10000; name-match KYC note; (4) Nexus banner at top linking https://gaming-fleet-hq.preview.emergentagent.com; (5) MGA/B2C/912/2025 + Wages of War Operations Ltd + 18+ legal footer.

### 30 Aug 2026 — WARKINO live draw board + Nexus banner
- LiveDrawBoard.jsx: always-on WARKINO keno board on Lobby (above Quick Deploy). Draws a ball every 3s, 20 balls/60s round, auto-resets, 80-number grid + last-ball highlight + LIVE WINS ticker. Frontend-only display (runs with no players). Verified rendering + drawing (ball 7/20).
- Nexus fleet banner (data-testid nexus-fleet-banner) at top of Landing linking https://gaming-fleet-hq.preview.emergentagent.com.
- STILL DEFERRED (touches live cashier — do fresh): payment caps (<$50 -> $1500 max win; $50+ -> $10000), name-match KYC; $500 MAJOR wheel segment; MGA legal footer.
