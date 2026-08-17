import React, { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { sfx } from "@/lib/sounds";
import { MedalMilitary, X, Percent, Gift } from "@phosphor-icons/react";

export function RankUpBanner() {
  const { rankUp, clearRankUp } = useAuth();

  useEffect(() => {
    if (rankUp) {
      sfx.prime();
      sfx.promote();
      const t = setTimeout(clearRankUp, 5500);
      return () => clearTimeout(t);
    }
  }, [rankUp, clearRankUp]);

  if (!rankUp) return null;

  return (
    <div
      className="fixed top-20 left-1/2 -translate-x-1/2 z-[10000] w-[92%] max-w-2xl animate-rankup"
      data-testid="rankup-banner"
    >
      <div className="hud hud-gold glow-gold bg-[#0a0d0a] px-6 py-5 flex items-center gap-5 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30 bw-radar"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, rgba(212,175,55,0.35) 50deg, transparent 100deg)",
          }}
        />
        <MedalMilitary
          size={54}
          weight="fill"
          className="text-gold shrink-0 relative z-10 animate-flicker"
        />
        <div className="relative z-10 flex-1">
          <p className="font-mono text-[11px] tracking-[0.4em] text-nvg">
            // FIELD PROMOTION
          </p>
          <h3 className="font-display text-4xl tracking-wide gold-gradient leading-none">
            RANK UP — {rankUp.tier.toUpperCase()}
          </h3>
          <div className="flex items-center gap-4 mt-2 font-mono text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Gift size={13} className="text-nvg" /> Bigger daily supply drops
            </span>
            {rankUp.cashback > 0 && (
              <span className="flex items-center gap-1">
                <Percent size={13} className="text-gold" /> {rankUp.cashback}%
                weekly cashback
              </span>
            )}
          </div>
        </div>
        <button
          onClick={clearRankUp}
          className="relative z-10 text-muted-foreground hover:text-foreground"
          data-testid="rankup-close"
        >
          <X size={20} weight="bold" />
        </button>
      </div>
    </div>
  );
}
