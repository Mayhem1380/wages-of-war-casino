import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { fmt } from "@/data/gameMeta";
import { useAuth } from "@/context/AuthContext";
import { PROFILE } from "@/constants/testIds";
import {
  UserCircle,
  Coins,
  TrendUp,
  Trophy,
  GameController,
  Medal,
} from "@phosphor-icons/react";

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [txns, setTxns] = useState([]);

  useEffect(() => {
    api
      .get("/wallet/transactions")
      .then(({ data }) => setTxns(data.slice(0, 8)))
      .catch(() => {});
  }, []);

  if (!user) return null;

  const progress = user.next_tier_at
    ? Math.min(100, (user.total_wagered / user.next_tier_at) * 100)
    : 100;

  const stat = (Icon, label, value, color) => (
    <div className="hud p-5">
      <Icon size={26} weight="fill" style={{ color }} />
      <div className="font-display text-3xl tracking-wide text-foreground mt-3">
        {value}
      </div>
      <div className="font-mono text-[10px] tracking-widest text-muted-foreground mt-1">
        {label}
      </div>
    </div>
  );

  return (
    <div
      data-testid={PROFILE.root}
      className="max-w-[1100px] mx-auto px-4 sm:px-8 py-10"
    >
      <div className="hud hud-gold p-6 flex flex-wrap items-center gap-6 mb-8">
        {user.picture ? (
          <img
            src={user.picture}
            alt="me"
            className="w-20 h-20 rounded-full ring-2 ring-gold/50 object-cover"
          />
        ) : (
          <UserCircle size={80} weight="fill" className="text-nvg" />
        )}
        <div className="flex-1">
          <p className="font-mono text-xs tracking-widest text-nvg/70">
            OPERATIVE DOSSIER
          </p>
          <h1 className="font-display text-5xl tracking-wide text-foreground leading-none">
            {user.name}
          </h1>
          <p className="font-mono text-sm text-muted-foreground">
            {user.email}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 text-gold justify-end">
            <Medal size={22} weight="fill" />
            <span className="font-display text-3xl tracking-wide gold-gradient">
              {user.vip_tier}
            </span>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            Rank {user.vip_rank} • {user.vip_cashback}% cashback
          </p>
        </div>
      </div>

      {/* VIP progress */}
      <div className="hud p-5 mb-8">
        <div className="flex items-center justify-between font-mono text-xs mb-2">
          <span className="text-nvg">{user.vip_tier}</span>
          <span className="text-muted-foreground">
            {user.next_tier
              ? `Next: ${user.next_tier} @ ${fmt(user.next_tier_at)} wagered`
              : "MAX RANK ACHIEVED"}
          </span>
        </div>
        <div className="h-3 bg-black/50 border border-border overflow-hidden">
          <div
            className="h-full bg-gold glow-gold transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="font-mono text-[11px] text-muted-foreground mt-2">
          Lifetime wagered:{" "}
          <span className="text-foreground">{fmt(user.total_wagered)}</span>{" "}
          credits
        </p>
        <button
          onClick={() => navigate("/vip")}
          className="mt-2 font-stencil tracking-widest text-gold text-sm uppercase hover:text-gold/80"
        >
          View all ranks →
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stat(Coins, "BALANCE", fmt(user.balance), "#D4AF37")}
        {stat(TrendUp, "TOTAL WON", fmt(user.total_won), "#4EE44E")}
        {stat(Trophy, "BIGGEST WIN", fmt(user.biggest_win), "#F6E27A")}
        {stat(
          GameController,
          "GAMES PLAYED",
          fmt(user.games_played),
          "#7FE3FF",
        )}
      </div>

      <div className="mb-4">
        <p className="font-mono text-xs tracking-[0.4em] text-nvg/70">
          // RECENT ACTIVITY
        </p>
        <h2 className="font-display text-3xl tracking-wide text-foreground">
          LAST ENGAGEMENTS
        </h2>
      </div>
      <div className="hud divide-y divide-border">
        {txns.length === 0 && (
          <div className="p-6 font-mono text-sm text-muted-foreground">
            No engagements logged.
          </div>
        )}
        {txns.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between px-5 py-3"
          >
            <span className="font-stencil tracking-wide uppercase text-sm text-foreground">
              {t.type.replace("_", " ")}
            </span>
            <span
              className={`font-mono ${t.amount >= 0 ? "text-nvg" : "text-alert"}`}
            >
              {t.amount >= 0 ? "+" : ""}
              {fmt(t.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
