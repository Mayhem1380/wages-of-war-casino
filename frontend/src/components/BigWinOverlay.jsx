import React, { useEffect } from "react";
import { fmt } from "@/data/gameMeta";
import { BIGWIN } from "@/constants/testIds";
import { Sparkle, Star } from "@phosphor-icons/react";

export function BigWinOverlay({ win, multiplier, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      data-testid={BIGWIN.overlay}
      onClick={onDone}
      className="fixed inset-0 z-[10000] flex items-center justify-center cursor-pointer"
      style={{
        background:
          "radial-gradient(circle at center, rgba(20,15,0,0.86), rgba(3,4,3,0.95))",
      }}
    >
      {/* radar sweep */}
      <div
        className="absolute w-[120vmin] h-[120vmin] rounded-full opacity-40 bw-radar"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(78,228,78,0.0) 0deg, rgba(78,228,78,0.35) 40deg, rgba(78,228,78,0.0) 90deg)",
        }}
      />
      <div className="absolute w-[70vmin] h-[70vmin] rounded-full border border-nvg/30" />
      <div className="absolute w-[45vmin] h-[45vmin] rounded-full border border-nvg/20" />

      {/* gold bursts */}
      {[0, 0.25, 0.5].map((d, i) => (
        <div
          key={d}
          className="absolute w-[50vmin] h-[50vmin] rounded-full bw-ring"
          style={{
            background:
              "radial-gradient(circle, rgba(246,226,122,0.55) 0%, rgba(212,175,55,0.15) 40%, transparent 70%)",
            animationDelay: `${d}s`,
          }}
        />
      ))}

      {/* sparks */}
      {Array.from({ length: 14 }).map((_, i) => {
        const ang = (i / 14) * Math.PI * 2;
        return (
          <Star
            key={i}
            size={22}
            weight="fill"
            className="absolute text-gold bw-ring"
            style={{
              transform: `translate(${Math.cos(ang) * 180}px, ${Math.sin(ang) * 180}px)`,
              animationDelay: `${(i % 5) * 0.08}s`,
            }}
          />
        );
      })}

      <div className="relative text-center bw-amount px-6">
        <div className="flex items-center justify-center gap-2 text-nvg font-mono tracking-[0.5em] text-sm mb-1">
          <Sparkle size={16} weight="fill" /> DIRECT HIT{" "}
          <Sparkle size={16} weight="fill" />
        </div>
        <h2 className="font-display text-6xl sm:text-8xl tracking-wider gold-gradient leading-none">
          BIG WIN
        </h2>
        <div
          data-testid={BIGWIN.amount}
          className="font-mono text-4xl sm:text-6xl text-gold mt-3"
          style={{ textShadow: "0 0 24px rgba(212,175,55,0.7)" }}
        >
          +{fmt(win)}
        </div>
        {multiplier > 1 && (
          <div className="font-display text-3xl gold-gradient mt-2">
            ×{multiplier} MULTIPLIER
          </div>
        )}
        <p className="font-mono text-[11px] text-muted-foreground mt-4 tracking-widest">
          tap to continue
        </p>
      </div>
    </div>
  );
}
