import React, { useEffect, useRef, useState } from "react";
import { Trophy, Lightning } from "@phosphor-icons/react";

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
const GAMES = [
  "Pharaoh's Arsenal",
  "Inferno Airstrike",
  "Gates of Olympus",
  "Dragon's Riches",
  "Golden Dynasty",
  "Warhead Keno",
  "Book of Ops",
  "5 Dragons",
  "God of Sun",
  "Fortune Coins",
];

const rand = (a, b) => Math.floor(Math.random() * (b - a) + a);
const money = (n) => n.toLocaleString("en-US");

function makeWin() {
  return {
    id: Math.random().toString(36).slice(2),
    name: NAMES[rand(0, NAMES.length)],
    game: GAMES[rand(0, GAMES.length)],
    amount: rand(5, 480) * 100,
  };
}

export function LobbyHype() {
  const [jackpot, setJackpot] = useState(2847193);
  const [wins, setWins] = useState(() => Array.from({ length: 8 }, makeWin));
  const ref = useRef();

  useEffect(() => {
    const j = setInterval(() => setJackpot((v) => v + rand(7, 90)), 900);
    const w = setInterval(
      () => setWins((prev) => [makeWin(), ...prev].slice(0, 12)),
      3500,
    );
    return () => {
      clearInterval(j);
      clearInterval(w);
    };
  }, []);

  return (
    <div data-testid="lobby-hype" className="mb-8 space-y-3">
      <div className="hud hud-gold relative overflow-hidden px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy
            size={30}
            weight="fill"
            className="text-gold animate-flicker"
          />
          <div>
            <p className="font-mono text-[10px] tracking-[0.4em] text-gold/70">
              // GLOBAL MEGA JACKPOT
            </p>
            <p
              data-testid="jackpot-ticker"
              className="font-display text-3xl sm:text-4xl gold-gradient leading-none tabular-nums"
            >
              {money(jackpot)}
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] tracking-widest text-nvg/70">
          <span className="w-2 h-2 rounded-full bg-alert animate-flicker" />{" "}
          LIVE · CLIMBING
        </div>
      </div>

      <div className="relative overflow-hidden border border-nvg/20 bg-black/50 py-2">
        <div className="flex items-center gap-2 px-3 absolute left-0 top-0 bottom-0 z-10 bg-black/80 font-mono text-[10px] tracking-widest text-nvg">
          <Lightning size={12} weight="fill" /> WINS
        </div>
        <div
          ref={ref}
          className="flex gap-8 whitespace-nowrap animate-marquee pl-24"
        >
          {[...wins, ...wins].map((w, i) => (
            <span
              key={w.id + i}
              className="font-mono text-xs text-muted-foreground"
            >
              <span className="text-nvg">{w.name}</span> hit{" "}
              <span className="text-gold">{money(w.amount)}</span> on{" "}
              <span className="text-foreground">{w.game}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
