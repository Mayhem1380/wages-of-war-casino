"""Wages of War Casino - Provably-styled game engine (play money).
Server-authoritative RNG for slots and keno.
"""
import secrets

# ---------------------------------------------------------------------------
# SLOT ENGINE
# 5 reels x 3 rows, 20 fixed paylines. Wild substitutes (not scatter).
# 3+ scatters anywhere -> free spins + scatter pay.
# ---------------------------------------------------------------------------

PAYLINES = [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0],
    [2, 2, 2, 2, 2],
    [0, 1, 2, 1, 0],
    [2, 1, 0, 1, 2],
    [0, 0, 1, 2, 2],
    [2, 2, 1, 0, 0],
    [1, 0, 0, 0, 1],
    [1, 2, 2, 2, 1],
    [0, 1, 1, 1, 0],
    [2, 1, 1, 1, 2],
    [1, 0, 1, 2, 1],
    [1, 2, 1, 0, 1],
    [0, 1, 0, 1, 0],
    [2, 1, 2, 1, 2],
    [1, 1, 0, 1, 1],
    [1, 1, 2, 1, 1],
    [0, 0, 1, 0, 0],
    [2, 2, 1, 2, 2],
    [0, 2, 0, 2, 0],
]

# Symbol catalogue (id -> display metadata handled on the frontend).
# Machines pick a subset with per-reel weights and a paytable.
# paytable: multiplier of the PER-LINE bet for 3/4/5 of a kind.

def _machine(mid, name, tagline, theme, volatility, symbols, wild, scatter, paytable, scatter_pay, free_spins, popularity):
    return {
        "id": mid,
        "name": name,
        "tagline": tagline,
        "theme": theme,
        "volatility": volatility,
        "symbols": symbols,          # {sym_id: weight}
        "wild": wild,
        "scatter": scatter,
        "paytable": paytable,        # {sym_id: {"3":x,"4":y,"5":z}}
        "scatter_pay": scatter_pay,  # {"3":x,"4":y,"5":z} * total bet
        "free_spins": free_spins,
        "popularity": popularity,
        "paylines": len(PAYLINES),
        "rows": 3,
        "reels": 5,
    }


SLOT_MACHINES = {
    "gates_of_glory": _machine(
        "gates_of_glory", "Gates of Glory", "Ascend the tactical pantheon", "olympus",
        "High",
        {"crown": 5, "orb": 6, "chalice": 7, "ring": 8, "hourglass": 10, "gem_red": 12, "gem_blue": 12, "gem_green": 14, "gem_purple": 14, "wild": 4, "scatter": 4},
        "wild",
        "scatter",
        {
            "crown": {"3": 10, "4": 25, "5": 50},
            "orb": {"3": 5, "4": 15, "5": 40},
            "chalice": {"3": 4, "4": 10, "5": 25},
            "ring": {"3": 3, "4": 8, "5": 20},
            "hourglass": {"3": 2, "4": 5, "5": 12},
            "gem_red": {"3": 1.5, "4": 4, "5": 10},
            "gem_blue": {"3": 1, "4": 3, "5": 8},
            "gem_green": {"3": 0.8, "4": 2, "5": 6},
            "gem_purple": {"3": 0.5, "4": 1.5, "5": 5},
        },
        {"3": 3, "4": 10, "5": 50},
        10,
        100,
    ),
    "book_of_ops": _machine(
        "book_of_ops", "Book of Ops", "Uncover the classified expanding relic", "adventure",
        "High",
        {"explorer": 5, "idol": 6, "scarab": 8, "ace": 12, "king": 12, "queen": 13, "jack": 14, "ten": 15, "book": 6},
        "book",   # book is wild + scatter combined (classic)
        "book",
        {
            "explorer": {"3": 10, "4": 40, "5": 200},
            "idol": {"3": 5, "4": 20, "5": 100},
            "scarab": {"3": 4, "4": 15, "5": 75},
            "ace": {"3": 1, "4": 5, "5": 25},
            "king": {"3": 1, "4": 5, "5": 25},
            "queen": {"3": 0.5, "4": 3, "5": 15},
            "jack": {"3": 0.5, "4": 3, "5": 15},
            "ten": {"3": 0.5, "4": 2, "5": 10},
        },
        {"3": 2, "4": 20, "5": 200},
        10,
        95,
    ),
    "big_bass_bombardment": _machine(
        "big_bass_bombardment", "Big Bass Bombardment", "Reel in the heavy ordnance", "fishing",
        "Medium",
        {"fisherman": 5, "boat": 7, "rod": 8, "box": 9, "ace": 11, "king": 12, "queen": 13, "jack": 14, "ten": 15, "wild": 4, "scatter": 4},
        "wild",
        "scatter",
        {
            "fisherman": {"3": 8, "4": 20, "5": 50},
            "boat": {"3": 4, "4": 12, "5": 30},
            "rod": {"3": 3, "4": 8, "5": 20},
            "box": {"3": 2, "4": 6, "5": 15},
            "ace": {"3": 1, "4": 4, "5": 10},
            "king": {"3": 0.8, "4": 3, "5": 8},
            "queen": {"3": 0.6, "4": 2, "5": 6},
            "jack": {"3": 0.5, "4": 1.5, "5": 5},
            "ten": {"3": 0.4, "4": 1, "5": 4},
        },
        {"3": 3, "4": 10, "5": 25},
        10,
        90,
    ),
    "wild_west_recon": _machine(
        "wild_west_recon", "Wild West Recon", "Frontier firefight bonanza", "western",
        "Medium",
        {"sheriff": 5, "revolver": 7, "boot": 8, "horseshoe": 9, "ace": 11, "king": 12, "queen": 13, "jack": 14, "ten": 15, "wild": 4, "scatter": 4},
        "wild",
        "scatter",
        {
            "sheriff": {"3": 7, "4": 18, "5": 45},
            "revolver": {"3": 4, "4": 12, "5": 28},
            "boot": {"3": 3, "4": 8, "5": 18},
            "horseshoe": {"3": 2, "4": 6, "5": 14},
            "ace": {"3": 1, "4": 4, "5": 10},
            "king": {"3": 0.8, "4": 3, "5": 8},
            "queen": {"3": 0.6, "4": 2, "5": 6},
            "jack": {"3": 0.5, "4": 1.5, "5": 5},
            "ten": {"3": 0.4, "4": 1, "5": 4},
        },
        {"3": 2, "4": 8, "5": 20},
        8,
        82,
    ),
    "sweet_ammo": _machine(
        "sweet_ammo", "Sweet Ammo", "Sugar-coated tumble multipliers", "candy",
        "High",
        {"heart": 6, "square": 7, "circle": 8, "grape": 10, "plum": 11, "apple": 12, "banana": 13, "candy": 14, "wild": 4, "scatter": 4},
        "wild",
        "scatter",
        {
            "heart": {"3": 10, "4": 25, "5": 50},
            "square": {"3": 6, "4": 15, "5": 30},
            "circle": {"3": 4, "4": 10, "5": 24},
            "grape": {"3": 3, "4": 8, "5": 16},
            "plum": {"3": 2, "4": 5, "5": 12},
            "apple": {"3": 1.5, "4": 4, "5": 10},
            "banana": {"3": 1, "4": 3, "5": 8},
            "candy": {"3": 0.5, "4": 2, "5": 5},
        },
        {"3": 3, "4": 12, "5": 60},
        10,
        88,
    ),
    "money_train_convoy": _machine(
        "money_train_convoy", "Money Train Convoy", "Armoured payload heist", "heist",
        "Extreme",
        {"vault": 4, "loco": 6, "gunner": 7, "coin": 9, "ace": 12, "king": 13, "queen": 14, "jack": 15, "wild": 4, "scatter": 4},
        "wild",
        "scatter",
        {
            "vault": {"3": 12, "4": 30, "5": 75},
            "loco": {"3": 6, "4": 18, "5": 40},
            "gunner": {"3": 4, "4": 12, "5": 25},
            "coin": {"3": 2, "4": 6, "5": 15},
            "ace": {"3": 1, "4": 4, "5": 10},
            "king": {"3": 0.8, "4": 3, "5": 8},
            "queen": {"3": 0.6, "4": 2, "5": 6},
            "jack": {"3": 0.5, "4": 1.5, "5": 5},
        },
        {"3": 2, "4": 10, "5": 100},
        12,
        78,
    ),
    "pharaohs_arsenal": _machine(
        "pharaohs_arsenal", "Pharaoh's Arsenal", "Unearth the buried war relic", "egypt",
        "High",
        {"pharaoh": 5, "anubis": 6, "eye_ra": 8, "ace": 12, "king": 12, "queen": 13, "jack": 14, "ten": 15, "ankh": 6},
        "ankh",   # ankh is wild + scatter combined (expanding relic style)
        "ankh",
        {
            "pharaoh": {"3": 10, "4": 40, "5": 200},
            "anubis": {"3": 5, "4": 20, "5": 100},
            "eye_ra": {"3": 4, "4": 15, "5": 75},
            "ace": {"3": 1, "4": 5, "5": 25},
            "king": {"3": 1, "4": 5, "5": 25},
            "queen": {"3": 0.5, "4": 3, "5": 15},
            "jack": {"3": 0.5, "4": 3, "5": 15},
            "ten": {"3": 0.5, "4": 2, "5": 10},
        },
        {"3": 2, "4": 20, "5": 200},
        10,
        91,
    ),
    "kraken_depths": _machine(
        "kraken_depths", "Kraken Depths", "Depth-charge the abyss payload", "naval",
        "Medium",
        {"kraken": 5, "harpoon": 7, "pearl": 8, "shell": 9, "ace": 11, "king": 12, "queen": 13, "jack": 14, "ten": 15, "wild": 4, "scatter": 4},
        "wild",
        "scatter",
        {
            "kraken": {"3": 8, "4": 20, "5": 50},
            "harpoon": {"3": 4, "4": 12, "5": 30},
            "pearl": {"3": 3, "4": 8, "5": 20},
            "shell": {"3": 2, "4": 6, "5": 15},
            "ace": {"3": 1, "4": 4, "5": 10},
            "king": {"3": 0.8, "4": 3, "5": 8},
            "queen": {"3": 0.6, "4": 2, "5": 6},
            "jack": {"3": 0.5, "4": 1.5, "5": 5},
            "ten": {"3": 0.4, "4": 1, "5": 4},
        },
        {"3": 3, "4": 10, "5": 25},
        10,
        86,
    ),
    "inferno_airstrike": _machine(
        "inferno_airstrike", "Inferno Airstrike", "Scorched-earth jackpot barrage", "inferno",
        "Extreme",
        {"jet": 4, "missile": 6, "bomb_sym": 7, "flame": 9, "ace": 12, "king": 13, "queen": 14, "jack": 15, "wild": 4, "scatter": 4},
        "wild",
        "scatter",
        {
            "jet": {"3": 12, "4": 30, "5": 75},
            "missile": {"3": 6, "4": 18, "5": 40},
            "bomb_sym": {"3": 4, "4": 12, "5": 25},
            "flame": {"3": 2, "4": 6, "5": 15},
            "ace": {"3": 1, "4": 4, "5": 10},
            "king": {"3": 0.8, "4": 3, "5": 8},
            "queen": {"3": 0.6, "4": 2, "5": 6},
            "jack": {"3": 0.5, "4": 1.5, "5": 5},
        },
        {"3": 2, "4": 10, "5": 100},
        12,
        84,
    ),
    "frozen_front": _machine(
        "frozen_front", "Frozen Front", "Arctic recon sticky-wild assault", "arctic",
        "High",
        {"yeti": 5, "wolf": 7, "snow": 8, "peak": 9, "ace": 11, "king": 12, "queen": 13, "jack": 14, "ten": 15, "wild": 4, "scatter": 4},
        "wild",
        "scatter",
        {
            "yeti": {"3": 8, "4": 20, "5": 50},
            "wolf": {"3": 4, "4": 12, "5": 28},
            "snow": {"3": 3, "4": 8, "5": 18},
            "peak": {"3": 2, "4": 6, "5": 14},
            "ace": {"3": 1, "4": 4, "5": 10},
            "king": {"3": 0.8, "4": 3, "5": 8},
            "queen": {"3": 0.6, "4": 2, "5": 6},
            "jack": {"3": 0.5, "4": 1.5, "5": 5},
            "ten": {"3": 0.4, "4": 1, "5": 4},
        },
        {"3": 2, "4": 8, "5": 20},
        8,
        81,
    ),
    "golden_dynasty": _machine(
        "golden_dynasty", "Golden Dynasty", "Imperial fortune barrage", "dynasty",
        "Extreme",
        {"emperor": 5, "lantern": 7, "fan": 8, "coin": 9, "ace": 12, "king": 13, "queen": 14, "jack": 15, "wild": 4, "scatter": 4},
        "wild",
        "scatter",
        {
            "emperor": {"3": 12, "4": 30, "5": 75},
            "lantern": {"3": 6, "4": 18, "5": 40},
            "fan": {"3": 4, "4": 12, "5": 25},
            "coin": {"3": 2, "4": 6, "5": 15},
            "ace": {"3": 1, "4": 4, "5": 10},
            "king": {"3": 0.8, "4": 3, "5": 8},
            "queen": {"3": 0.6, "4": 2, "5": 6},
            "jack": {"3": 0.5, "4": 1.5, "5": 5},
        },
        {"3": 2, "4": 10, "5": 88},
        12,
        77,
    ),
    "samurai_strike": _machine(
        "samurai_strike", "Samurai Strike", "Bushido blade free-spin assault", "bushido",
        "High",
        {"shogun": 5, "katana": 7, "moon_jp": 8, "crane": 9, "ace": 11, "king": 12, "queen": 13, "jack": 14, "ten": 15, "wild": 4, "scatter": 4},
        "wild",
        "scatter",
        {
            "shogun": {"3": 8, "4": 20, "5": 50},
            "katana": {"3": 4, "4": 12, "5": 30},
            "moon_jp": {"3": 3, "4": 8, "5": 20},
            "crane": {"3": 2, "4": 6, "5": 15},
            "ace": {"3": 1, "4": 4, "5": 10},
            "king": {"3": 0.8, "4": 3, "5": 8},
            "queen": {"3": 0.6, "4": 2, "5": 6},
            "jack": {"3": 0.5, "4": 1.5, "5": 5},
            "ten": {"3": 0.4, "4": 1, "5": 4},
        },
        {"3": 3, "4": 10, "5": 50},
        10,
        80,
    ),
    "voodoo_vengeance": _machine(
        "voodoo_vengeance", "Voodoo Vengeance", "Dark ritual jackpot hex", "voodoo",
        "Extreme",
        {"witchdoctor": 4, "totem": 6, "charm": 7, "spirit": 9, "ace": 12, "king": 13, "queen": 14, "jack": 15, "wild": 4, "scatter": 4},
        "wild",
        "scatter",
        {
            "witchdoctor": {"3": 12, "4": 30, "5": 75},
            "totem": {"3": 6, "4": 18, "5": 40},
            "charm": {"3": 4, "4": 12, "5": 25},
            "spirit": {"3": 2, "4": 6, "5": 15},
            "ace": {"3": 1, "4": 4, "5": 10},
            "king": {"3": 0.8, "4": 3, "5": 8},
            "queen": {"3": 0.6, "4": 2, "5": 6},
            "jack": {"3": 0.5, "4": 1.5, "5": 5},
        },
        {"3": 2, "4": 10, "5": 100},
        12,
        79,
    ),
    "corsair_cannons": _machine(
        "corsair_cannons", "Corsair Cannons", "Broadside plunder free spins", "pirate",
        "Medium",
        {"corsair": 5, "saber": 7, "compass_sym": 8, "doubloon": 9, "ace": 11, "king": 12, "queen": 13, "jack": 14, "ten": 15, "wild": 4, "scatter": 4},
        "wild",
        "scatter",
        {
            "corsair": {"3": 8, "4": 20, "5": 50},
            "saber": {"3": 4, "4": 12, "5": 30},
            "compass_sym": {"3": 3, "4": 8, "5": 20},
            "doubloon": {"3": 2, "4": 6, "5": 15},
            "ace": {"3": 1, "4": 4, "5": 10},
            "king": {"3": 0.8, "4": 3, "5": 8},
            "queen": {"3": 0.6, "4": 2, "5": 6},
            "jack": {"3": 0.5, "4": 1.5, "5": 5},
            "ten": {"3": 0.4, "4": 1, "5": 4},
        },
        {"3": 3, "4": 10, "5": 25},
        10,
        82,
    ),
    "warpath_legends": _machine(
        "warpath_legends", "Warpath Legends", "Frontier tribe stampede spins", "tribal",
        "High",
        {"warchief": 5, "tomahawk": 7, "buffalo": 8, "eagle": 9, "ace": 11, "king": 12, "queen": 13, "jack": 14, "ten": 15, "wild": 4, "scatter": 4},
        "wild",
        "scatter",
        {
            "warchief": {"3": 9, "4": 22, "5": 55},
            "tomahawk": {"3": 4, "4": 12, "5": 30},
            "buffalo": {"3": 3, "4": 8, "5": 20},
            "eagle": {"3": 2, "4": 6, "5": 15},
            "ace": {"3": 1, "4": 4, "5": 10},
            "king": {"3": 0.8, "4": 3, "5": 8},
            "queen": {"3": 0.6, "4": 2, "5": 6},
            "jack": {"3": 0.5, "4": 1.5, "5": 5},
            "ten": {"3": 0.4, "4": 1, "5": 4},
        },
        {"3": 2, "4": 8, "5": 40},
        8,
        78,
    ),
}


def _weighted_pick(symbols):
    total = sum(symbols.values())
    r = secrets.randbelow(total) + 1
    upto = 0
    for sym, w in symbols.items():
        upto += w
        if r <= upto:
            return sym
    return list(symbols.keys())[-1]


def spin_slot(machine_id, total_bet, free=False):
    m = SLOT_MACHINES[machine_id]
    symbols = m["symbols"]
    wild = m["wild"]
    scatter = m["scatter"]
    line_bet = total_bet / len(PAYLINES)

    # grid[reel][row]
    grid = [[_weighted_pick(symbols) for _ in range(3)] for _ in range(5)]

    line_wins = []
    total_win = 0.0

    for idx, pl in enumerate(PAYLINES):
        line_syms = [grid[reel][pl[reel]] for reel in range(5)]
        # determine base symbol (first non-wild, non-scatter)
        base = None
        for s in line_syms:
            if s != wild and s != scatter:
                base = s
                break
        if base is None:
            base = wild if wild != scatter else None
        if base is None or base == scatter:
            continue
        count = 0
        for s in line_syms:
            if s == base or s == wild:
                count += 1
            else:
                break
        pt = m["paytable"].get(base, {})
        mult = pt.get(str(count))
        if mult:
            win = mult * line_bet
            total_win += win
            line_wins.append({
                "line": idx,
                "symbol": base,
                "count": count,
                "win": round(win, 2),
                "positions": [[reel, pl[reel]] for reel in range(count)],
            })

    # scatters
    scatter_positions = []
    for reel in range(5):
        for row in range(3):
            if grid[reel][row] == scatter:
                scatter_positions.append([reel, row])
    scatter_count = len(scatter_positions)
    free_spins_awarded = 0
    scatter_win = 0.0
    if scatter_count >= 3 and scatter != wild:
        sp = m["scatter_pay"].get(str(min(scatter_count, 5)))
        if sp:
            scatter_win = sp * total_bet
            total_win += scatter_win
        free_spins_awarded = m["free_spins"]
    elif scatter == wild and scatter_count >= 3:
        # book style: scatter pays and grants free spins
        sp = m["scatter_pay"].get(str(min(scatter_count, 5)))
        if sp:
            scatter_win = sp * total_bet
            total_win += scatter_win
        free_spins_awarded = m["free_spins"]

    return {
        "grid": grid,
        "line_wins": line_wins,
        "scatter_positions": scatter_positions,
        "scatter_count": scatter_count,
        "scatter_win": round(scatter_win, 2),
        "free_spins_awarded": free_spins_awarded,
        "total_win": round(total_win, 2),
        "total_bet": round(total_bet, 2),
    }


# ---------------------------------------------------------------------------
# FLAGSHIP HOLD & WIN ENGINE  (AAA machines: jackpot ladder + fire-coin bonus)
# ---------------------------------------------------------------------------
FLAGSHIP_IDS = {"pharaohs_arsenal", "inferno_airstrike", "golden_dynasty",
                "book_of_ops", "big_bass_bombardment", "money_train_convoy",
                "wild_west_recon", "kraken_depths", "frozen_front"}

# jackpot name -> multiplier of the total bet
JACKPOT_LADDER = {
    "mini": 10,
    "minor": 20,
    "midi": 40,
    "major": 80,
    "grand": 1000,
    "royal": 10000,
}

# fire-coin outcomes (value, weight). value is a credit-multiplier of total bet,
# or a jackpot key string.
_FIRECOIN_TABLE = [
    (1, 44), (2, 34), (3, 24), (5, 16), (8, 10), (10, 7),
    (15, 5), (20, 3), (25, 2), (50, 1),
    ("mini", 7), ("minor", 4), ("midi", 2), ("major", 1),
]
FIRECOIN_TRIGGER = 6  # coins needed on a base spin to launch Hold & Win


def _pick_firecoin(total_bet):
    total = sum(w for _, w in _FIRECOIN_TABLE)
    r = secrets.randbelow(total) + 1
    upto = 0
    for val, w in _FIRECOIN_TABLE:
        upto += w
        if r <= upto:
            break
    if isinstance(val, str):  # jackpot coin
        return {"jackpot": val, "value": round(JACKPOT_LADDER[val] * total_bet, 2)}
    return {"jackpot": None, "value": round(val * total_bet, 2)}


def spin_flagship(machine_id, total_bet, coin_prob=125):
    """Base spin for a flagship machine: normal paylines + fire-coin overlay.
    coin_prob is per-cell chance in 1000. 6+ coins -> Hold & Win bonus."""
    base = spin_slot(machine_id, total_bet)
    grid = base["grid"]

    # cells already committed to a line/scatter win must stay as their symbol
    reserved = set()
    for lw in base["line_wins"]:
        for r, c in lw["positions"]:
            reserved.add((r, c))
    for r, c in base["scatter_positions"]:
        reserved.add((r, c))

    coins = []
    for reel in range(5):
        for row in range(3):
            if (reel, row) in reserved:
                continue
            if secrets.randbelow(1000) < coin_prob:
                coin = _pick_firecoin(total_bet)
                coin["pos"] = [reel, row]
                coins.append(coin)
                grid[reel][row] = "firecoin"

    base["firecoins"] = coins
    base["holdwin_triggered"] = len(coins) >= FIRECOIN_TRIGGER
    return base


def play_holdwin(total_bet, initial_coins, respin_prob=95):
    """Full server-authoritative Hold & Win bonus. Returns the animation
    sequence plus the final tally. 15-cell (5x3) grid; fill all -> GRAND."""
    locked = {}
    for c in initial_coins:
        locked[tuple(c["pos"])] = {"pos": c["pos"], "value": c["value"], "jackpot": c.get("jackpot")}

    respins = 3
    sequence = []
    while respins > 0 and len(locked) < 15:
        respins -= 1
        new_coins = []
        for reel in range(5):
            for row in range(3):
                if (reel, row) in locked:
                    continue
                if secrets.randbelow(1000) < respin_prob:
                    coin = _pick_firecoin(total_bet)
                    coin["pos"] = [reel, row]
                    locked[(reel, row)] = coin
                    new_coins.append(coin)
        if new_coins:
            respins = 3  # any new coin resets respins
        sequence.append({
            "new_coins": new_coins,
            "respins_left": respins,
            "filled": len(locked),
        })

    coins = list(locked.values())
    total = sum(c["value"] for c in coins)
    jackpots_won = [c["jackpot"] for c in coins if c.get("jackpot")]

    full_grid = len(locked) >= 15
    if full_grid:
        grand = round(JACKPOT_LADDER["grand"] * total_bet, 2)
        total += grand
        jackpots_won.append("grand")

    # POWER WHEEL — a strong bonus (10+ locked coins) earns a spin of the
    # power wheel: either a multiplier on the running total or a bonus jackpot.
    wheel = None
    if len(locked) >= 10:
        segments = ["2x", "MINI", "3x", "MINOR", "5x", "MIDI", "2x", "MAJOR"]
        weights = [24, 11, 18, 8, 10, 5, 19, 5]
        wtotal = sum(weights)
        r = secrets.randbelow(wtotal) + 1
        upto = 0
        idx = 0
        for i, w in enumerate(weights):
            upto += w
            if r <= upto:
                idx = i
                break
        seg = segments[idx]
        if seg.endswith("x"):
            mult = int(seg[:-1])
            award = round(total * (mult - 1), 2)
            total = round(total * mult, 2)
        else:
            jp = seg.lower()
            award = round(JACKPOT_LADDER[jp] * total_bet, 2)
            total += award
            jackpots_won.append(jp)
        wheel = {"segments": segments, "index": idx, "result": seg, "award": round(award, 2)}

    return {
        "sequence": sequence,
        "coins": coins,
        "total_win": round(total, 2),
        "jackpots_won": jackpots_won,
        "full_grid": full_grid,
        "wheel": wheel,
        "total_bet": round(total_bet, 2),
    }



# ---------------------------------------------------------------------------
# KENO ENGINE  ("Warhead Keno")
# Pick 1-10 numbers from 1-80. Draw 20. Payout by (picks, hits).
# ---------------------------------------------------------------------------

# paytable[num_picks][num_hits] = multiplier of stake
KENO_PAYTABLE = {
    1: {0: 0, 1: 3.6},
    2: {0: 0, 1: 1, 2: 9},
    3: {0: 0, 1: 1, 2: 2, 3: 26},
    4: {0: 0, 1: 0, 2: 2, 3: 6, 4: 45},
    5: {0: 0, 1: 0, 2: 1.5, 3: 4, 4: 12, 5: 90},
    6: {0: 0, 1: 0, 2: 1, 3: 2, 4: 6, 5: 30, 6: 175},
    7: {0: 0, 1: 0, 2: 1, 3: 2, 4: 4, 5: 12, 6: 60, 7: 350},
    8: {0: 0, 1: 0, 2: 0, 3: 2, 4: 4, 5: 10, 6: 40, 7: 150, 8: 700},
    9: {0: 0, 1: 0, 2: 0, 3: 2, 4: 3, 5: 6, 6: 25, 7: 80, 8: 400, 9: 1500},
    10: {0: 0, 1: 0, 2: 0, 3: 1.5, 4: 2, 5: 5, 6: 15, 7: 50, 8: 200, 9: 800, 10: 5000},
}


def play_keno(picks, stake):
    picks = sorted(set(int(p) for p in picks))
    n = len(picks)
    if n < 1 or n > 10:
        raise ValueError("Pick between 1 and 10 numbers")
    if any(p < 1 or p > 80 for p in picks):
        raise ValueError("Numbers must be between 1 and 80")

    pool = list(range(1, 81))
    drawn = []
    for _ in range(20):
        i = secrets.randbelow(len(pool))
        drawn.append(pool.pop(i))
    drawn_set = set(drawn)
    hits = sorted([p for p in picks if p in drawn_set])
    mult = KENO_PAYTABLE[n].get(len(hits), 0)
    win = round(mult * stake, 2)
    return {
        "picks": picks,
        "drawn": sorted(drawn),
        "hits": hits,
        "hit_count": len(hits),
        "multiplier": mult,
        "win": win,
        "stake": round(stake, 2),
    }


# ---------------------------------------------------------------------------
# VIP TIERS  (based on lifetime wagered, play-money "ops points")
# ---------------------------------------------------------------------------
VIP_TIERS = [
    {"name": "Recruit", "min": 0, "bonus": 500, "cashback": 0, "rank": 0},
    {"name": "Private", "min": 5000, "bonus": 750, "cashback": 1, "rank": 1},
    {"name": "Sergeant", "min": 25000, "bonus": 1200, "cashback": 2, "rank": 2},
    {"name": "Lieutenant", "min": 75000, "bonus": 2000, "cashback": 3, "rank": 3},
    {"name": "Captain", "min": 200000, "bonus": 3500, "cashback": 5, "rank": 4},
    {"name": "Major", "min": 500000, "bonus": 6000, "cashback": 7, "rank": 5},
    {"name": "Colonel", "min": 1500000, "bonus": 10000, "cashback": 9, "rank": 6},
    {"name": "General", "min": 5000000, "bonus": 25000, "cashback": 12, "rank": 7},
]


def tier_for_wagered(wagered):
    current = VIP_TIERS[0]
    for t in VIP_TIERS:
        if wagered >= t["min"]:
            current = t
    nxt = None
    for t in VIP_TIERS:
        if t["min"] > wagered:
            nxt = t
            break
    return current, nxt


# Credit packages available for purchase (play-money credits).
CREDIT_PACKAGES = [
    {"lookup_key": "recon_pack", "id": "recon_pack", "name": "Recon Pack", "credits": 10000, "amount": 499, "bonus": 0},
    {"lookup_key": "strike_pack", "id": "strike_pack", "name": "Strike Pack", "credits": 25000, "amount": 999, "bonus": 2500},
    {"lookup_key": "assault_pack", "id": "assault_pack", "name": "Assault Pack", "credits": 60000, "amount": 1999, "bonus": 10000},
    {"lookup_key": "command_pack", "id": "command_pack", "name": "Command Pack", "credits": 160000, "amount": 4999, "bonus": 40000},
    {"lookup_key": "warlord_pack", "id": "warlord_pack", "name": "Warlord Pack", "credits": 400000, "amount": 9999, "bonus": 150000},
]
