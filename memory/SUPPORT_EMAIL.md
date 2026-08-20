To: support@emergent.sh
Subject: Production deployment serving OLD build — wrong deployment appears active for wagesofwarcasin0.online

Hi Emergent Support,

My deployments say "successful," but my live production site is still serving an OLD build. None of my recent, completed upgrades appear on production even after hard-refresh and Incognito.

App / environment details:
- App (preview) slug: night-vision-gold
- Preview URL: https://night-vision-gold.preview.emergentagent.com
- Production domain: https://wagesofwarcasin0.online
- Job ID: <PASTE YOUR JOB ID HERE — the "i" button, top-right of the chat>

What I believe is happening:
It looks like there may be TWO deployments / instances, and the WRONG one is active on my production domain — it's only serving "half" the app. I want the "night-vision-gold" build to be the ACTIVE deployment for wagesofwarcasin0.online, and any duplicate/old deployment removed.

Confirmed on my side (by the build/deploy checks):
- The preview build is complete and correct.
- Deployment readiness health check = PASS (no blockers).
- All graphics assets are present and git-tracked; nothing is excluded by .gitignore/.dockerignore.
- The live site shows the old version EVEN in Incognito (so it's not just my browser cache).

What is MISSING on production (present and working in preview):
- Slot lobby tile graphics / thumbnails (82 slots, 44 flagships)
- The Cashier / payment section (Stripe card + NOWPayments crypto deposits + withdrawals)
- KYC / Identity Verification (Stripe Identity)
- Keno graphics (warhead/blast numbers + war-room background)
- Slot/"pokies" artwork including Money Train, Golden Dynasty, Wild West Recon
- Coin denomination graphics
- Daily Streak Wheel (/wheel) and Live Tournament (/tournament) pages
- Giveaway countdown/draw timer
- Footer underwater scene + site-wide war-map background

Please can you:
1. Confirm which deployment currently serves wagesofwarcasin0.online.
2. Re-map the domain to the correct "night-vision-gold" deployment (latest checkpoint).
3. Delete/remove the wrong/duplicate deployment.
4. Force a clean rebuild if a stale build cache is involved.

I've attached screenshots of the missing sections. Happy to trigger a fresh republish on request.

Thank you,
<YOUR NAME>
