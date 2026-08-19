import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { BRAND, fmt } from "@/data/gameMeta";
import { LANDING } from "@/constants/testIds";
import api from "@/lib/api";
import { AnimatedShowcase } from "@/components/AnimatedShowcase";
import {
  Coins,
  GameController,
  Medal,
  Trophy,
  ShieldCheck,
  Lightning,
  CaretRight,
  Target,
  Gift,
  Clock,
  ArrowUpRight,
} from "@phosphor-icons/react";

const GIVEAWAY_ANCHOR = Date.UTC(2026, 0, 2, 20, 0, 0); // launch reference
const GIVEAWAY_CYCLE = 30 * 86400000; // rolling 30-day draw cycle

function nextDrawTarget(now) {
  let target = GIVEAWAY_ANCHOR;
  if (now >= target) {
    const cycles = Math.ceil((now - target + 1) / GIVEAWAY_CYCLE);
    target += cycles * GIVEAWAY_CYCLE;
  }
  return target;
}

function GiveawayCountdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, nextDrawTarget(now) - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const urgent = diff < 86400000; // final 24 hours
  const unit = (val, label) => (
    <div className="text-center">
      <div
        className={`font-display text-4xl sm:text-5xl tracking-wide leading-none tabular-nums ${urgent ? "text-alert" : "gold-gradient"}`}
        style={
          urgent ? { textShadow: "0 0 16px rgba(255,59,48,0.7)" } : undefined
        }
      >
        {String(val).padStart(2, "0")}
      </div>
      <div className="font-mono text-[9px] tracking-[0.3em] text-muted-foreground mt-1">
        {label}
      </div>
    </div>
  );
  return (
    <div
      data-testid="giveaway-countdown"
      className={`mt-5 ${urgent ? "animate-flicker" : ""}`}
    >
      <div
        className={`flex items-center gap-2 font-mono text-[11px] tracking-[0.3em] mb-2 ${urgent ? "text-alert" : "text-nvg"}`}
      >
        <Clock size={14} weight="fill" />{" "}
        {urgent
          ? "⚠ FINAL 24 HOURS — EXTRACTION IMMINENT"
          : "TIME TO EXTRACTION"}
      </div>
      <div
        className={`flex items-center gap-3 sm:gap-5 ${urgent ? "sep-alert" : ""}`}
      >
        {unit(d, "DAYS")}
        <span
          className={`text-3xl -mt-3 ${urgent ? "text-alert/50" : "text-gold/40"}`}
        >
          :
        </span>
        {unit(h, "HRS")}
        <span
          className={`text-3xl -mt-3 ${urgent ? "text-alert/50" : "text-gold/40"}`}
        >
          :
        </span>
        {unit(m, "MIN")}
        <span
          className={`text-3xl -mt-3 ${urgent ? "text-alert/50" : "text-gold/40"}`}
        >
          :
        </span>
        {unit(s, "SEC")}
      </div>
    </div>
  );
}

export default function Landing() {
  const { user, openAuth } = useAuth();
  const navigate = useNavigate();
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    api
      .get("/games/slots")
      .then(({ data }) => setSlots(data.slice(0, 3)))
      .catch(() => {});
  }, []);

  const primaryCta = () => (user ? navigate("/lobby") : openAuth("register"));

  return (
    <div data-testid={LANDING.hero}>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${BRAND.hero})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-[#050605]" />
        <img
          src={BRAND.coinNightOps}
          alt="Wages of War Casino — Night Ops Edition"
          data-testid="hero-nightops-coin"
          className="absolute top-4 right-4 sm:top-8 sm:right-8 w-24 sm:w-36 md:w-48 lg:w-56 z-20 animate-coin-intro pointer-events-none select-none"
          style={{ filter: "drop-shadow(0 0 34px rgba(212,175,55,0.5))" }}
        />
        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28 md:pt-32 md:pb-40">
          <div className="mx-auto max-w-3xl text-center sm:text-left sm:mx-0 sm:max-w-[38rem] md:max-w-[42rem]">
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6 animate-pop sm:justify-start">
              <span className="border border-nvg/50 text-nvg font-mono text-xs px-3 py-1 tracking-widest">
                MGA/B2C/912/2025
              </span>
              <span className="border border-gold/50 text-gold font-mono text-xs px-3 py-1 tracking-widest">
                NIGHT-VISION OPS
              </span>
              <span
                data-testid="hero-award-badge"
                className="flex items-center gap-1.5 border border-gold/70 bg-gold/10 text-gold font-mono text-xs px-3 py-1 tracking-widest glow-gold"
              >
                <Trophy size={13} weight="fill" /> BEST PLATFORM 2026
              </span>
            </div>
            <h1
              className="font-display text-5xl sm:text-7xl lg:text-8xl leading-[0.85] tracking-tight animate-pop"
              style={{ animationDelay: "0.05s" }}
            >
              <span className="gold-gradient">WAGES OF WAR</span>
              <br />
              <span className="text-foreground/90 text-3xl sm:text-5xl lg:text-6xl tracking-[0.2em]">
                CASINO
              </span>
            </h1>
            <p
              className="mx-auto mt-6 max-w-xl text-base text-foreground/80 leading-relaxed animate-pop sm:mx-0 sm:text-lg"
              style={{ animationDelay: "0.1s" }}
            >
              Deploy into the most elite military-themed slot floor ever
              engineered. Best-in-class reels, deep bonus mechanics, and
              gold-tier rewards — powered by pure play-money credits.
            </p>
            <div
              className="mt-9 flex flex-col items-center gap-4 animate-pop sm:flex-row sm:items-center sm:justify-start"
              style={{ animationDelay: "0.15s" }}
            >
              <Button
                data-testid={LANDING.enlistCta}
                onClick={primaryCta}
                className="w-full bg-gold hover:bg-gold/90 text-black font-display text-xl tracking-widest px-8 h-14 glow-gold gap-2 sm:w-auto"
              >
                <Lightning size={22} weight="fill" />
                {user ? "RESUME OPS" : "ENLIST — GET 10,000 FREE"}
              </Button>
              <Button
                data-testid="home-verify-bonus-btn"
                onClick={() =>
                  user ? navigate("/cashier") : openAuth("register")
                }
                variant="outline"
                className="w-full border-gold/40 text-gold hover:bg-gold/10 font-display text-xl tracking-widest px-8 h-14 gap-2 sm:w-auto"
              >
                <Gift size={22} weight="fill" /> CLAIM $10 VERIFY BONUS
              </Button>
              <Button
                data-testid={LANDING.enterLobby}
                onClick={() => navigate("/lobby")}
                variant="outline"
                className="w-full border-nvg/40 text-nvg hover:bg-nvg/10 font-display text-xl tracking-widest px-8 h-14 gap-2 sm:w-auto"
              >
                <GameController size={22} weight="fill" /> ENTER LOBBY
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="border-y border-gold/20 bg-black/50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 grid grid-cols-2 md:grid-cols-4">
          {[
            { Icon: GameController, label: "SLOT MACHINES", value: "Elite" },
            { Icon: Target, label: "WARHEAD KENO", value: "5000x Max" },
            { Icon: Medal, label: "VIP RANKS", value: "8 Tiers" },
            { Icon: Gift, label: "DAILY SUPPLY DROP", value: "Every 24h" },
          ].map((s, i) => (
            <div
              key={s.label}
              className="flex items-center gap-3 py-6 px-4 border-r border-border last:border-r-0"
            >
              <s.Icon size={30} weight="fill" className="text-nvg" />
              <div>
                <div className="font-display text-2xl tracking-wide text-gold leading-none">
                  {s.value}
                </div>
                <div className="font-mono text-[10px] tracking-widest text-muted-foreground mt-1">
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* INTRO VIDEO */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-8 pt-16">
        <div className="mb-6">
          <p className="font-mono text-xs tracking-[0.4em] text-nvg/70">
            // BRIEFING REEL
          </p>
          <h2 className="font-display text-4xl sm:text-5xl tracking-wide text-foreground">
            MISSION BRIEFING
          </h2>
        </div>
        <AnimatedShowcase testId="home-intro-video" variant="promo" />
      </section>

      {/* NIGHT VISION GOLD */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-8 py-20">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-xs tracking-[0.4em] text-gold/70">
              // NIGHT VISION GOLD
            </p>
            <h2 className="font-display text-4xl sm:text-5xl tracking-wide text-foreground">
              OPS UPGRADE PACKAGE
            </h2>
          </div>
          <div className="font-mono text-xs tracking-[0.22em] text-nvg/80 uppercase">
            Gold-tier combat deck. Zero fluff. Maximum payout.
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="hud hud-gold p-6 md:p-8">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "TACTICAL PAYLINES",
                  body: "High-contrast reels, precision bonus states, and premium unlocks tuned for elite sessions.",
                  icon: Target,
                },
                {
                  title: "GOLD VAULT",
                  body: "Instant credit visibility, VIP rank-ups, and gold-boosted rewards that reward consistent play.",
                  icon: Coins,
                },
                {
                  title: "ELITE OPS",
                  body: "Night-vision branding, polished UX, and a cleaner path from entrance to payout geometry.",
                  icon: ShieldCheck,
                },
              ].map(({ title, body, icon: Icon }) => (
                <div
                  key={title}
                  className="group rounded border border-gold/20 bg-black/30 p-4 transition-all duration-300 hover:border-gold/60 hover:shadow-[0_0_28px_rgba(212,175,55,0.18)]"
                >
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded border border-gold/40 bg-gold/10 text-gold">
                    <Icon size={20} weight="fill" />
                  </div>
                  <h3 className="font-display text-2xl tracking-wide text-foreground mb-2">
                    {title}
                  </h3>
                  <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="hud p-6 md:p-8 border-nvg/30 bg-[radial-gradient(circle_at_top,_rgba(78,228,78,0.12),_transparent_45%)]">
            <div className="font-mono text-[10px] tracking-[0.35em] text-nvg/75 uppercase">
              // target profile
            </div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-display text-4xl tracking-wide gold-gradient">
                  GOLD
                </div>
                <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
                  tier status
                </div>
              </div>
              <div className="rounded-full border border-gold/50 bg-gold/10 px-3 py-1 font-mono text-[10px] tracking-[0.3em] text-gold uppercase">
                LIVE
              </div>
            </div>
            <div className="mt-6 space-y-4 text-sm text-muted-foreground">
              <div className="flex items-center justify-between rounded border border-border bg-black/25 px-3 py-2">
                <span>VIP progression</span>
                <span className="text-gold">8 tiers</span>
              </div>
              <div className="flex items-center justify-between rounded border border-border bg-black/25 px-3 py-2">
                <span>Daily supply</span>
                <span className="text-nvg">24h cycle</span>
              </div>
              <div className="flex items-center justify-between rounded border border-border bg-black/25 px-3 py-2">
                <span>Mission access</span>
                <span className="text-gold">Elite</span>
              </div>
            </div>
            <Button
              onClick={primaryCta}
              className="mt-6 w-full bg-gold hover:bg-gold/90 text-black font-display text-lg tracking-widest px-5 h-12 glow-gold gap-2"
            >
              <Lightning size={18} weight="fill" /> UPGRADE NOW
            </Button>
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-8 py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="font-mono text-xs tracking-[0.4em] text-nvg/70">
              // PRIORITY TARGETS
            </p>
            <h2 className="font-display text-4xl sm:text-5xl tracking-wide text-foreground">
              MOST WANTED SLOTS
            </h2>
          </div>
          <Link
            to="/lobby"
            className="hidden sm:flex items-center gap-1 font-stencil tracking-widest text-gold hover:text-gold/80 uppercase"
          >
            All Missions <CaretRight size={16} />
          </Link>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {slots.map((s, i) => (
            <button
              key={s.id}
              onClick={() => navigate(`/slots/${s.id}`)}
              className="hud text-left p-6 group hover:border-gold/60 transition-colors animate-pop"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-widest text-nvg/70">
                  RTP-CLASS
                </span>
                <span className="font-mono text-[10px] text-gold border border-gold/40 px-2 py-0.5">
                  {s.volatility}
                </span>
              </div>
              <h3 className="font-display text-3xl tracking-wide text-foreground mt-3 group-hover:gold-gradient">
                {s.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{s.tagline}</p>
              <div className="mt-4 flex items-center gap-1 text-nvg font-stencil tracking-widest text-sm uppercase">
                Deploy <CaretRight size={14} />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* GIVEAWAY BANNER */}
      <section
        className="max-w-[1400px] mx-auto px-4 sm:px-8 pb-20"
        data-testid={LANDING.giveaway}
      >
        <div className="hud hud-gold overflow-hidden grid md:grid-cols-2 items-center gap-8 p-8">
          <div>
            <button
              onClick={() => navigate("/fleet-sales")}
              data-testid="giveaway-nexus-banner"
              className="group relative block w-full mb-6 overflow-hidden border border-gold/25 ring-1 ring-black/40 hover:border-gold/70 transition-colors"
              style={{ boxShadow: "0 0 22px rgba(212,175,55,0.18)" }}
            >
              <img
                src={BRAND.nexusBanner}
                alt="Nexus Studio Master — Global Gaming Fleet Sales"
                className="w-full transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <span className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 border border-gold/40 text-gold font-mono text-[10px] tracking-widest px-2 py-1 opacity-90 group-hover:opacity-100">
                FLEET SALES <ArrowUpRight size={12} weight="bold" />
              </span>
            </button>
            <p className="font-mono text-xs tracking-[0.4em] text-gold animate-flicker">
              // MISSION ALERT
            </p>
            <h2 className="font-display text-4xl sm:text-5xl tracking-wide gold-gradient mt-2">
              THE $35,000 GIVEAWAY IS LIVE
            </h2>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              To celebrate the launch of the Nexus Studio Master fleet, one full
              Turnkey Platform Licence is up for extraction. Enlist, climb the
              ranks, and join the elite.
            </p>
            <GiveawayCountdown />
            <Button
              onClick={primaryCta}
              className="mt-6 bg-nvg hover:bg-nvg/90 text-black font-display text-lg tracking-widest px-6 glow-nvg"
            >
              JOIN THE ELITE
            </Button>
          </div>
          <div className="relative">
            <img
              src={BRAND.giveaway}
              alt="Wages of War Casino giveaway"
              className="w-full max-w-sm mx-auto ring-1 ring-gold/30"
            />
            <div className="mt-6">
              <AnimatedShowcase testId="giveaway-video" variant="giveaway" />
            </div>
          </div>
        </div>
      </section>

      {/* COMPLIANCE */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-8 pb-24">
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center text-center sm:text-left">
          <ShieldCheck size={40} weight="fill" className="text-gold" />
          <p className="font-mono text-sm text-muted-foreground max-w-2xl leading-relaxed">
            <span className="text-foreground">
              Wages of War Operations Ltd.
            </span>{" "}
            operates under Malta Gaming Authority licence{" "}
            <span className="text-gold">MGA/B2C/912/2025</span>. All play is
            with virtual play-money credits. 18+ only.{" "}
            <Link to="/responsible-gaming" className="text-nvg underline">
              Play responsibly.
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
