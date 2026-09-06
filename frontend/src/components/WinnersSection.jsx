import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { fmt } from "@/data/gameMeta";
import { Crown, Medal, Trophy, TrendUp } from "@phosphor-icons/react";

const MEDAL_COLORS = ["#F6E27A", "#C0C0C0", "#CD7F32"];

function WinnerCard({ winner }) {
  const color = MEDAL_COLORS[winner.rank - 1] || "#4EE44E";
  return (
    <article
      className="relative overflow-hidden border border-gold/20 bg-black/55 p-5 transition-transform duration-300 hover:-translate-y-1 hover:border-gold/60"
      style={{ boxShadow: `inset 0 0 35px ${color}12` }}
    >
      <div
        className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10 blur-2xl"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full border"
            style={{ borderColor: `${color}88`, color }}
            aria-label={`Rank ${winner.rank}`}
          >
            {winner.rank <= 3 ? (
              <Crown size={22} weight="fill" />
            ) : (
              <span className="font-display text-xl">{winner.rank}</span>
            )}
          </div>
          <div>
            <h3 className="font-display text-xl tracking-wide text-foreground">
              {winner.name}
            </h3>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold/75">
              {winner.vip_tier} · rank {winner.rank}
            </p>
          </div>
        </div>
        <Medal size={18} weight="fill" style={{ color }} />
      </div>
      <div className="relative mt-5 grid grid-cols-2 gap-3 border-t border-border/70 pt-4">
        <div>
          <p className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground">
            TOTAL WON
          </p>
          <p className="mt-1 font-display text-2xl text-nvg">{fmt(winner.total_won)}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground">
            BEST WIN
          </p>
          <p className="mt-1 font-display text-2xl text-gold">{fmt(winner.biggest_win)}</p>
        </div>
      </div>
    </article>
  );
}

export function WinnersSection({ compact = false }) {
  const [winners, setWinners] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    api
      .get("/leaderboard")
      .then(({ data }) => {
        if (mounted) setWinners(Array.isArray(data) ? data.slice(0, 3) : []);
      })
      .catch(() => {})
      .finally(() => mounted && setLoaded(true));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section
      data-testid="winners-section"
      aria-labelledby="winners-section-title"
      className={`${compact ? "mb-10" : "border-y border-gold/20"} relative overflow-hidden bg-[#050805]`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden="true">
        <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-40 w-40 rounded-full bg-nvg/10 blur-3xl" />
      </div>
      <div className={`relative mx-auto max-w-[1400px] px-4 sm:px-8 ${compact ? "py-8" : "py-12 sm:py-16"}`}>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.35em] text-nvg">
              <TrendUp size={14} weight="bold" /> VERIFIED PLAYER MOMENTUM
            </p>
            <h2 id="winners-section-title" className="mt-2 flex items-center gap-3 font-display text-4xl tracking-wide gold-gradient sm:text-5xl">
              <Trophy size={34} weight="fill" className="text-gold" /> WINNERS&apos; CIRCLE
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Real leaderboard totals from the current platform. No fabricated wins, no simulated payouts.
            </p>
          </div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
            TOP OPERATIVES · LIVE DATA
          </p>
        </div>
        {!loaded ? (
          <div className="grid gap-4 md:grid-cols-3" aria-label="Loading winners">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-40 animate-pulse border border-border bg-white/[0.03]" />
            ))}
          </div>
        ) : winners.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {winners.map((winner) => (
              <WinnerCard key={`${winner.rank}-${winner.name}`} winner={winner} />
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-gold/30 bg-black/30 p-8 text-center">
            <p className="font-display text-2xl tracking-wide text-foreground">THE CIRCLE IS OPEN</p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              Be the first verified operative to take a place on the board.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default WinnersSection;
