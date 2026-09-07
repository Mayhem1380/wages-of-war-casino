import React, { useEffect, useRef, useState } from "react";
import { Broadcast } from "@phosphor-icons/react";

// Always-on WARKINO draw board. Runs continuously (even with no players): a new
// ball every 3s, 20 balls per 60s round, then resets. Pure display + ticker.
const ROUND = 20;
const NAMES = ["Ghost", "Viper", "Recon6", "NightHawk", "Bandit", "Reaper", "K9-Rex", "Sniper1", "Delta", "Foxtrot", "Warlord", "Apex", "Havoc", "Ranger"];
const money = () => "$" + (Math.floor(Math.random() * 480) + 20) * 5;

function drawFor(bucket) {
  // deterministic-ish set from bucket so it always progresses
  const out = [];
  let seed = bucket * 2654435761;
  while (out.length < ROUND) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const n = (seed % 80) + 1;
    if (!out.includes(n)) out.push(n);
  }
  return out;
}

export function LiveDrawBoard() {
  const [count, setCount] = useState(1);
  const roundRef = useRef(Math.floor(Date.now() / 60000));
  const full = drawFor(roundRef.current);
  const [ticker, setTicker] = useState(() =>
    Array.from({ length: 6 }, () => ({
      n: NAMES[Math.floor(Math.random() * NAMES.length)],
      w: money(),
    })),
  );

  useEffect(() => {
    const t = setInterval(() => {
      setCount((c) => {
        if (c >= ROUND) {
          roundRef.current = Math.floor(Date.now() / 60000);
          return 1;
        }
        return c + 1;
      });
      if (Math.random() > 0.5)
        setTicker((prev) =>
          [
            { n: NAMES[Math.floor(Math.random() * NAMES.length)], w: money() },
            ...prev,
          ].slice(0, 6),
        );
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const drawn = full.slice(0, count);
  const last = drawn[drawn.length - 1];

  return (
    <section
      data-testid="warkino-live-board"
      className="hud hud-gold p-5 mb-10 bg-black/60"
    >
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="font-display text-2xl tracking-widest gold-gradient flex items-center gap-2">
          <Broadcast size={22} weight="fill" className="text-danger animate-pulse" />
          WARKINO · LIVE DRAW
        </p>
        <span className="font-mono text-xs text-nvg tracking-widest">
          BALL {count}/{ROUND} · DRAWING NON-STOP
        </span>
      </div>

      <div className="grid grid-cols-10 sm:grid-cols-20 gap-1 mb-4" style={{ gridTemplateColumns: "repeat(20, minmax(0,1fr))" }}>
        {Array.from({ length: 80 }, (_, k) => {
          const n = k + 1;
          const hit = drawn.includes(n);
          const isLast = n === last;
          return (
            <div
              key={n}
              className="aspect-square flex items-center justify-center text-[9px] sm:text-[10px] font-mono rounded-sm"
              style={{
                background: isLast ? "#F6C64A" : hit ? "rgba(212,175,55,0.28)" : "rgba(255,255,255,0.04)",
                color: isLast ? "#150c02" : hit ? "#F6E27A" : "rgba(255,255,255,0.35)",
                border: hit ? "1px solid rgba(212,175,55,0.6)" : "1px solid rgba(255,255,255,0.06)",
                transition: "all .3s",
              }}
            >
              {n}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 overflow-hidden border-t border-gold/20 pt-3">
        <span className="font-mono text-[10px] text-danger tracking-widest shrink-0">
          ● LIVE WINS
        </span>
        <div className="flex gap-4 overflow-hidden whitespace-nowrap">
          {ticker.map((t, i) => (
            <span key={i} className="font-mono text-xs text-foreground/80 shrink-0">
              {t.n} <span className="text-gold">{t.w}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
