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

## Next Tasks
- Provide VAULT_API_KEY (external approval vault) and optional STRIPE_WEBHOOK_SECRET to complete the last two live connections.

## Live Keys Applied (2026-06)
- STRIPE_SECRET_KEY + STRIPE_PUBLISHABLE_KEY: user's own test-mode keys (account 51U0tKa...), verified creating real cs_test checkout sessions.
- NOWPAYMENTS_API_KEY: user's PRODUCTION key + NOWPAYMENTS_IPN_SECRET set; NOWPAYMENTS_BASE_URL switched to https://api.nowpayments.io/v1. Verified creating REAL crypto deposit addresses (BTC/USDT-TRC20).
- SAFETY FIX: np_create_payment no longer returns a fake sandbox address on failure when a live key is set — it raises CryptoProviderError (HTTP 502) so players never see a dead deposit address. Sandbox mock only for placeholder keys. Added NP_CURRENCY_MAP (USDT->usdttrc20 etc).
- /cashier/summary now returns crypto_live + vault_live flags; Cashier banner shows "DEPOSITS LIVE" and notes withdrawals use in-app admin approval until VAULT_API_KEY is live.
- Still placeholder: VAULT_API_KEY (withdrawals stay pending for in-app admin approve/reject) and STRIPE_WEBHOOK_SECRET (deposit crediting covered by polling).
