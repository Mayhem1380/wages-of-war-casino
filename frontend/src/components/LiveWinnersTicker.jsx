import React, { useEffect, useRef, useState } from "react";
import { Broadcast, Trophy } from "@phosphor-icons/react";
import { sfx } from "@/lib/sounds";

const NAMES = [
  "GhostRecon_07",
  "Viper6Actual",
  "NightOwl",
  "Reaper_Actual",
  "Bravo_Zulu",
  "SaltyK9",
  "IronSightz",
  "Overwatch",
  "Delta_Nomad",
  "Havoc44",
  "SierraHotel",
  "Warlord_X",
];

const rand = (a, b) => Math.floor(Math.random() * (b - a) + a);
const money = (n) => n.toLocaleString("en-US");

function makeWin(game) {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    name: NAMES[rand(0, NAMES.length)],
    amount: rand(5, 480) * 100,
    game,
  };
}

/**
 * Digital live screen: an always-on "broadcast" strip that animates the
 * latest draws/spins and a scrolling feed of recent winners. Shared across
 * Warkino (Keno) and the other games so every table has the same lounge feel.
 */
export function LiveWinnersTicker({ game = "Wages of War", intervalMs = 3200 }) {
  const [wins, setWins] = useState(() =>
    Array.from({ length: 8 }, () => makeWin(game)),
  );

  useEffect(() => {
    const t = setInterval(() => {
      setWins((prev) => [makeWin(game), ...prev].slice(0, 12));
      sfx.liveTicker();
    }, intervalMs);
    return () => clearInterval(t);
  }, [game, intervalMs]);

  return (
    <div
      data-testid="live-winners-ticker"
      className="hud relative overflow-hidden border-nvg/20 bg-black/50 py-2 mb-4"
    >
      <div className="flex items-center gap-2 px-3 absolute left-0 top-0 bottom-0 z-10 bg-black/85 font-mono text-[10px] tracking-widest text-nvg">
        <Broadcast size={12} weight="fill" className="animate-flicker" /> LIVE
      </div>
      <div className="flex gap-8 whitespace-nowrap animate-marquee pl-24">
        {[...wins, ...wins].map((w, i) => (
          <span
            key={w.id + i}
            className="font-mono text-xs text-muted-foreground inline-flex items-center gap-1"
          >
            <Trophy size={12} weight="fill" className="text-gold" />
            <span className="text-nvg">{w.name}</span> hit{" "}
            <span className="text-gold">${money(w.amount)}</span> on{" "}
            <span className="text-foreground">{w.game}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
