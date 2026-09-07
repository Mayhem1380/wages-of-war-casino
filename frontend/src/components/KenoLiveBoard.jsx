import React, { useEffect, useRef, useState } from "react";
import { Broadcast, Timer } from "@phosphor-icons/react";

const DRAW_SIZE = 20;
const POOL = 80;
const NEXT_DRAW_SECONDS = 120; // live draw every 2 minutes
const REVEAL_MS = 450;

function drawTwenty() {
  const pool = Array.from({ length: POOL }, (_, i) => i + 1);
  const out = [];
  for (let i = 0; i < DRAW_SIZE; i++) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

/**
 * Continuous live Keno draw board — an always-on digital lounge feed that
 * rolls 20 balls, then counts down to the next automatic draw every 2 minutes.
 * `picks` (optional) highlights any drawn balls the player has marked.
 */
export function KenoLiveBoard({ picks = [] }) {
  const [drawn, setDrawn] = useState([]);
  const [revealCount, setRevealCount] = useState(0);
  const [phase, setPhase] = useState("drawing"); // 'drawing' | 'waiting'
  const [countdown, setCountdown] = useState(NEXT_DRAW_SECONDS);
  const [drawId, setDrawId] = useState(1);
  const pickSet = useRef(new Set());
  pickSet.current = new Set(picks);

  // run a fresh draw whenever drawId changes
  useEffect(() => {
    let cancelled = false;
    const full = drawTwenty();
    setDrawn(full);
    setRevealCount(0);
    setPhase("drawing");
    setCountdown(NEXT_DRAW_SECONDS);
    let i = 0;
    const revealTimer = setInterval(() => {
      if (cancelled) return;
      i += 1;
      setRevealCount(i);
      if (i >= DRAW_SIZE) {
        clearInterval(revealTimer);
        setPhase("waiting");
      }
    }, REVEAL_MS);
    return () => {
      cancelled = true;
      clearInterval(revealTimer);
    };
  }, [drawId]);

  // countdown to the next draw
  useEffect(() => {
    if (phase !== "waiting") return;
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(t);
          setDrawId((d) => d + 1);
          return NEXT_DRAW_SECONDS;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  const mins = String(Math.floor(countdown / 60)).padStart(2, "0");
  const secs = String(countdown % 60).padStart(2, "0");
  const currentBall = revealCount > 0 ? drawn[revealCount - 1] : null;

  return (
    <div
      data-testid="keno-live-board"
      className="hud hud-gold relative overflow-hidden p-4 sm:p-5"
      style={{
        background:
          "linear-gradient(160deg, rgba(6,14,10,0.96), rgba(3,7,5,0.98))",
      }}
    >
      {/* header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-alert opacity-75 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-alert" />
          </span>
          <Broadcast size={18} weight="fill" className="text-nvg" />
          <span
            data-testid="keno-live-status"
            className="font-stencil tracking-[0.3em] text-nvg text-sm uppercase"
          >
            LIVE KENO DRAW · #{String(drawId).padStart(4, "0")}
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <Timer size={16} weight="fill" className="text-gold" />
          {phase === "drawing" ? (
            <span className="text-nvg animate-flicker tracking-widest">
              DRAWING… {revealCount}/{DRAW_SIZE}
            </span>
          ) : (
            <span data-testid="keno-live-countdown" className="text-gold tracking-widest">
              NEXT DRAW {mins}:{secs}
            </span>
          )}
        </div>
      </div>

      {/* rolling ball spotlight */}
      <div className="flex items-center gap-4 mb-4">
        <div
          className={`shrink-0 w-16 h-16 rounded-full flex items-center justify-center font-display text-3xl border-2 ${
            phase === "drawing"
              ? "border-nvg text-nvg glow-nvg animate-pop"
              : "border-gold/40 text-gold/60"
          }`}
          style={{
            background:
              "radial-gradient(circle at 35% 30%, rgba(78,228,78,0.25), rgba(0,0,0,0.6))",
            boxShadow:
              phase === "drawing"
                ? "0 0 26px rgba(78,228,78,0.6)"
                : "inset 0 0 18px rgba(0,0,0,0.7)",
          }}
        >
          {currentBall ?? "—"}
        </div>
        <div className="font-mono text-[11px] leading-relaxed text-muted-foreground">
          <div className="text-foreground tracking-widest">
            {phase === "drawing" ? "BALLS INBOUND" : "DRAW COMPLETE"}
          </div>
          20 numbers drawn from 1–80 · new draw every 2 minutes. Mark the same
          numbers to ride the live board.
        </div>
      </div>

      {phase === "waiting" && (
        <div className="relative mb-4 overflow-hidden border border-gold/25 bg-black/40">
          <img
            src="/brand/warkino_hero.jpg"
            alt="Warkino live draw waiting screen"
            className="h-24 w-full object-cover object-center opacity-80 sm:h-32"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/35">
            <span className="font-mono text-[10px] tracking-[0.28em] text-gold sm:text-xs">
              WARKINO BROADCAST · NEXT DRAW IN {mins}:{secs}
            </span>
          </div>
        </div>
      )}

      {/* drawn number board */}
      <div className="grid grid-cols-10 gap-1.5">
        {Array.from({ length: DRAW_SIZE }).map((_, idx) => {
          const shown = idx < revealCount;
          const n = drawn[idx];
          const isMatch = shown && pickSet.current.has(n);
          return (
            <div
              key={idx}
              data-testid={`keno-live-ball-${idx}`}
              className={`aspect-square rounded-full flex items-center justify-center font-mono text-xs sm:text-sm border transition-all duration-200 ${
                !shown
                  ? "border-border/40 bg-black/40 text-transparent"
                  : isMatch
                    ? "border-gold bg-gold/25 text-gold glow-gold animate-pop"
                    : "border-nvg/50 bg-nvg/10 text-nvg animate-pop"
              }`}
            >
              {shown ? n : "•"}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default KenoLiveBoard;
