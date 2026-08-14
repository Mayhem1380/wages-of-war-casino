import {
  Crown, Sun, Trophy, Circle, Hourglass, Diamond, Compass, Skull, Bug, Fish,
  Boat, Anchor, Package, Star, Crosshair, Horse, Heart, Square, Sparkle, Bank,
  Cube, Coin, Target, Lightning, Eye, Dog, Drop, Shrimp, Knife, Ghost,
  AirplaneTilt, Rocket, Bomb, Flame, Snowflake, Mountains, PawPrint, Fire, Feather,
  Shield, Sword, Moon, Bird, Campfire, Nut, Spiral, Sailboat, Coins,
} from "@phosphor-icons/react";

// symbol id -> { Icon, color, text? }  (text overrides the icon, used for card ranks)
export const SYMBOL_META = {
  crown: { Icon: Crown, color: "#F6E27A" },
  orb: { Icon: Sun, color: "#7FE3FF" },
  chalice: { Icon: Trophy, color: "#F6E27A" },
  ring: { Icon: Circle, color: "#57E6C6" },
  hourglass: { Icon: Hourglass, color: "#FFB454" },
  gem_red: { Icon: Diamond, color: "#FF5A5A" },
  gem_blue: { Icon: Diamond, color: "#5AA6FF" },
  gem_green: { Icon: Diamond, color: "#4EE44E" },
  gem_purple: { Icon: Diamond, color: "#C07BFF" },

  explorer: { Icon: Compass, color: "#4EE44E" },
  idol: { Icon: Skull, color: "#F6E27A" },
  scarab: { Icon: Bug, color: "#57E6C6" },

  fisherman: { Icon: Fish, color: "#4EE44E" },
  boat: { Icon: Boat, color: "#7FE3FF" },
  rod: { Icon: Anchor, color: "#B8C4B8" },
  box: { Icon: Package, color: "#FFB454" },

  sheriff: { Icon: Star, color: "#F6E27A" },
  revolver: { Icon: Crosshair, color: "#FF5A5A" },
  boot: { Icon: Cube, color: "#C9A06A" },
  horseshoe: { Icon: Horse, color: "#57E6C6" },

  heart: { Icon: Heart, color: "#FF5A8A" },
  square: { Icon: Square, color: "#5AA6FF" },
  circle: { Icon: Circle, color: "#4EE44E" },
  grape: { Icon: Diamond, color: "#C07BFF" },
  plum: { Icon: Diamond, color: "#FF7BC0" },
  apple: { Icon: Heart, color: "#FF5A5A" },
  banana: { Icon: Star, color: "#FFD84E" },
  candy: { Icon: Sparkle, color: "#7FE3FF" },

  vault: { Icon: Bank, color: "#F6E27A" },
  loco: { Icon: Cube, color: "#7FE3FF" },
  gunner: { Icon: Crosshair, color: "#4EE44E" },
  coin: { Icon: Coin, color: "#FFD84E" },

  pharaoh: { Icon: Crown, color: "#F6E27A", img: "/slots/sym_pharaoh.png" },
  anubis: { Icon: Dog, color: "#57E6C6", img: "/slots/sym_anubis.png" },
  eye_ra: { Icon: Eye, color: "#7FE3FF", img: "/slots/sym_eye_ra.png" },
  ankh: { Icon: Sparkle, color: "#D4AF37", label: "ANKH", img: "/slots/sym_ankh.png" },

  kraken: { Icon: Ghost, color: "#57E6C6" },
  harpoon: { Icon: Knife, color: "#B8C4B8" },
  pearl: { Icon: Drop, color: "#7FE3FF" },
  shell: { Icon: Shrimp, color: "#FF9EC4" },

  jet: { Icon: AirplaneTilt, color: "#B8C4B8", img: "/slots/sym_jet.png" },
  missile: { Icon: Rocket, color: "#FF5A5A", img: "/slots/sym_missile.png" },
  bomb_sym: { Icon: Bomb, color: "#FFB454", img: "/slots/sym_bomb.png" },
  flame: { Icon: Flame, color: "#FF7A2E", img: "/slots/sym_flame.png" },

  yeti: { Icon: PawPrint, color: "#EDEDED" },
  wolf: { Icon: Dog, color: "#B8C4B8" },
  snow: { Icon: Snowflake, color: "#7FE3FF" },
  peak: { Icon: Mountains, color: "#9FD0FF" },

  emperor: { Icon: Crown, color: "#FF5A5A", img: "/slots/sym_emperor.png" },
  lantern: { Icon: Fire, color: "#FF7A2E", img: "/slots/sym_lantern.png" },
  fan: { Icon: Feather, color: "#F6E27A", img: "/slots/sym_fan.png" },

  shogun: { Icon: Shield, color: "#F6E27A" },
  katana: { Icon: Sword, color: "#B8C4B8" },
  moon_jp: { Icon: Moon, color: "#9FD0FF" },
  crane: { Icon: Bird, color: "#EDEDED" },

  witchdoctor: { Icon: Skull, color: "#C07BFF" },
  totem: { Icon: Campfire, color: "#FF7A2E" },
  charm: { Icon: Nut, color: "#57E6C6" },
  spirit: { Icon: Spiral, color: "#4EE44E" },

  corsair: { Icon: Sailboat, color: "#7FE3FF" },
  saber: { Icon: Sword, color: "#C9A06A" },
  compass_sym: { Icon: Compass, color: "#F6E27A" },
  doubloon: { Icon: Coins, color: "#FFD84E" },

  warchief: { Icon: Star, color: "#FF5A5A" },
  tomahawk: { Icon: Knife, color: "#C9A06A" },
  buffalo: { Icon: Horse, color: "#C9A06A" },
  eagle: { Icon: Bird, color: "#F6E27A" },

  ace: { text: "A", color: "#EDEDED" },
  king: { text: "K", color: "#D8D8D8" },
  queen: { text: "Q", color: "#C6C6C6" },
  jack: { text: "J", color: "#B4B4B4" },
  ten: { text: "10", color: "#A2A2A2" },

  wild: { Icon: Lightning, color: "#D4AF37", label: "WILD" },
  book: { Icon: Sparkle, color: "#D4AF37", label: "RELIC" },
  scatter: { Icon: Target, color: "#4EE44E", label: "SCATTER" },
  firecoin: { Icon: Fire, color: "#FF7A2E", img: "/slots/sym_firecoin.png" },
};

// Flagship (AAA) machines: painted thumbnail + reel background + jackpot accent
export const FLAGSHIP_ART = {
  pharaohs_arsenal: {
    thumb: "/slots/thumb_pharaoh.jpg",
    bg: "/slots/bg_pharaoh.jpg",
    accent: "#F6C64A",
    frame: "#C99A2E",
    panel: "#3a0e0e",
  },
  inferno_airstrike: {
    thumb: "/slots/thumb_inferno.jpg",
    bg: "/slots/bg_inferno.jpg",
    accent: "#FF8A2E",
    frame: "#B8531E",
    panel: "#2a1408",
  },
  golden_dynasty: {
    thumb: "/slots/thumb_dynasty.jpg",
    bg: "/slots/bg_dynasty.jpg",
    accent: "#FFC04A",
    frame: "#C23A2E",
    panel: "#2a0a0c",
  },
};

// Lobby card theming per machine
export const MACHINE_ART = {
  gates_of_glory: { accent: "#F6E27A", from: "#231a06", to: "#0a0d0a", tag: "ZEUS-CLASS" },
  book_of_ops: { accent: "#E0B24A", from: "#241a08", to: "#0a0d0a", tag: "EXPANDING" },
  big_bass_bombardment: { accent: "#5AA6FF", from: "#0a1826", to: "#0a0d0a", tag: "FREE SPINS" },
  wild_west_recon: { accent: "#C9A06A", from: "#1f150a", to: "#0a0d0a", tag: "FRONTIER" },
  sweet_ammo: { accent: "#FF7BC0", from: "#26101f", to: "#0a0d0a", tag: "TUMBLE" },
  money_train_convoy: { accent: "#4EE44E", from: "#0a1f0a", to: "#0a0d0a", tag: "MAX 100,000x" },
  pharaohs_arsenal: { accent: "#E0B24A", from: "#241a08", to: "#0a0d0a", tag: "EXPANDING" },
  kraken_depths: { accent: "#57E6C6", from: "#08201f", to: "#0a0d0a", tag: "FREE SPINS" },
  inferno_airstrike: { accent: "#FF7A2E", from: "#26100a", to: "#0a0d0a", tag: "JACKPOT" },
  frozen_front: { accent: "#9FD0FF", from: "#0a1826", to: "#0a0d0a", tag: "STICKY WILDS" },
  golden_dynasty: { accent: "#FF5A5A", from: "#26080a", to: "#0a0d0a", tag: "MAX 88,000x" },
  samurai_strike: { accent: "#F6E27A", from: "#1f1a0a", to: "#0a0d0a", tag: "FREE SPINS" },
  voodoo_vengeance: { accent: "#C07BFF", from: "#1c0a26", to: "#0a0d0a", tag: "JACKPOT" },
  corsair_cannons: { accent: "#7FE3FF", from: "#08202a", to: "#0a0d0a", tag: "FREE SPINS" },
  warpath_legends: { accent: "#FF5A5A", from: "#241206", to: "#0a0d0a", tag: "STAMPEDE" },
};

export const fmt = (n) =>
  Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const FLAGSHIP_IDS = ["pharaohs_arsenal", "inferno_airstrike", "golden_dynasty"];

export const BRAND = {
  hero: "/brand/hero.jpeg",
  emblem: "/brand/emblem.jpeg",
  promo: "/brand/promo-platforms.jpeg",
  coin: "/brand/coin.jpeg",
  coinNightOps: "/brand/coin-nightops.png",
  nexusBanner: "/brand/nexus-banner.jpg",
  giveaway: "/brand/giveaway.webp",
};
