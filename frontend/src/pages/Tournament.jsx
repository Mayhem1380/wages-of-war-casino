import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { fmt } from "@/data/gameMeta";
import { TOURNEY } from "@/constants/testIds";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Trophy,
  Crown,
  Medal,
  Timer,
  GameController,
} from "@phosphor-icons/react";

function fmtCountdown(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const RANK_COLOR = ["#FFD84E", "#C7D0D8", "#CD7F32"];

export default function Tournament() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [countdown, setCountdown] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/tournament/current");
      setData(res.data);
      setCountdown(res.data.seconds_left || 0);
    } catch (e) {
      console.warn("tournament load failed", e);
    }
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, 12000);
    return () => clearInterval(poll);
  }, [load]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const board = data?.leaderboard || [];
  const me = data?.me;

  return (
    <div
      data-testid={TOURNEY.root}
      className="relative min-h-screen"
      style={{
        backgroundImage:
          "linear-gradient(rgba(4,8,6,0.78), rgba(3,5,4,0.92)), url(/brand/warmap_bg.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
        <button
          onClick={() => navigate("/lobby")}
          className="flex items-center gap-2 text-muted-foreground hover:text-nvg font-mono text-sm mb-6"
        >
          <ArrowLeft size={16} /> RETURN TO LOBBY
        </button>

        <div className="text-center mb-8">
          <p className="font-mono text-xs tracking-[0.4em] text-nvg/70">
            // LIVE TOURNAMENT
          </p>
          <h1 className="font-display text-5xl sm:text-6xl tracking-wide nvg-text flex items-center justify-center gap-3">
            <Trophy size={44} weight="fill" /> {data?.name || "OPERATION HIGH ROLLER"}
          </h1>
          <p className="text-muted-foreground mt-2">
            Every credit you win counts. Top 10 operatives split the pool at
            reset.
          </p>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="hud hud-gold p-5 text-center">
            <p className="font-mono text-[10px] tracking-widest text-gold/70">
              PRIZE POOL
            </p>
            <p
              data-testid={TOURNEY.pool}
              className="font-display text-3xl sm:text-4xl gold-gradient"
            >
              {fmt(data?.prize_pool || 0)}
            </p>
          </div>
          <div className="hud p-5 text-center">
            <p className="font-mono text-[10px] tracking-widest text-nvg/70 flex items-center justify-center gap-1">
              <Timer size={12} weight="fill" /> RESETS IN
            </p>
            <p
              data-testid={TOURNEY.timer}
              className="font-display text-3xl sm:text-4xl text-nvg"
            >
              {fmtCountdown(countdown)}
            </p>
          </div>
        </div>

        {/* My rank */}
        {user && (
          <div
            data-testid={TOURNEY.myRank}
            className="hud p-4 mb-6 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Medal size={26} weight="fill" className="text-gold" />
              <div>
                <p className="font-stencil tracking-widest uppercase text-sm">
                  Your Position
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {me && me.rank
                    ? `Rank #${me.rank} · ${fmt(me.score)} won`
                    : "Play any game to enter the board"}
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate("/lobby")}
              className="bg-nvg hover:bg-nvg/90 text-black font-display tracking-widest gap-2"
            >
              <GameController size={18} weight="fill" /> PLAY NOW
            </Button>
          </div>
        )}

        {/* Leaderboard */}
        <div className="hud overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <span className="font-stencil tracking-widest uppercase text-sm text-foreground">
              Top Operatives
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              LIVE
            </span>
          </div>
          {board.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground font-mono text-sm">
              No wins logged yet — be the first to storm the board.
            </div>
          ) : (
            board.map((row) => (
              <div
                key={row.rank}
                data-testid={TOURNEY.row(row.rank)}
                className="px-5 py-3 flex items-center gap-4 border-b border-border/50 last:border-0 hover:bg-white/[0.02]"
              >
                <span
                  className="w-8 text-center font-display text-lg"
                  style={{ color: RANK_COLOR[row.rank - 1] || "#8a9" }}
                >
                  {row.rank <= 3 ? (
                    <Crown
                      size={20}
                      weight="fill"
                      style={{ color: RANK_COLOR[row.rank - 1] }}
                    />
                  ) : (
                    row.rank
                  )}
                </span>
                <span className="flex-1 font-mono text-sm text-foreground truncate">
                  {row.name}
                </span>
                <span className="font-mono text-sm text-nvg">
                  {fmt(row.score)}
                </span>
                <span className="w-28 text-right font-mono text-xs text-gold">
                  {row.prize > 0 ? `+${fmt(row.prize)}` : "—"}
                </span>
              </div>
            ))
          )}
        </div>
        <p className="font-mono text-[11px] text-muted-foreground text-center mt-4">
          Prizes are play-money credits, auto-paid to the top 10 when the timer
          resets.
        </p>
      </div>
    </div>
  );
}
