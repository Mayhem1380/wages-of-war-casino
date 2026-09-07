# Wages of War Casino — Deployment Manifest
Source build: `night-vision-gold` (preview). Catalog counts are sourced from the current backend; production health, tests, payments, and deployment remain environment-dependent.
This is the release inventory for production (https://wagesofwarcasin0.online) after deploy.

## Pages / Routes (should all load)
- / (Landing)            - /lobby (search + category tabs + Live Ops cards)
- /slots/:id (slot game) - /keno                 - /coinflip
- /wheel (Daily Streak Wheel)   - /tournament (Live Tournament)
- /leaderboard           - /vip                  - /wallet
- /cashier (deposits/withdrawals + KYC)          - /kyc
- /profile               - /admin                - /fleet-sales
- /payment/success
- Legal: /terms, /privacy, /responsible-gambling, /age-verification,
  /cookie-policy, /aml-policy, /bonus-terms, /responsible-gaming

## Games / Content
- 145 public slot machines (87 AAA flagships) with Hold & Win, jackpots, and free spins
- Keno — war-room background + warhead/blast number graphics
- Coin Flip — grenade (heads) / knife (tails) coins over armory-vault background

## Graphics that must be live
- Slot backgrounds incl. new landscapes: bg_train.jpg (Money Train),
  bg_dynasty.jpg (Golden Dynasty), bg_west.jpg (Wild West Recon)
- Slot lobby tile thumbnails (all slots)
- Keno: keno_warhead.png, keno_blast.png, keno_bg.jpg
- Coin Flip: coin_heads.png, coin_tails.png, coinflip_bg.jpg
- Footer: footer_underwater.jpg (diver + shark + emblem) with bubble/lunge motion
- Site-wide holographic war-map background (warmap_bg.jpg)
- Header live-combat backdrop (muzzle flashes/tracers, logged-in)

## Features
- Dual-logic wallet: play-money credits + real-money (cents) balance
- Cashier: Stripe card deposits + NOWPayments crypto deposits + withdrawals
- KYC / Identity Verification (Stripe Identity, 18+ gate) — blocks withdrawals until verified
- Daily Streak Wheel (free daily spin, 500–50,000, x2 on 7-day streak)
- Live Tournament "Operation High Roller" (5,000,000 pool, 24h rolling, top-10 payout)
- Win celebrations (coin rain + confetti + screen shake)
- Lobby search bar + category tabs (All/Dragons/Fortune/Military/Egyptian/Ocean)
- Daily Supply Drop bonus, VIP tiers, leaderboards
- Giveaway countdown timer (configured in the current release)
- Admin dashboard (users, transactions, withdrawal approval vault)

## Backend API (all under /api)
- Auth: /auth/register, /auth/login, /auth/me, Google session
- Games: /games/slots, /games/slots/spin, /games/keno/play, /games/coinflip, /games/gamble
- Wheel: /wheel/status, /wheel/spin
- Tournament: /tournament/current
- Cashier: /cashier/deposit/stripe, /cashier/deposit/crypto, /cashier/withdraw, /cashier/summary
- KYC: /kyc/session, /kyc/status
- Webhooks: /stripe/webhook, /webhooks/nowpayments
- Bonus/VIP/Leaderboard endpoints
- /health (K8s probe)

## Integrations
- Stripe (card) — test mode until live keys are explicitly configured
- NOWPayments (crypto)
- Stripe Identity (KYC)
- Emergent-managed Google Auth
- Gemini (image gen, build-time only)

## Production env keys to confirm
- FRONTEND_URL = https://wagesofwarcasin0.online  (NOT the preview URL)
- CORS_ORIGINS = https://wagesofwarcasin0.online   | ADMIN_EMAIL / ADMIN_PASSWORD set
- Stripe keys (test now; swap to live for real payments)
