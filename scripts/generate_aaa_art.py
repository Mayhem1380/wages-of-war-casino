#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import math
import re

ROOT = Path('/app/frontend/public/slots')
ROOT.mkdir(parents=True, exist_ok=True)

SYMBOLS = [
    'sym_ankh.png', 'sym_anubis.png', 'sym_bamboo.png', 'sym_blossom.png', 'sym_boat.png', 'sym_bomb_sym.png', 'sym_book.png', 'sym_boot.png', 'sym_box.png', 'sym_buffalo.png', 'sym_caishen.png', 'sym_charm.png', 'sym_chincoin.png', 'sym_coin.png', 'sym_compass_sym.png', 'sym_corsair.png', 'sym_crane.png', 'sym_doubloon.png', 'sym_dragon.png', 'sym_dragoncoin.png', 'sym_dragongate.png', 'sym_dragonpearl.png', 'sym_drum.png', 'sym_eagle.png', 'sym_earthdragon.png', 'sym_emperor.png', 'sym_envelope.png', 'sym_explorer.png', 'sym_eye_ra.png', 'sym_fan.png', 'sym_firecracker.png', 'sym_firedragon.png', 'sym_fisherman.png', 'sym_flame.png', 'sym_fortunecat.png', 'sym_goblet.png', 'sym_goldbar.png', 'sym_golddragon.png', 'sym_goldtoad.png', 'sym_gunner.png', 'sym_harpoon.png', 'sym_helm.png', 'sym_horseshoe.png', 'sym_idol.png', 'sym_ingot.png', 'sym_jet.png', 'sym_katana.png', 'sym_koi.png', 'sym_kraken.png', 'sym_lantern.png', 'sym_loco.png', 'sym_lotus.png', 'sym_missile.png', 'sym_moon_jp.png', 'sym_nugget.png', 'sym_ox.png', 'sym_oxlantern.png', 'sym_panda.png', 'sym_peak.png', 'sym_pearl.png', 'sym_pharaoh.png', 'sym_pickaxe.png', 'sym_prospector.png', 'sym_revolver.png', 'sym_ringz.png', 'sym_rod.png', 'sym_saber.png', 'sym_scarab.png', 'sym_scroll.png', 'sym_shell.png', 'sym_sheriff.png', 'sym_shogun.png', 'sym_snow.png', 'sym_spirit.png', 'sym_sundisc.png', 'sym_suneagle.png', 'sym_sungod.png', 'sym_sunpyramid.png', 'sym_tomahawk.png', 'sym_totem.png', 'sym_vault.png', 'sym_warchief.png', 'sym_waterdragon.png', 'sym_witchdoctor.png', 'sym_wolf.png', 'sym_yeti.png', 'sym_zeus.png'
]

LEGACY_ALIASES = [
    'sym_bomb.png',
    'sym_coin2.png',
    'sym_firecoin.png',
]

TILES = [
    'tile_golden_dragon.jpg', 'tile_desert_fury.jpg', 'tile_steel_leviathan.jpg', 'tile_crimson_dynasty.jpg', 'tile_venom_squadron.jpg', 'tile_platinum_siege.jpg', 'tile_ember_legion.jpg', 'tile_sapphire_command.jpg', 'tile_golden_griffin.jpg', 'tile_cobalt_siege.jpg', 'tile_royal_ordnance.jpg', 'tile_jade_dynasty.jpg', 'tile_inferno_warlord.jpg', 'tile_arctic_recon.jpg', 'tile_midas_command.jpg', 'tile_phantom_strike.jpg', 'tile_thunder_baron.jpg', 'tile_solar_vanguard.jpg', 'tile_obsidian_empire.jpg', 'tile_neon_pharaoh.jpg', 'tile_crimson_vanguard.jpg', 'tile_golden_atlas.jpg', 'tile_emerald_guardian.jpg', 'tile_gates_of_glory.jpg', 'tile_book_of_ops.jpg', 'tile_big_bass_bombardment.jpg', 'tile_sweet_ammo.jpg', 'tile_wild_west_recon.jpg', 'tile_money_train_convoy.jpg', 'tile_pharaohs_arsenal.jpg', 'tile_kraken_depths.jpg', 'tile_inferno_airstrike.jpg', 'tile_frozen_front.jpg', 'tile_golden_dynasty.jpg', 'tile_samurai_strike.jpg', 'tile_voodoo_vengeance.jpg', 'tile_corsair_cannons.jpg', 'tile_frigate.jpg', 'tile_destroyer.jpg', 'tile_warpath_legends.jpg', 'tile_bull_rush.jpg', 'tile_buffalo_blast.jpg', 'tile_prairie_royale.jpg', 'tile_stampede_skyline.jpg', 'tile_golden_bull_run.jpg', 'tile_happy_prosperity.jpg', 'tile_panda_magic.jpg', 'tile_gold_bonanza.jpg', 'tile_dragons_riches.jpg', 'tile_five_dragons.jpg', 'tile_god_of_sun.jpg', 'tile_book_of_dead.jpg', 'tile_starburst.jpg', 'tile_mega_moolah.jpg', 'tile_wolf_gold.jpg', 'tile_sweet_bonanza.jpg', 'tile_gonzo_quest.jpg', 'tile_thunderstruck_ii.jpg', 'tile_buffalo.jpg', 'tile_black_wolf.jpg', 'tile_dead_or_alive_ii.jpg', 'tile_reactoonz.jpg', 'tile_divine_fortune.jpg', 'tile_gold_party.jpg', 'tile_cleopatra.jpg', 'tile_legacy_of_dinosaurs.jpg', 'tile_gates_of_olympus.jpg', 'tile_fortune_coins.jpg', 'tile_year_of_ox.jpg', 'tile_ironclad_jackpots.jpg', 'tile_blackout_royal.jpg', 'tile_stormfront_seven.jpg', 'tile_thunder_titans.jpg', 'tile_wild_bandito.jpg', 'tile_brigade_of_gold.jpg', 'tile_night_ops_kingpin.jpg', 'tile_midnight_vanguard.jpg', 'tile_diamond_commando.jpg', 'tile_vortex_vanguard.jpg', 'tile_redline_reign.jpg', 'tile_crimson_circuit.jpg', 'tile_buffalo_gold_rush.jpg', 'tile_dragon_lightning_link.jpg', 'tile_dragon_cash.jpg', 'tile_dollar_storm.jpg', 'tile_five_dragons_ultra_grand.jpg', 'tile_choy_sun_doa.jpg', 'tile_queen_of_the_nile.jpg', 'tile_game_of_thrones.jpg', 'tile_fortune_coin.jpg', 'tile_dancing_drums.jpg', 'tile_eighty_eight_fortunes.jpg', 'tile_rich_little_piggies.jpg', 'tile_triple_supreme_olympus.jpg', 'tile_cash_machine.jpg', 'tile_golden_century.jpg', 'tile_seven_seven_crazy.jpg', 'tile_golden_rooster.jpg', 'tile_happy_prosperous.jpg', 'tile_panda_magic_royale.jpg', 'tile_five_kings.jpg', 'tile_peace_and_long_life.jpg', 'tile_magic_totem.jpg', 'tile_eyes_of_fortune.jpg', 'tile_fire_of_villa_street.jpg', 'tile_iceland.jpg', 'tile_triple_gold_twister.jpg', 'tile_aurora_strike.jpg', 'tile_nebula_fortune.jpg', 'tile_titan_city.jpg', 'tile_valley_of_echoes.jpg', 'tile_neon_reserve.jpg', 'tile_celestial_forge.jpg', 'tile_forge_of_the_lost.jpg', 'tile_oasis_relics.jpg', 'tile_stormbreaker.jpg', 'tile_midnight_harvest.jpg', 'tile_88_roosters.jpg', 'tile_dragon_deluxe.jpg', 'tile_polar.jpg', 'tile_aladdin.jpg', 'tile_cleopatra_gold.jpg', 'tile_golden_lotus.jpg', 'tile_fortune_lions.jpg', 'tile_eggs_and_gold.jpg', 'tile_robin_hood.jpg', 'tile_maya_sun.jpg', 'tile_book_of_sun.jpg', 'tile_sun_magic.jpg', 'tile_apple_2.jpg', 'tile_book_of_wizard.jpg', 'tile_power_sun.jpg', 'tile_sun_of_egypt.jpg', 'tile_sun_of_egypt_2.jpg', 'tile_sun_of_egypt_3.jpg', 'tile_sun_of_egypt_4.jpg', 'tile_three_pigs.jpg', 'tile_sovereign_strike.jpg', 'tile_aces_high.jpg', 'tile_gold_convoy.jpg', 'tile_night_raid.jpg', 'tile_titanium_tundra.jpg', 'tile_jungle_guerrilla.jpg', 'tile_urban_sniper.jpg', 'tile_iron_infantry.jpg'
]

PALETTE = {
    'gold': (242, 181, 56),
    'amber': (255, 140, 45),
    'red': (227, 56, 38),
    'purple': (128, 90, 255),
    'blue': (67, 123, 255),
    'green': (56, 205, 116),
    'cyan': (75, 201, 255),
    'rose': (255, 131, 175),
    'white': (247, 247, 250),
    'charcoal': (25, 27, 36),
    'dark': (12, 13, 20),
}


def load_font(size: int) -> ImageFont.FreeTypeFont:
    candidates = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size)
        except Exception:
            pass
    return ImageFont.load_default()


def rounded_box(draw, box, radius, fill, outline, width=2):
    x0, y0, x1, y1 = box
    draw.rounded_rectangle([(x0, y0), (x1, y1)], radius=radius, fill=fill, outline=outline, width=width)


def glow_circle(draw, center, radius, fill, outline=None, width=2):
    for r in range(radius, 0, -8):
        alpha = max(0, int(110 * (r / radius)))
        color = (*fill[:3], alpha)
        draw.ellipse((center[0]-r, center[1]-r, center[0]+r, center[1]+r), outline=None, fill=color)
    if outline:
        draw.ellipse((center[0]-radius, center[1]-radius, center[0]+radius, center[1]+radius), outline=outline, width=width)


def draw_symbol_core(img, name: str):
    draw = ImageDraw.Draw(img, 'RGBA')
    w, h = img.size
    cx, cy = w // 2, h // 2
    radius = min(w, h) * 0.26

    base = (22, 18, 32, 210)
    glow = (255, 206, 90, 160)
    accent = (255, 142, 52, 200)

    # soft backdrop
    r = int(min(w, h) * 0.44)
    glow_circle(draw, (cx, cy), r, glow)
    rounded_box(draw, (int(w*0.14), int(h*0.14), int(w*0.86), int(h*0.86)), 30, (18, 21, 31, 170), (250, 197, 94, 180), 4)

    # a premium emblem based on the name
    lower = name.lower()
    if 'dragon' in lower or 'drago' in lower:
        draw.polygon([(cx, cy-150), (cx+70, cy-40), (cx+155, cy+55), (cx+90, cy+145), (cx-20, cy+115), (cx-110, cy+150), (cx-140, cy+45), (cx-70, cy-65)], fill=(255, 119, 54, 220), outline=(255, 220, 120, 255), width=8)
        draw.polygon([(cx-25, cy-25), (cx+35, cy-75), (cx+80, cy-40), (cx+35, cy+20)], fill=(255, 200, 75, 240))
        draw.ellipse((cx-20, cy-30, cx+20, cy+10), fill=(26, 16, 20, 220), outline=(255, 220, 120, 255), width=4)
    elif 'coin' in lower or 'bar' in lower or 'gold' in lower or 'nugget' in lower:
        draw.ellipse((cx-r, cy-r, cx+r, cy+r), fill=(255, 198, 74, 210), outline=(255, 244, 200, 255), width=10)
        draw.ellipse((cx-r*0.55, cy-r*0.55, cx+r*0.55, cy+r*0.55), fill=(255, 228, 160, 180), outline=(255, 184, 72, 255), width=8)
        draw.line((cx-r*0.2, cy-r*0.35, cx+r*0.2, cy-r*0.35), fill=(255, 148, 48, 255), width=8)
        draw.line((cx-r*0.2, cy+r*0.35, cx+r*0.2, cy+r*0.35), fill=(255, 148, 48, 255), width=8)
    elif 'crown' in lower or 'emperor' in lower or 'royal' in lower or 'pharaoh' in lower:
        points = [(cx, cy-160), (cx+80, cy-55), (cx+155, cy-60), (cx+115, cy+85), (cx+80, cy+20), (cx+28, cy+100), (cx-28, cy+100), (cx-80, cy+20), (cx-115, cy+85), (cx-155, cy-60), (cx-80, cy-55)]
        draw.polygon(points, fill=(244, 196, 70, 225), outline=(255, 236, 180, 255), width=8)
        draw.rectangle((cx-120, cy+25, cx+120, cy+110), fill=(255, 219, 132, 205), outline=(255, 236, 180, 255), width=4)
    elif 'sun' in lower or 'god' in lower:
        draw.ellipse((cx-150, cy-150, cx+150, cy+150), fill=(255, 200, 82, 222), outline=(255, 238, 180, 255), width=10)
        for a in range(0, 360, 30):
            rad = math.radians(a)
            x1, y1 = cx + math.cos(rad) * 138, cy + math.sin(rad) * 138
            x2, y2 = cx + math.cos(rad) * 190, cy + math.sin(rad) * 190
            draw.line((x1, y1, x2, y2), fill=(255, 235, 180, 240), width=8)
        draw.ellipse((cx-72, cy-72, cx+72, cy+72), fill=(255, 242, 190, 200), outline=None)
    elif 'boat' in lower or 'corsair' in lower or 'sail' in lower or 'ship' in lower:
        draw.polygon([(cx-150, cy+110), (cx+150, cy+110), (cx+75, cy-30), (cx-75, cy-30)], fill=(75, 151, 255, 210), outline=(220, 240, 255, 255), width=8)
        draw.polygon([(cx-10, cy-120), (cx+75, cy-30), (cx-10, cy-30)], fill=(255, 214, 125, 220), outline=(255, 240, 200, 255), width=6)
        draw.line((cx, cy-120, cx, cy+110), fill=(255, 240, 200, 220), width=6)
    elif 'moon' in lower or 'night' in lower or 'shadow' in lower:
        draw.ellipse((cx-105, cy-105, cx+105, cy+105), fill=(155, 170, 255, 220), outline=(240, 245, 255, 255), width=8)
        draw.ellipse((cx+32, cy-35, cx+120, cy+45), fill=(9, 12, 20, 200), outline=None)
    elif 'crane' in lower or 'bird' in lower or 'eagle' in lower or 'wing' in lower:
        draw.polygon([(cx-120, cy+50), (cx, cy-120), (cx+120, cy+50), (cx+40, cy+70), (cx+15, cy+150), (cx-15, cy+150), (cx-40, cy+70)], fill=(220, 226, 245, 210), outline=(255, 240, 190, 255), width=8)
        draw.line((cx, cy-120, cx, cy+110), fill=(255, 236, 180, 255), width=8)
    elif 'totem' in lower or 'idol' in lower or 'spirit' in lower or 'witch' in lower:
        draw.polygon([(cx, cy-150), (cx+60, cy+150), (cx-60, cy+150)], fill=(176, 88, 255, 210), outline=(240, 216, 255, 255), width=8)
        draw.ellipse((cx-55, cy-50, cx+55, cy+40), fill=(255, 226, 120, 220), outline=(255, 240, 210, 255), width=5)
    elif 'lantern' in lower or 'flame' in lower or 'fire' in lower:
        draw.rounded_rectangle((cx-120, cy-120, cx+120, cy+120), radius=48, fill=(255, 125, 50, 200), outline=(255, 220, 150, 255), width=8)
        draw.line((cx, cy-140, cx, cy+120), fill=(255, 220, 120, 255), width=12)
        draw.polygon([(cx, cy-160), (cx+35, cy-35), (cx+150, cy-30), (cx+65, cy+40), (cx+90, cy+160), (cx, cy+95), (cx-90, cy+160), (cx-65, cy+40), (cx-150, cy-30), (cx-35, cy-35)], fill=(255, 214, 100, 120), outline=None)
    elif 'flower' in lower or 'lotus' in lower or 'blossom' in lower:
        draw.ellipse((cx-120, cy-100, cx+120, cy+100), fill=(255, 136, 196, 200), outline=(255, 230, 190, 255), width=8)
        for a in range(0, 360, 45):
            rad = math.radians(a)
            x1, y1 = cx + math.cos(rad) * 60, cy + math.sin(rad) * 60
            x2, y2 = cx + math.cos(rad) * 150, cy + math.sin(rad) * 150
            draw.line((cx, cy, x2, y2), fill=(255, 220, 160, 200), width=8)
    elif 'shell' in lower or 'pearl' in lower or 'water' in lower or 'kraken' in lower:
        draw.ellipse((cx-130, cy-75, cx+130, cy+95), fill=(74, 196, 255, 200), outline=(220, 245, 255, 255), width=8)
        draw.arc((cx-80, cy-120, cx+80, cy+70), start=190, end=350, fill=(255, 240, 180, 255), width=8)
        draw.arc((cx-55, cy-55, cx+55, cy+80), start=180, end=360, fill=(255, 250, 220, 255), width=10)
    elif 'book' in lower or 'scroll' in lower or 'envelope' in lower:
        draw.rounded_rectangle((cx-130, cy-120, cx+130, cy+120), radius=26, fill=(240, 208, 130, 200), outline=(255, 243, 185, 255), width=8)
        draw.line((cx-100, cy-90, cx+100, cy-90), fill=(255, 247, 220, 255), width=10)
        draw.line((cx-100, cy, cx+100, cy), fill=(255, 247, 220, 255), width=7)
    elif 'weapon' in lower or 'sword' in lower or 'blade' in lower or 'katana' in lower or 'saber' in lower or 'tomahawk' in lower:
        draw.line((cx, cy-155, cx, cy+155), fill=(220, 225, 235, 220), width=10)
        draw.polygon([(cx, cy-165), (cx+38, cy-110), (cx+22, cy+150), (cx-22, cy+150), (cx-38, cy-110)], fill=(168, 175, 184, 200), outline=(255, 240, 190, 255), width=6)
    elif 'star' in lower or 'luck' in lower or 'cat' in lower or 'fate' in lower:
        points = []
        for i in range(10):
            angle = -math.pi/2 + i * math.pi / 5
            r = 150 if i % 2 == 0 else 80
            points.append((cx + math.cos(angle) * r, cy + math.sin(angle) * r))
        draw.polygon(points, fill=(255, 204, 78, 220), outline=(255, 242, 182, 255), width=8)
    else:
        draw.ellipse((cx-120, cy-120, cx+120, cy+120), fill=(220, 163, 62, 210), outline=(255, 236, 180, 255), width=8)
        draw.line((cx-110, cy, cx+110, cy), fill=(255, 244, 200, 255), width=8)
        draw.line((cx, cy-110, cx, cy+110), fill=(255, 244, 200, 255), width=8)

    # premium top highlight
    draw.arc((int(w*0.22), int(h*0.18), int(w*0.78), int(h*0.72)), start=210, end=330, fill=(255, 250, 220, 170), width=8)

    # title micro labeling to ensure distinctiveness
    label = re.sub(r'[^a-z0-9]', '', name.lower())[:3].upper()
    font = load_font(28)
    bbox = font.getbbox(label)
    text_x = cx - (bbox[2] - bbox[0]) / 2
    text_y = h * 0.83
    draw.text((text_x, text_y), label, font=font, fill=(255, 242, 180, 255), stroke_width=2, stroke_fill=(15, 18, 24, 200))


def generate_symbol_file(file_name: str):
    canvas = Image.new('RGBA', (640, 640), (0, 0, 0, 0))
    draw_symbol_core(canvas, file_name.replace('.png', '').replace('sym_', ''))
    canvas = canvas.filter(ImageFilter.GaussianBlur(radius=0.5))
    canvas.save(ROOT / file_name, format='PNG')


def make_tile(title: str, bg_color=(18, 18, 28), accent=(230, 186, 74), accent2=(72, 153, 255)):
    img = Image.new('RGB', (820, 1180), bg_color)
    draw = ImageDraw.Draw(img)

    # gradient banding
    for y in range(1180):
        mix = y / 1180
        r = int(bg_color[0] * (1 - mix) + accent[0] * mix)
        g = int(bg_color[1] * (1 - mix) + accent[1] * mix)
        b = int(bg_color[2] * (1 - mix) + accent[2] * mix)
        draw.line((0, y, 820, y), fill=(r, g, b))

    # frame and logo glow
    glow = Image.new('RGBA', (820, 1180), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.rounded_rectangle((42, 42, 778, 1138), radius=46, fill=(255, 255, 255, 30), outline=(255, 225, 160, 190), width=6)
    gd.ellipse((112, 160, 708, 708), fill=(accent[0], accent[1], accent[2], 110), outline=(255, 250, 220, 180), width=6)
    img = Image.alpha_composite(img.convert('RGBA'), glow).convert('RGB')
    draw = ImageDraw.Draw(img)

    # central badge
    draw.rounded_rectangle((120, 120, 700, 700), radius=54, fill=(17, 20, 29), outline=(255, 200, 80, 220), width=8)
    draw.ellipse((220, 220, 600, 600), fill=(accent2[0], accent2[1], accent2[2], 180), outline=(255, 238, 200, 255), width=8)
    draw.polygon([(410, 260), (520, 420), (610, 520), (410, 555), (210, 520), (300, 420)], fill=(255, 220, 132, 180), outline=(255, 255, 255, 220), width=6)
    draw.line((410, 300, 410, 500), fill=(255, 245, 210, 240), width=10)

    # title text
    label = title.replace('_', ' ').upper()
    font1 = load_font(54)
    font2 = load_font(22)
    text1 = label
    text2 = 'ARISTO AAA PREMIUM SLOT'

    bbox = font1.getbbox(text1)
    x = (820 - (bbox[2] - bbox[0])) / 2
    draw.text((x, 760), text1, font=font1, fill=(255, 240, 200), stroke_width=2, stroke_fill=(28, 18, 10, 180))
    bbox2 = font2.getbbox(text2)
    x2 = (820 - (bbox2[2] - bbox2[0])) / 2
    draw.text((x2, 840), text2, font=font2, fill=(255, 220, 120), stroke_width=1, stroke_fill=(14, 18, 24, 180))

    # vignette
    vignette = Image.new('RGBA', img.size, (0, 0, 0, 0))
    vd = ImageDraw.Draw(vignette)
    for r in range(0, 410, 18):
        alpha = max(0, 190 - r // 2)
        x0, y0 = r, r
        x1, y1 = 820 - r, 1180 - r
        if x1 < x0:
            x1 = x0
        if y1 < y0:
            y1 = y0
        vd.ellipse((x0, y0, x1, y1), outline=(0, 0, 0, alpha), width=6)
    img = Image.alpha_composite(img.convert('RGBA'), vignette).convert('RGB')
    return img


def generate_tile_file(file_name: str):
    title = file_name.replace('tile_', '').replace('.jpg', '')
    name_map = {
        'golden': (241, 183, 70),
        'dragon': (255, 114, 74),
        'royal': (255, 220, 100),
        'crimson': (220, 67, 52),
        'pharaoh': (247, 201, 95),
        'dynasty': (201, 147, 68),
        'steel': (120, 168, 205),
        'sapphire': (84, 118, 255),
        'emerald': (70, 208, 106),
        'vanguard': (102, 171, 255),
        'night': (135, 118, 255),
        'storm': (72, 160, 255),
        'gold': (255, 201, 76),
        'sun': (255, 173, 70),
        'panda': (119, 229, 130),
        'fire': (255, 114, 74),
        'frozen': (146, 209, 255),
        'obsidian': (75, 117, 122),
        'voltage': (255, 206, 84),
    }

    bg = (18, 20, 30)
    accent = (255, 195, 80)
    accent2 = (72, 153, 255)
    for key, color in name_map.items():
        if key in title:
            accent = color
            break
    if 'crimson' in title or 'red' in title or 'inferno' in title:
        bg = (35, 10, 16)
        accent2 = (255, 123, 80)
    if 'frozen' in title or 'arctic' in title or 'ice' in title or 'polar' in title:
        bg = (12, 25, 38)
        accent2 = (120, 205, 255)
    if 'panda' in title or 'emerald' in title or 'jade' in title:
        accent = (105, 233, 128)
    if 'sun' in title or 'golden' in title or 'fortune' in title:
        accent = (255, 207, 92)
    if 'night' in title or 'obsidian' in title or 'midnight' in title or 'neon' in title:
        accent = (166, 123, 255)
    if 'dragon' in title:
        accent2 = (255, 120, 70)

    img = make_tile(title, bg_color=bg, accent=accent, accent2=accent2)
    img.save(ROOT / file_name, format='JPEG', quality=93, optimize=True)


if __name__ == '__main__':
    for file_name in SYMBOLS:
        generate_symbol_file(file_name)
    for file_name in LEGACY_ALIASES:
        base = file_name.replace('.png', '')
        if base == 'sym_bomb':
            generate_symbol_file('sym_bomb_sym.png')
            break
        if base == 'sym_coin2':
            generate_symbol_file('sym_coin.png')
            break
        if base == 'sym_firecoin':
            generate_symbol_file('sym_spirit.png')
            break
    # ensure legacy aliases exist as distinct copies, not just renamed data
    for name in LEGACY_ALIASES:
        src = name.replace('.png', '')
        if src == 'sym_bomb':
            source = ROOT / 'sym_bomb_sym.png'
            dest = ROOT / 'sym_bomb.png'
            source = source if source.exists() else ROOT / 'sym_bomb_sym.png'
            (ROOT / 'sym_bomb.png').write_bytes(source.read_bytes())
        elif src == 'sym_coin2':
            source = ROOT / 'sym_coin.png'
            dest = ROOT / 'sym_coin2.png'
            dest.write_bytes(source.read_bytes())
        elif src == 'sym_firecoin':
            source = ROOT / 'sym_spirit.png'
            dest = ROOT / 'sym_firecoin.png'
            dest.write_bytes(source.read_bytes())

    for file_name in TILES:
        generate_tile_file(file_name)

    print(f'Generated {len(SYMBOLS)} symbols + {len(LEGACY_ALIASES)} aliases + {len(TILES)} tiles in {ROOT}')
