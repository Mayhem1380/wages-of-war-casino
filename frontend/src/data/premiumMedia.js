import slotCatalog from "./slotCatalog.json";
import { BRAND, FLAGSHIP_IDS, resolveMachineArt } from "./gameMeta";

const DEFAULT_THEME = "military";

const THEME_PRESETS = {
  military: {
    label: "TACTICAL COMMAND",
    kicker: "AAA SLOT OPS",
    soundLabel: "Combat Gold",
    accent: "#F6C64A",
    haze: "rgba(246,198,74,0.22)",
    panel: "#2a1908",
    callouts: ["Night sortie", "Precision reels", "Strike bonus live"],
  },
  fortune: {
    label: "FORTUNE VAULT",
    kicker: "ULTRA LUXE REELS",
    soundLabel: "Imperial Resonance",
    accent: "#FFD84E",
    haze: "rgba(255,216,78,0.2)",
    panel: "#271f0a",
    callouts: ["Golden vault", "Feature surge", "High-limit flow"],
  },
  egypt: {
    label: "PHARAOH'S VAULT",
    kicker: "CINEMATIC TREASURE",
    soundLabel: "Relic Echo",
    accent: "#E0B24A",
    haze: "rgba(224,178,74,0.2)",
    panel: "#24170a",
    callouts: ["Ancient relics", "Expanding reels", "Royal multipliers"],
  },
  naval: {
    label: "ABYSSAL COMMAND",
    kicker: "DEEP-WATER CINEMA",
    soundLabel: "Sonar Bloom",
    accent: "#57E6C6",
    haze: "rgba(87,230,198,0.2)",
    panel: "#071e1f",
    callouts: ["Sub-surface glow", "Ambient swell", "Torpedo jackpots"],
  },
  dragon: {
    label: "DRAGON HOLD",
    kicker: "LEGENDARY REEL FIRE",
    soundLabel: "Celestial Ember",
    accent: "#FF7A2E",
    haze: "rgba(255,122,46,0.2)",
    panel: "#261108",
    callouts: ["Fire-link bonus", "Ancient guardians", "Hot streak mode"],
  },
  olympus: {
    label: "SKY PALACE",
    kicker: "STORMFORGED AAA",
    soundLabel: "Thunder Crown",
    accent: "#9FD0FF",
    haze: "rgba(159,208,255,0.2)",
    panel: "#0b1726",
    callouts: ["Skyfall respins", "Crowned wilds", "Storm jackpot ladder"],
  },
};

const SPECIAL_GAME_MEDIA = {
  warkino: {
    id: "warkino",
    name: "Warkino",
    tagline: "AAA live-draw command deck with rapid-fire tactical drops.",
    theme: "military",
    kind: "special",
    heroPoster: "/brand/warkino_hero.jpg",
    titleArt: "/brand/warkino_hero.jpg",
    lobbyThumb: "/slots/keno_bg.jpg",
    accent: "#4EE44E",
    panel: "#07150c",
  },
  coinflip: {
    id: "coinflip",
    name: "Coin Flip",
    tagline: "Ultra-premium dog-tag duel with instant-pay presentation.",
    theme: "military",
    kind: "special",
    heroPoster: "/slots/coinflip_bg.jpg",
    titleArt: "/slots/coin_heads.png",
    lobbyThumb: "/slots/coinflip_bg.jpg",
    accent: "#F6C64A",
    panel: "#1d1307",
  },
};

export const SLOT_CATALOG = slotCatalog.map((slot) => ({
  ...slot,
  theme: normalizeTheme(slot.theme),
  popularity: Math.max(0, Math.min(100, Number(slot.popularity) || 0)),
}));
export const SLOT_INVENTORY_COUNT = SLOT_CATALOG.length;
export const SPECIAL_GAME_CATALOG = Object.values(SPECIAL_GAME_MEDIA);
export const PLATFORM_LINKS = ["Vault", "HQ", "Nexus Studio Master"];
export const CONNECTED_PLATFORM_COUNT = 14;
export const PREMIUM_MEDIA_REQUIRED_FIELDS = [
  "titleArt",
  "heroPoster",
  "lobbyThumb",
  "accent",
  "soundProfile",
  "showcaseSlides",
  "highlightLines",
];

function hashValue(value = "") {
  return [...String(value)].reduce(
    (total, char, index) => total + char.charCodeAt(0) * (index + 17),
    0,
  );
}

function titleize(value = "") {
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeTheme(theme) {
  const key = String(theme || DEFAULT_THEME).toLowerCase();
  if (THEME_PRESETS[key]) return key;
  if (key === "dragons") return "dragon";
  if (key === "adventure") return "egypt";
  if (key === "fishing" || key === "pirate" || key === "ocean") return "naval";
  return DEFAULT_THEME;
}

function buildSoundProfile(kind, preset, seed) {
  const palettes = ["sawtooth", "triangle", "square"];
  return {
    label: preset.soundLabel,
    kind,
    texture: palettes[seed % palettes.length],
    sparkle: palettes[(seed + 1) % palettes.length],
    baseFreq: 120 + (seed % 7) * 20,
    accentFreq: 480 + (seed % 9) * 55,
    shimmerFreq: 960 + (seed % 8) * 80,
    gain: 0.12 + (seed % 3) * 0.03,
    reverb: 0.22 + (seed % 4) * 0.05,
  };
}

function buildHighlightLines(name, preset, game, seed) {
  const themeLabel = preset.label;
  return [
    `${themeLabel} // ${name.toUpperCase()}`,
    game.tagline || "AAA-grade presentation with premium reels and feature flow.",
    `${preset.callouts[seed % preset.callouts.length]} · ${game.volatility || "High"} volatility · ${game.paylines || 20} lines`,
  ];
}

function buildShowcaseSlides(game, preset, poster, thumb, accent, seed) {
  const title = game.name || titleize(game.id);
  const lines = buildHighlightLines(title, preset, game, seed);
  return [
    {
      img: poster,
      kicker: `${preset.kicker} · ${preset.label}`,
      title,
      sub: lines[1],
      accent,
    },
    {
      img: thumb || poster,
      kicker: "ULTRA PREMIUM SOUND",
      title: `${preset.soundLabel} MIX`,
      sub: `${lines[2]} · ${game.free_spins || 0} FREE SPINS`,
      accent,
    },
    {
      img: poster,
      kicker: "VIDEO PLAY GRAPHICS",
      title: `${title.toUpperCase()} LIVE`,
      sub: `Vault · HQ · Nexus Studio Master · ${CONNECTED_PLATFORM_COUNT} linked platforms`,
      accent,
    },
  ];
}

export function getPremiumGameMedia(game) {
  const special = SPECIAL_GAME_MEDIA[game?.id];
  const base = special || game || {};
  const id = base.id || "night_ops";
  const seed = hashValue(id);
  const themeKey = normalizeTheme(base.theme);
  const preset = THEME_PRESETS[themeKey];
  const art =
    base.kind === "special"
      ? {
          bg: base.heroPoster,
          thumb: base.lobbyThumb || base.heroPoster,
          panel: base.panel || preset.panel,
        }
      : resolveMachineArt(id, { panel: preset.panel });
  const accent = base.accent || art.accent || preset.accent || art.panel;
  const heroPoster = base.heroPoster || art.bg || BRAND.coinNightOps;
  const titleArt = base.titleArt || art.thumb || heroPoster;
  const lobbyThumb = base.lobbyThumb || art.thumb || heroPoster;
  const soundProfile = buildSoundProfile(base.kind || "slot", preset, seed);
  const highlightLines = buildHighlightLines(
    base.name || titleize(id),
    preset,
    base,
    seed,
  );
  return {
    id,
    name: base.name || titleize(id),
    kind: base.kind || "slot",
    theme: themeKey,
    tagline:
      base.tagline || "AAA-grade premium reels with cinematic presentation.",
    quality: "AAA",
    titleArt,
    heroPoster,
    lobbyThumb,
    accent,
    panel: art.panel || base.panel || preset.panel,
    videoKicker: preset.kicker,
    soundtrack: preset.soundLabel,
    highlightLines,
    graphicsProfile: {
      haze: preset.haze,
      frame: accent,
      panel: art.panel || preset.panel,
      surface: `linear-gradient(180deg, ${preset.haze}, rgba(3,6,5,0.92))`,
      chrome: `0 0 40px ${preset.haze}`,
    },
    soundProfile,
    showcaseSlides: buildShowcaseSlides(
      base,
      preset,
      heroPoster,
      lobbyThumb,
      accent,
      seed,
    ),
  };
}

export function validatePremiumMediaProfile(profile) {
  const checks = {
    titleArt: Boolean(profile?.titleArt),
    heroPoster: Boolean(profile?.heroPoster),
    lobbyThumb: Boolean(profile?.lobbyThumb),
    accent: Boolean(profile?.accent),
    soundProfile: Boolean(profile?.soundProfile?.baseFreq),
    showcaseSlides:
      Array.isArray(profile?.showcaseSlides) && profile.showcaseSlides.length >= 3,
    highlightLines:
      Array.isArray(profile?.highlightLines) && profile.highlightLines.length >= 3,
  };
  const missing = Object.entries(checks)
    .filter(([, ready]) => !ready)
    .map(([field]) => field);
  return { ok: missing.length === 0, missing, checks };
}

export function countReadyPremiumGames(catalog = SLOT_CATALOG) {
  return catalog.filter((game) => validatePremiumMediaProfile(getPremiumGameMedia(game)).ok)
    .length;
}

export function buildPremiumLobbySlides(catalog = SLOT_CATALOG) {
  const topGames = catalog
    .slice()
    .sort((left, right) => (right.popularity || 0) - (left.popularity || 0))
    .slice(0, 6);
  return topGames.map((game) => getPremiumGameMedia(game).showcaseSlides[0]);
}

export function isFlagshipSlot(id) {
  return FLAGSHIP_IDS.includes(id);
}
