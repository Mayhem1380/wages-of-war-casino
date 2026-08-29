import React, { useState } from "react";
import api from "@/lib/api";
import { fmt } from "@/data/gameMeta";
import { toast } from "sonner";
import { sfx } from "@/lib/sounds";
import { Heart, Diamond, Club, Spade } from "@phosphor-icons/react";

// Classic pokie GAMBLE: risk a win on Red/Black (2x) or a suit (4x).
export function GamblePanel({ amount, onDone }) {
  const [stake, setStake] = useState(amount);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null); // 'win' | 'lose'

  const gamble = async (mode, choice) => {
    if (busy) return;
    setBusy(true);
    setFlash(null);
    sfx.click?.();
    try {
      const { data } = await api.post("/games/gamble", {
        amount: stake,
        mode,
        choice,
      });
      if (data.outcome === "win") {
        setFlash("win");
        sfx.win?.();
        toast.success(`GAMBLE WON — +${fmt(data.payout)}!`);
        setStake(data.payout); // let them re-gamble the winnings
      } else {
        setFlash("lose");
        sfx.lose?.();
        toast(`Gamble lost — ${fmt(stake)} gone.`);
        setTimeout(() => onDone?.(0), 900);
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gamble failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="gamble-panel"
      className={`hud hud-gold p-4 mt-4 transition-colors ${
        flash === "win" ? "bg-nvg/10" : flash === "lose" ? "bg-danger/10" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="font-display text-lg tracking-widest gold-gradient">
          GAMBLE
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          RISKING <span className="text-gold">{fmt(stake)}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          data-testid="gamble-red"
          disabled={busy}
          onClick={() => gamble("color", "red")}
          className="h-12 font-display tracking-widest text-white bg-danger/80 hover:bg-danger disabled:opacity-50"
        >
          RED · 2×
        </button>
        <button
          data-testid="gamble-black"
          disabled={busy}
          onClick={() => gamble("color", "black")}
          className="h-12 font-display tracking-widest text-white bg-black border border-white/30 hover:bg-neutral-900 disabled:opacity-50"
        >
          BLACK · 2×
        </button>
      </div>

      <p className="font-mono text-[10px] text-muted-foreground tracking-widest mb-1.5 text-center">
        OR PICK A SUIT · 4×
      </p>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          { k: "hearts", Icon: Heart, c: "#e5484d" },
          { k: "diamonds", Icon: Diamond, c: "#e5484d" },
          { k: "clubs", Icon: Club, c: "#e6e6e6" },
          { k: "spades", Icon: Spade, c: "#e6e6e6" },
        ].map(({ k, Icon, c }) => (
          <button
            key={k}
            data-testid={`gamble-${k}`}
            disabled={busy}
            onClick={() => gamble("suit", k)}
            className="h-12 border border-border hover:border-gold flex items-center justify-center disabled:opacity-50"
          >
            <Icon size={24} weight="fill" color={c} />
          </button>
        ))}
      </div>

      <button
        data-testid="gamble-collect"
        disabled={busy}
        onClick={() => onDone?.(stake)}
        className="w-full h-11 bg-gold hover:bg-gold/90 text-black font-display tracking-widest disabled:opacity-50"
      >
        COLLECT {fmt(stake)}
      </button>
    </div>
  );
}
