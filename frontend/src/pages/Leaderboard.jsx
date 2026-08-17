import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { fmt } from "@/data/gameMeta";
import { LB } from "@/constants/testIds";
import { Trophy, Medal, Crown } from "@phosphor-icons/react";

export default function Leaderboard() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api
      .get("/leaderboard")
      .then(({ data }) => setRows(data))
      .catch(() => {});
  }, []);

  const medalColor = (r) =>
    r === 1 ? "#F6E27A" : r === 2 ? "#C0C0C0" : r === 3 ? "#CD7F32" : "#4EE44E";

  return (
    <div data-testid={LB.root} className="max-w-3xl mx-auto px-4 sm:px-8 py-12">
      <div className="text-center mb-10">
        <p className="font-mono text-xs tracking-[0.4em] text-nvg/70">
          // GLOBAL COMBAT RANKINGS
        </p>
        <h1 className="font-display text-5xl sm:text-6xl tracking-wide gold-gradient flex items-center justify-center gap-3">
          <Trophy size={44} weight="fill" className="text-gold" /> LEADERBOARD
        </h1>
        <p className="text-muted-foreground mt-2">
          Top operatives ranked by total credits won.
        </p>
      </div>

      <div className="hud divide-y divide-border">
        {rows.length === 0 && (
          <div className="p-8 text-center font-mono text-sm text-muted-foreground">
            No operatives ranked yet. Be the first.
          </div>
        )}
        {rows.map((r) => (
          <div
            key={r.rank}
            data-testid={LB.row(r.rank)}
            className="flex items-center gap-4 px-5 py-4"
          >
            <div className="w-10 flex justify-center">
              {r.rank <= 3 ? (
                <Crown
                  size={26}
                  weight="fill"
                  style={{ color: medalColor(r.rank) }}
                />
              ) : (
                <span className="font-display text-2xl text-muted-foreground">
                  {r.rank}
                </span>
              )}
            </div>
            <div className="flex-1">
              <div className="font-display text-2xl tracking-wide text-foreground leading-none">
                {r.name}
              </div>
              <div className="flex items-center gap-1 font-mono text-[11px] text-gold mt-0.5">
                <Medal size={12} weight="fill" /> {r.vip_tier}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-xl text-nvg">
                {fmt(r.total_won)}
              </div>
              <div className="font-mono text-[10px] text-muted-foreground">
                best: {fmt(r.biggest_win)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
