import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { BRAND, fmt } from "@/data/gameMeta";
import { LANDING } from "@/constants/testIds";
import api from "@/lib/api";
import {
  Coins, GameController, Medal, Trophy, ShieldCheck, Lightning, CaretRight, Target, Gift,
} from "@phosphor-icons/react";

export default function Landing() {
  const { user, openAuth } = useAuth();
  const navigate = useNavigate();
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    api.get("/games/slots").then(({ data }) => setSlots(data.slice(0, 3))).catch(() => {});
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
        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-8 pt-24 pb-28 md:pt-32 md:pb-40">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-6 animate-pop">
              <span className="border border-nvg/50 text-nvg font-mono text-xs px-3 py-1 tracking-widest">
                MGA/B2C/912/2025
              </span>
              <span className="border border-gold/50 text-gold font-mono text-xs px-3 py-1 tracking-widest">
                NIGHT-VISION OPS
              </span>
            </div>
            <h1 className="font-display text-6xl sm:text-7xl lg:text-8xl leading-[0.85] tracking-tight animate-pop" style={{ animationDelay: "0.05s" }}>
              <span className="gold-gradient">WAGES OF WAR</span>
              <br />
              <span className="text-foreground/90 text-4xl sm:text-5xl lg:text-6xl tracking-[0.2em]">CASINO</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-foreground/80 max-w-xl leading-relaxed animate-pop" style={{ animationDelay: "0.1s" }}>
              Deploy into the most elite military-themed slot floor ever engineered. Best-in-class
              reels, deep bonus mechanics, and gold-tier rewards — powered by pure play-money credits.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4 animate-pop" style={{ animationDelay: "0.15s" }}>
              <Button
                data-testid={LANDING.enlistCta}
                onClick={primaryCta}
                className="bg-gold hover:bg-gold/90 text-black font-display text-xl tracking-widest px-8 h-14 glow-gold gap-2"
              >
                <Lightning size={22} weight="fill" />
                {user ? "RESUME OPS" : "ENLIST — GET 10,000 FREE"}
              </Button>
              <Button
                data-testid={LANDING.enterLobby}
                onClick={() => navigate("/lobby")}
                variant="outline"
                className="border-nvg/40 text-nvg hover:bg-nvg/10 font-display text-xl tracking-widest px-8 h-14 gap-2"
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
            { Icon: GameController, label: "SLOT MACHINES", value: "6 Elite" },
            { Icon: Target, label: "WARHEAD KENO", value: "5000x Max" },
            { Icon: Medal, label: "VIP RANKS", value: "8 Tiers" },
            { Icon: Gift, label: "DAILY SUPPLY DROP", value: "Every 24h" },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3 py-6 px-4 border-r border-border last:border-r-0">
              <s.Icon size={30} weight="fill" className="text-nvg" />
              <div>
                <div className="font-display text-2xl tracking-wide text-gold leading-none">{s.value}</div>
                <div className="font-mono text-[10px] tracking-widest text-muted-foreground mt-1">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-8 py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="font-mono text-xs tracking-[0.4em] text-nvg/70">// PRIORITY TARGETS</p>
            <h2 className="font-display text-4xl sm:text-5xl tracking-wide text-foreground">MOST WANTED SLOTS</h2>
          </div>
          <Link to="/lobby" className="hidden sm:flex items-center gap-1 font-stencil tracking-widest text-gold hover:text-gold/80 uppercase">
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
                <span className="font-mono text-[10px] tracking-widest text-nvg/70">RTP-CLASS</span>
                <span className="font-mono text-[10px] text-gold border border-gold/40 px-2 py-0.5">{s.volatility}</span>
              </div>
              <h3 className="font-display text-3xl tracking-wide text-foreground mt-3 group-hover:gold-gradient">{s.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{s.tagline}</p>
              <div className="mt-4 flex items-center gap-1 text-nvg font-stencil tracking-widest text-sm uppercase">
                Deploy <CaretRight size={14} />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* GIVEAWAY BANNER */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-8 pb-20" data-testid={LANDING.giveaway}>
        <div className="hud hud-gold overflow-hidden grid md:grid-cols-2 items-center gap-8 p-8">
          <div>
            <p className="font-mono text-xs tracking-[0.4em] text-gold animate-flicker">// MISSION ALERT</p>
            <h2 className="font-display text-4xl sm:text-5xl tracking-wide gold-gradient mt-2">THE $35,000 GIVEAWAY IS LIVE</h2>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              To celebrate the launch of the Nexus Studio Master fleet, one full Turnkey Platform
              License is up for extraction. Enlist, climb the ranks, and join the elite.
            </p>
            <Button onClick={primaryCta} className="mt-6 bg-nvg hover:bg-nvg/90 text-black font-display text-lg tracking-widest px-6 glow-nvg">
              JOIN THE ELITE
            </Button>
          </div>
          <div className="relative">
            <img src={BRAND.giveaway} alt="Wages of War Casino giveaway" className="w-full max-w-sm mx-auto ring-1 ring-gold/30" />
          </div>
        </div>
      </section>

      {/* COMPLIANCE */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-8 pb-24">
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center text-center sm:text-left">
          <ShieldCheck size={40} weight="fill" className="text-gold" />
          <p className="font-mono text-sm text-muted-foreground max-w-2xl leading-relaxed">
            <span className="text-foreground">Wages of War Operations Ltd.</span> operates under Malta Gaming
            Authority licence <span className="text-gold">MGA/B2C/912/2025</span>. All play is with virtual
            play-money credits. 18+ only. <Link to="/responsible-gaming" className="text-nvg underline">Play responsibly.</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
