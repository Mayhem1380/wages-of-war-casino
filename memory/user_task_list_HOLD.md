# WAGES OF WAR — USER TASK LIST (ON HOLD — DO NOT START UNTIL USER SAYS "READY")

STATUS: WAITING. User explicitly instructed: do nothing until they say they are ready.
Hold all of this in memory. User is building the full list and will confirm "go".

## User's written-commitment request
User wants a commitment that the list will be completed once and for all with the
balance they have left, and that work is SAVED and not repeated (past work was lost /
paid for multiple times). Commit to: save all changes to the repo, work efficiently,
no repeated/duplicate work.

## Known context already in the codebase
- 20 new slots merged from GitHub copilot/main and renamed to user names (Ghost Squadron,
  Depth Charge Riches, Midnight Marauders, Abyssal Ambush, Titanium Tundra, Silent Strike,
  Neon Kraken, Ironclad Infantry, Vortex Vanguard, Crimson Circuit, Sapphire Siege,
  Emerald Guardian, Phantom Platoon, Stormbreaker Slots, Golden Grunt, Reaper Reels,
  Blackout Battalion, Trident Tactical, Oceanic Overlord, Hellfire Harpoon).
- 166 public slots total. Backend games.py holds SLOT_MACHINES + PUBLIC_SLOT_IDS.
- Full current tile/bg mapping CSV was provided by user (game_id,game_title,accent,
  current_tile_file,current_background_file,feature_tag) — this is the source-of-truth
  reference for which slot uses which /slots/*.jpg image. (Stored from user message.)

## TASK 1 (confirmed as "number one")
"The ships — there's many — go in those tiles, with the SAME price that's already on them.
Do NOT change the price, just put the ships in those tiles."
- Refers to the Fleet cards screenshot: LIGHT FLEET $1,500 (patrol boat), MID-SCALE $4,500
  (destroyer), HEAVY / Custom (aircraft carrier).
- Interpretation to CONFIRM with user before building: place the ship artwork into the
  fleet tiles (Fleet Sales / Nexus Fleet page) while keeping existing prices unchanged.
- NEED FROM USER: which exact ship images go on which tiles (they said "there's many").

## REMAINING TASKS
- User will provide the rest of the list before saying "ready". Append here as they come.

## RULES WHEN USER SAYS GO
- Do the whole list in one pass, then verify, then report. Save everything.
- Keep existing prices intact on fleet tiles.
- No image generation without explicit OK (user is credit-sensitive).
