"""Static audit: every public slot id must resolve to an existing tile image asset."""
import json
import os
import re
import subprocess

import requests
from dotenv import dotenv_values

BASE_URL = dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"].rstrip("/")
META = open("/app/frontend/src/data/gameMeta.js").read()
PUB = "/app/frontend/public"


def block(name):
    m = re.search(rf"(?:export )?const {name} = \{{", META)
    start = m.end()
    depth = 1
    i = start
    while depth:
        if META[i] == "{":
            depth += 1
        elif META[i] == "}":
            depth -= 1
        i += 1
    return META[start:i]


def keys_and_thumbs(name):
    body = block(name)
    out = {}
    for km in re.finditer(r"^  ([A-Za-z0-9_]+):\s*\{", body, re.M):
        key = km.group(1)
        seg = body[km.end():body.find("\n  }", km.end()) + 4] if "\n  }" in body[km.end():] else body[km.end():km.end() + 400]
        tm = re.search(r'thumb:\s*"([^"]+)"', seg)
        out[key] = tm.group(1) if tm else None
    return out


fa = keys_and_thumbs("FLAGSHIP_ART")
ba = keys_and_thumbs("BASE_MACHINE_ART")
slots = requests.get(f"{BASE_URL}/api/games/slots", timeout=30).json()
print(f"backend slots: {len(slots)}  FLAGSHIP_ART: {len(fa)}  BASE_MACHINE_ART: {len(ba)}")

missing_art, missing_file = [], []
for s in slots:
    sid = s["id"]
    thumb = fa.get(sid) or ba.get(sid)
    if not thumb:
        missing_art.append((sid, s["is_flagship"]))
        continue
    p = os.path.join(PUB, thumb.lstrip("/"))
    if not os.path.exists(p) or os.path.getsize(p) < 1000:
        missing_file.append((sid, thumb, os.path.exists(p)))

print("\n=== ids with NO art entry (fallback /slots/thumb_gold.jpg) ===")
print(json.dumps(missing_art, indent=1))
print(f"count={len(missing_art)}")
print("\n=== art entries pointing at missing/empty files ===")
print(json.dumps(missing_file, indent=1))
print(f"count={len(missing_file)}")

fb = os.path.join(PUB, "slots/thumb_gold.jpg")
print(f"\nfallback thumb_gold.jpg exists={os.path.exists(fb)} size={os.path.getsize(fb) if os.path.exists(fb) else 0}")

NEW22 = ["solar_vanguard", "obsidian_empire", "neon_pharaoh", "crimson_vanguard", "golden_atlas",
         "emerald_guardian", "cobalt_siege", "royal_ordnance", "jade_dynasty", "inferno_warlord",
         "arctic_recon", "midas_command", "phantom_strike", "thunder_baron", "desert_fury",
         "steel_leviathan", "crimson_dynasty", "venom_squadron", "platinum_siege", "ember_legion",
         "sapphire_command", "golden_griffin"]
print("\n=== the 22 new flagships ===")
ids = {s["id"] for s in slots}
for n in NEW22:
    thumb = fa.get(n) or ba.get(n)
    ok = thumb and os.path.exists(os.path.join(PUB, thumb.lstrip("/")))
    print(f"{n:22} in_api={n in ids} thumb={thumb} file_ok={bool(ok)}")
