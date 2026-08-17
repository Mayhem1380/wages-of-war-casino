import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { fmt, BRAND } from "@/data/gameMeta";
import { useAuth } from "@/context/AuthContext";
import { VIPT } from "@/constants/testIds";
import { Medal, Gift, Percent, CheckCircle } from "@phosphor-icons/react";

export default function Vip() {
  const { user } = useAuth();
  const [tiers, setTiers] = useState([]);

  useEffect(() => {
    api
      .get("/vip/tiers")
      .then(({ data }) => setTiers(data))
      .catch(() => {});
  }, []);

  const currentRank = user?.vip_rank ?? -1;

  return (
    <div
      data-testid={VIPT.root}
      className="max-w-[1100px] mx-auto px-4 sm:px-8 py-12"
    >
      <div
        className="relative overflow-hidden hud hud-gold p-10 mb-10 text-center"
        style={{
          backgroundImage: `linear-gradient(rgba(5,6,5,0.82), rgba(5,6,5,0.92)), url(${BRAND.coin})`,
          backgroundSize: "220px",
          backgroundPosition: "right center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <p className="font-mono text-xs tracking-[0.4em] text-nvg/70">
          // CHAIN OF COMMAND
        </p>
        <h1 className="font-display text-6xl tracking-wide gold-gradient">
          VIP RANKS
        </h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          Wager to earn ops points and climb from Recruit to General. Higher
          ranks unlock bigger daily supply drops and cashback.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {tiers.map((t) => {
          const isCurrent = t.rank === currentRank;
          const unlocked = currentRank >= t.rank;
          return (
            <div
              key={t.rank}
              data-testid={VIPT.tier(t.rank)}
              className={`hud p-6 relative ${isCurrent ? "border-gold glow-gold" : ""}`}
            >
              {isCurrent && (
                <span className="absolute top-3 right-3 font-mono text-[10px] text-black bg-gold px-2 py-0.5">
                  YOUR RANK
                </span>
              )}
              <div className="flex items-center gap-3">
                <Medal
                  size={34}
                  weight="fill"
                  style={{ color: unlocked ? "#D4AF37" : "#4d574d" }}
                />
                <div>
                  <h3 className="font-display text-3xl tracking-wide text-foreground leading-none">
                    {t.name}
                  </h3>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    Unlocks at {fmt(t.min)} wagered
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="flex items-center gap-2 font-mono text-sm">
                  <Gift size={16} className="text-nvg" />{" "}
                  <span className="text-foreground">{fmt(t.bonus)}</span>{" "}
                  <span className="text-muted-foreground text-xs">daily</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-sm">
                  <Percent size={16} className="text-gold" />{" "}
                  <span className="text-foreground">{t.cashback}%</span>{" "}
                  <span className="text-muted-foreground text-xs">
                    cashback
                  </span>
                </div>
              </div>
              {unlocked && (
                <div className="flex items-center gap-1 mt-4 font-mono text-[11px] text-nvg">
                  <CheckCircle size={14} weight="fill" /> ACHIEVED
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
