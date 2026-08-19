import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { MACHINE_ART, FLAGSHIP_ART } from "@/data/gameMeta";
import { LOBBY } from "@/constants/testIds";
import { SymbolTile } from "@/components/SymbolTile";
import { AnimatedShowcase } from "@/components/AnimatedShowcase";
import { LobbyHype } from "@/components/LobbyHype";
import {
  Target,
  CaretRight,
  Coins,
  GameController,
  Skull,
  RocketLaunch,
  MagnifyingGlass,
  Trophy,
  Sparkle,
} from "@phosphor-icons/react";

// Map each slot theme to a player-facing category tab.
const THEME_CATEGORY = {
  dragon: "Dragons",
  fortune: "Fortune",
  dynasty: "Fortune",
  goldrush: "Fortune",
  zodiac: "Fortune",
  panda: "Fortune",
  sun: "Fortune",
  olympus: "Fortune",
  egypt: "Egyptian",
  adventure: "Egyptian",
  naval: "Ocean",
  fishing: "Ocean",
  pirate: "Ocean",
  heist: "Military",
  inferno: "Military",
  western: "Military",
  candy: "Military",
  voodoo: "Military",
  tribal: "Military",
  bushido: "Military",
  prairie: "Fortune",
};
const CATEGORIES = ["All", "Dragons", "Fortune", "Military", "Egyptian", "Ocean"];
const catOf = (s) => THEME_CATEGORY[s.theme] || "Military";

function CornerCard({
  children,
  onClick,
  testId,
  accent = "#4EE44E",
  className = "",
}) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      className={`relative text-left bg-[#0a0d0a] border border-border overflow-hidden group hover:-translate-y-1 transition-transform duration-300 ${className}`}
      style={{ boxShadow: "inset 0 0 60px rgba(0,0,0,0.6)" }}
    >
      <span
        className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 z-10"
        style={{ borderColor: accent }}
      />
      <span
        className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 z-10"
        style={{ borderColor: accent }}
      />
      <span
        className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 z-10"
        style={{ borderColor: accent }}
      />
      <span
        className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 z-10"
        style={{ borderColor: accent }}
      />
      {children}
    </button>
  );
}

export default function Lobby() {
  const navigate = useNavigate();
  const [slots, setSlots] = useState([]);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");

  useEffect(() => {
    api
      .get("/games/slots")
      .then(({ data }) => {
        const sorted = [...data].sort((a, b) => {
          if (!!b.is_flagship !== !!a.is_flagship)
            return (b.is_flagship ? 1 : 0) - (a.is_flagship ? 1 : 0);
          return (b.popularity || 0) - (a.popularity || 0);
        });
        setSlots(sorted);
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return slots.filter((s) => {
      const okCat = cat === "All" || catOf(s) === cat;
      const okQ =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.tagline || "").toLowerCase().includes(q) ||
        (s.theme || "").toLowerCase().includes(q);
      return okCat && okQ;
    });
  }, [slots, query, cat]);

  const catCount = (c) =>
    c === "All" ? slots.length : slots.filter((s) => catOf(s) === c).length;

  const symbolPreview = {
    gates_of_glory: ["crown", "gem_red", "orb"],
    book_of_ops: ["idol", "book", "scarab"],
    big_bass_bombardment: ["fisherman", "boat", "scatter"],
    wild_west_recon: ["sheriff", "revolver", "wild"],
    sweet_ammo: ["candy", "heart", "grape"],
    money_train_convoy: ["vault", "coin", "gunner"],
    pharaohs_arsenal: ["pharaoh", "ankh", "anubis"],
    kraken_depths: ["kraken", "pearl", "scatter"],
    inferno_airstrike: ["jet", "missile", "flame"],
    frozen_front: ["yeti", "snow", "wild"],
    golden_dynasty: ["emperor", "lantern", "coin"],
    samurai_strike: ["shogun", "katana", "wild"],
    voodoo_vengeance: ["witchdoctor", "totem", "scatter"],
    corsair_cannons: ["corsair", "doubloon", "compass_sym"],
    warpath_legends: ["warchief", "buffalo", "eagle"],
    bull_rush: ["warchief", "buffalo", "eagle"],
    buffalo_blast: ["warchief", "buffalo", "eagle"],
    prairie_royale: ["warchief", "buffalo", "eagle"],
    stampede_skyline: ["warchief", "buffalo", "eagle"],
    golden_bull_run: ["warchief", "buffalo", "eagle"],
  };

  return (
    <div
      data-testid={LOBBY.root}
      className="max-w-[1400px] mx-auto px-4 sm:px-8 py-12"
    >
      <div className="mb-10">
        <p className="font-mono text-xs tracking-[0.4em] text-nvg/70">
          // OPERATIONS LOBBY
        </p>
        <h1 className="font-display text-5xl sm:text-6xl tracking-wide text-foreground">
          SELECT YOUR MISSION
        </h1>
        <p className="text-muted-foreground mt-2">
          Ranked by deployment popularity. Highest-value targets first.
        </p>
      </div>

      {/* GAME PREVIEW VIDEO */}
      <div className="mb-10">
        <AnimatedShowcase testId="lobby-preview-video" variant="game-preview" />
      </div>

      {/* LIVE OPS — Wheel + Tournament */}
      <LobbyHype />
      <div className="grid sm:grid-cols-2 gap-5 mb-10 mt-6">
        <button
          data-testid={LOBBY.wheelCard}
          onClick={() => navigate("/wheel")}
          className="relative text-left overflow-hidden group border border-gold/40 hover:-translate-y-1 transition-transform duration-300"
          style={{
            background:
              "radial-gradient(130% 130% at 0% 0%, #2a1e05 0%, #0a0d0a 68%)",
          }}
        >
          <div className="p-6 min-h-[140px] flex items-center gap-5">
            <div className="shrink-0 w-16 h-16 rounded-full border-2 border-gold/60 flex items-center justify-center glow-gold animate-spin-slow">
              <Sparkle size={32} weight="fill" className="text-gold" />
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-[0.3em] text-gold/70">
                // DAILY REWARD
              </p>
              <h3 className="font-display text-3xl tracking-wide gold-gradient leading-none">
                STREAK WHEEL
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Free daily spin — up to 50,000 credits. Keep your streak for a
                x2 payout.
              </p>
            </div>
            <CaretRight
              size={22}
              className="ml-auto text-gold/60 group-hover:translate-x-1 transition-transform"
            />
          </div>
        </button>

        <button
          data-testid={LOBBY.tournamentCard}
          onClick={() => navigate("/tournament")}
          className="relative text-left overflow-hidden group border border-nvg/40 hover:-translate-y-1 transition-transform duration-300"
          style={{
            background:
              "radial-gradient(130% 130% at 100% 0%, #05231a 0%, #0a0d0a 68%)",
          }}
        >
          <div className="p-6 min-h-[140px] flex items-center gap-5">
            <div className="shrink-0 w-16 h-16 rounded-full border-2 border-nvg/60 flex items-center justify-center glow-nvg">
              <Trophy size={32} weight="fill" className="text-nvg" />
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-[0.3em] text-nvg/70">
                // LIVE TOURNAMENT
              </p>
              <h3 className="font-display text-3xl tracking-wide nvg-text leading-none">
                OPERATION HIGH ROLLER
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                5,000,000 credit prize pool. Rack up wins, climb the board, cash
                out at reset.
              </p>
            </div>
            <CaretRight
              size={22}
              className="ml-auto text-nvg/60 group-hover:translate-x-1 transition-transform"
            />
          </div>
        </button>
      </div>

      {/* SEARCH + CATEGORY FILTERS */}
      <div className="mb-6 space-y-4">
        <div className="relative max-w-md">
          <MagnifyingGlass
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            data-testid={LOBBY.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search missions by name or theme…"
            className="w-full bg-black/50 border border-border focus:border-nvg text-foreground font-mono text-sm pl-10 pr-4 py-2.5 outline-none transition-colors"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              data-testid={LOBBY.tab(c)}
              onClick={() => setCat(c)}
              className={`font-stencil text-xs tracking-widest uppercase px-4 py-2 border transition-all ${
                cat === c
                  ? "border-nvg bg-nvg/15 text-nvg glow-nvg"
                  : "border-border text-muted-foreground hover:border-nvg/50 hover:text-foreground"
              }`}
            >
              {c}{" "}
              <span className="opacity-60">({catCount(c)})</span>
            </button>
          ))}
        </div>
      </div>

      {/* SLOTS GRID (asymmetric) */}
      <div className="flex items-center gap-3 mb-5">
        <span className="font-display text-2xl gold-gradient tracking-widest">
          ★ AAA FLAGSHIPS
        </span>
        <span className="font-mono text-[10px] tracking-widest text-gold/60">
          HOLD &amp; WIN · JACKPOTS · POWER WHEEL
        </span>
        <div className="flex-1 h-px bg-gold/20" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-fr">
        {filtered.map((s, i) => {
          const art = MACHINE_ART[s.id] || {
            accent: "#4EE44E",
            from: "#0a1f0a",
            to: "#0a0d0a",
            tag: "",
          };
          const flag = s.is_flagship ? FLAGSHIP_ART[s.id] : null;
          const feature = i === 0; // first (most popular) spans wider on large screens

          if (flag) {
            return (
              <CornerCard
                key={s.id}
                testId={LOBBY.slotCard(s.id)}
                accent={flag.accent}
                onClick={() => navigate(`/slots/${s.id}`)}
                className={feature ? "lg:col-span-2" : ""}
              >
                <div className="relative h-full min-h-[220px] overflow-hidden">
                  <img
                    src={flag.thumb}
                    alt={s.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.92) 100%)",
                    }}
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span
                      className="font-mono text-[10px] tracking-widest px-2 py-0.5 bg-black/60 border"
                      style={{
                        borderColor: `${flag.accent}88`,
                        color: flag.accent,
                      }}
                    >
                      #{i + 1} MOST WANTED
                    </span>
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    <span className="font-mono text-[9px] px-2 py-0.5 bg-black/70 border border-gold/50 text-gold tracking-widest">
                      JACKPOT
                    </span>
                    <span className="font-mono text-[9px] px-2 py-0.5 bg-black/70 border border-alert/50 text-alert tracking-widest">
                      {s.volatility.toUpperCase()}
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="font-mono text-[10px] tracking-[0.3em]"
                        style={{ color: flag.accent }}
                      >
                        ★ AAA FLAGSHIP
                      </span>
                    </div>
                    <h3 className="font-display text-4xl sm:text-5xl tracking-wide text-white leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                      {s.name}
                    </h3>
                    <p className="text-sm text-white/70 mt-1">{s.tagline}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-mono text-[11px] text-gold">
                        HOLD &amp; WIN · ROYAL 10,000×
                      </span>
                      <span
                        className="flex items-center gap-1 font-stencil tracking-widest uppercase text-sm px-3 py-1 rounded-sm"
                        style={{ background: flag.accent, color: "#150c02" }}
                      >
                        Deploy <CaretRight size={14} weight="bold" />
                      </span>
                    </div>
                  </div>
                </div>
              </CornerCard>
            );
          }
          return (
            <CornerCard
              key={s.id}
              testId={LOBBY.slotCard(s.id)}
              accent={art.accent}
              onClick={() => navigate(`/slots/${s.id}`)}
              className={feature ? "lg:col-span-2" : ""}
            >
              <div
                className="p-6 h-full flex flex-col justify-between min-h-[220px]"
                style={{
                  background: `radial-gradient(120% 120% at 50% 0%, ${art.from} 0%, ${art.to} 70%)`,
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono text-[10px] tracking-widest px-2 py-0.5 border"
                      style={{
                        borderColor: `${art.accent}66`,
                        color: art.accent,
                      }}
                    >
                      #{i + 1} MOST WANTED
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-gold border border-gold/40 px-2 py-0.5">
                    {s.volatility.toUpperCase()} VOL
                  </span>
                </div>

                <div className="flex items-center gap-4 my-4">
                  {(symbolPreview[s.id] || []).map((sym, idx) => (
                    <div
                      key={`${s.id}-${sym}-${idx}`}
                      className="animate-pop"
                      style={{ animationDelay: `${idx * 0.06}s` }}
                    >
                      <SymbolTile id={sym} size={feature ? 60 : 46} />
                    </div>
                  ))}
                </div>

                <div>
                  <h3 className="font-display text-4xl tracking-wide text-foreground leading-none group-hover:gold-gradient">
                    {s.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {s.tagline}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span
                      className="font-mono text-[11px]"
                      style={{ color: art.accent }}
                    >
                      {art.tag}
                    </span>
                    <span
                      className="flex items-center gap-1 font-stencil tracking-widest uppercase text-sm"
                      style={{ color: art.accent }}
                    >
                      Deploy <CaretRight size={14} weight="bold" />
                    </span>
                  </div>
                </div>
              </div>
            </CornerCard>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div
          data-testid={LOBBY.empty}
          className="hud p-10 text-center text-muted-foreground font-mono text-sm mt-2"
        >
          No missions match “{query}”{cat !== "All" ? ` in ${cat}` : ""}. Try a
          different search or category.
        </div>
      )}

      {/* REINFORCEMENTS INBOUND — 100+ slots coming soon */}
      <div
        data-testid="lobby-coming-soon"
        className="mt-8 hud hud-gold relative overflow-hidden"
      >
        <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="shrink-0 w-16 h-16 rounded-full border-2 border-gold/60 flex items-center justify-center glow-gold">
            <RocketLaunch size={34} weight="fill" className="text-gold" />
          </div>
          <div className="flex-1">
            <p className="font-mono text-xs tracking-[0.4em] text-gold animate-flicker">
              // REINFORCEMENTS INBOUND
            </p>
            <h2 className="font-display text-3xl sm:text-4xl tracking-wide gold-gradient leading-none mt-1">
              100+ ELITE SLOTS BEING DEPLOYED
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              A hundred more high-grade, chart-topping pokies are inbound — soon
              to be delivered to the Wages of War ops floor. Lock in your rank
              now and be first to spin them.
            </p>
          </div>
          <span className="font-stencil tracking-widest uppercase text-sm text-black bg-gold px-4 py-2 whitespace-nowrap glow-gold">
            COMING SOON
          </span>
        </div>
      </div>

      {/* OTHER GAMES */}
      <div className="mt-12 mb-6">
        <p className="font-mono text-xs tracking-[0.4em] text-nvg/70">
          // SPECIAL OPS
        </p>
        <h2 className="font-display text-4xl tracking-wide text-foreground">
          QUICK STRIKES
        </h2>
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <CornerCard
          testId={LOBBY.kenoCard}
          accent="#4EE44E"
          onClick={() => navigate("/keno")}
        >
          <div
            className="p-6 min-h-[160px] flex items-center gap-5"
            style={{
              background:
                "radial-gradient(120% 120% at 0% 0%, #0a1f0a 0%, #0a0d0a 70%)",
            }}
          >
            <Target size={64} weight="duotone" className="text-nvg shrink-0" />
            <div>
              <h3 className="font-display text-4xl tracking-wide text-foreground group-hover:text-nvg">
                WARHEAD KENO
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Mark up to 10 targets. 20 warheads drop. Hit big for up to
                5,000x.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 font-stencil tracking-widest uppercase text-sm text-nvg">
                Launch <CaretRight size={14} />
              </span>
            </div>
          </div>
        </CornerCard>

        <CornerCard
          testId={LOBBY.coinflipCard}
          accent="#D4AF37"
          onClick={() => navigate("/coinflip")}
        >
          <div
            className="p-6 min-h-[160px] flex items-center gap-5"
            style={{
              background:
                "radial-gradient(120% 120% at 100% 0%, #231a06 0%, #0a0d0a 70%)",
            }}
          >
            <Coins size={64} weight="duotone" className="text-gold shrink-0" />
            <div>
              <h3 className="font-display text-4xl tracking-wide text-foreground group-hover:gold-gradient">
                DOG-TAG FLIP
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Call heads or tails. Instant 1.96x payout. Pure nerve.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 font-stencil tracking-widest uppercase text-sm text-gold">
                Flip <CaretRight size={14} />
              </span>
            </div>
          </div>
        </CornerCard>
      </div>
    </div>
  );
}
