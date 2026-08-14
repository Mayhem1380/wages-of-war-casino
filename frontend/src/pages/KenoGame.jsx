import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { fmt } from "@/data/gameMeta";
import { AnimatedShowcase } from "@/components/AnimatedShowcase";
import { KENO } from "@/constants/testIds";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sfx } from "@/lib/sounds";
import { Target, ArrowLeft, Coins, Shuffle, Trash, Lightning } from "@phosphor-icons/react";

const NUMS = Array.from({ length: 80 }, (_, i) => i + 1);

export default function KenoGame() {
  const navigate = useNavigate();
  const { user, refreshUser, openAuth } = useAuth();
  const [picks, setPicks] = useState([]);
  const [stake, setStake] = useState(50);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const drawn = new Set(result?.drawn || []);
  const hits = new Set(result?.hits || []);

  const toggle = (n) => {
    if (busy) return;
    setResult(null);
    setPicks((p) => {
      if (p.includes(n)) return p.filter((x) => x !== n);
      if (p.length >= 10) { toast.error("Max 10 targets"); return p; }
      return [...p, n];
    });
  };

  const quick = () => {
    setResult(null);
    const pool = [...NUMS];
    const out = [];
    for (let i = 0; i < 8; i++) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    setPicks(out);
  };

  const play = async () => {
    if (!user) { openAuth("register"); return; }
    if (picks.length < 1) { toast.error("Mark at least 1 target"); return; }
    if (user.balance < stake) { toast.error("Insufficient credits"); return; }
    setBusy(true);
    setResult(null);
    sfx.prime();
    sfx.spin();
    try {
      const { data } = await api.post("/games/keno/play", { picks, stake });
      setResult(data);
      refreshUser();
      if (data.win > 0) { sfx.bigWin(); toast.success(`${data.hit_count} hits — WIN +${fmt(data.win)}`); }
      else { sfx.lose(); toast(`${data.hit_count} hits. No payout this drop.`); }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Play failed");
    }
    setBusy(false);
  };

  return (
    <div data-testid={KENO.root} className="relative min-h-screen"
      style={{ backgroundImage: "linear-gradient(rgba(6,10,8,0.86), rgba(4,7,5,0.94)), url(/slots/keno_bg.jpg)", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}>
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
      <button onClick={() => navigate("/lobby")} className="flex items-center gap-2 text-muted-foreground hover:text-nvg font-mono text-sm mb-6">
        <ArrowLeft size={16} /> RETURN TO LOBBY
      </button>

      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="font-mono text-xs tracking-[0.4em] text-nvg/70">// WARHEAD KENO • UP TO 5,000×</p>
          <h1 className="font-display text-5xl tracking-wide nvg-text flex items-center gap-3"><Target size={40} weight="fill" /> WARHEAD KENO</h1>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 hud hud-gold">
          <Coins size={18} weight="fill" className="text-gold" />
          <span data-testid={KENO.balance} className="font-mono text-lg text-gold">{fmt(user?.balance || 0)}</span>
        </div>
      </div>

      <div className="mb-6">
        <AnimatedShowcase variant="keno" testId="keno-video" />
      </div>

      <div className="grid lg:grid-cols-[1fr_260px] gap-6">
        <div className="hud p-4 sm:p-6">
          <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
            {NUMS.map((n) => {
              const picked = picks.includes(n);
              const isDrawn = drawn.has(n);
              const isHit = hits.has(n);
              let cls = "border-border bg-black/40 text-foreground/70 hover:border-nvg/60";
              if (picked && !result) cls = "border-nvg bg-nvg/20 text-nvg glow-nvg";
              if (isHit) cls = "border-gold bg-gold/25 text-gold glow-gold";
              else if (picked && result) cls = "border-nvg/60 bg-nvg/10 text-nvg";
              else if (isDrawn) cls = "border-alert/50 bg-alert/10 text-alert/80";
              return (
                <button
                  key={n}
                  data-testid={KENO.num(n)}
                  onClick={() => toggle(n)}
                  className={`relative aspect-square flex items-center justify-center font-mono text-sm border transition-all overflow-hidden ${cls} ${isHit ? "animate-pop" : ""}`}
                >
                  {picked && !result && <img src="/slots/keno_warhead.png" alt="" className="absolute inset-0 w-full h-full object-contain p-0.5 pointer-events-none opacity-90" />}
                  {isHit && <img src="/slots/keno_blast.png" alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none animate-pop" />}
                  <span className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{n}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="hud p-5">
            <div className="flex items-center justify-between font-mono text-sm mb-3">
              <span className="text-muted-foreground">TARGETS</span>
              <span className="text-nvg">{picks.length}/10</span>
            </div>
            <div className="flex gap-2">
              <button data-testid={KENO.quick} onClick={quick} className="flex-1 flex items-center justify-center gap-1 border border-border py-2 font-mono text-xs hover:border-nvg text-muted-foreground hover:text-nvg">
                <Shuffle size={14} /> QUICK
              </button>
              <button data-testid={KENO.clear} onClick={() => { setPicks([]); setResult(null); }} className="flex-1 flex items-center justify-center gap-1 border border-border py-2 font-mono text-xs hover:border-alert text-muted-foreground hover:text-alert">
                <Trash size={14} /> CLEAR
              </button>
            </div>
          </div>

          <div className="hud p-5">
            <p className="font-mono text-[10px] tracking-widest text-nvg/70 mb-2">STAKE</p>
            <input
              data-testid={KENO.stake}
              type="number"
              value={stake}
              onChange={(e) => setStake(Math.max(10, Number(e.target.value) || 10))}
              className="w-full bg-black/50 border border-border text-center font-mono text-lg text-gold py-2 outline-none focus:border-gold"
            />
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[50, 200, 1000].map((v) => (
                <button key={v} onClick={() => setStake(v)} className="font-mono text-xs border border-border py-1.5 hover:border-gold hover:text-gold text-muted-foreground">{fmt(v)}</button>
              ))}
            </div>
          </div>

          <Button data-testid={KENO.play} onClick={play} disabled={busy} className="w-full h-14 bg-nvg hover:bg-nvg/90 text-black font-display text-xl tracking-widest glow-nvg gap-2">
            <Lightning size={22} weight="fill" /> {busy ? "DROPPING..." : "LAUNCH DRAW"}
          </Button>

          {result && (
            <div className="hud hud-gold p-5 text-center animate-pop">
              <p className="font-mono text-xs text-muted-foreground">HITS {result.hit_count} · {result.multiplier}×</p>
              <p data-testid={KENO.win} className={`font-display text-4xl tracking-wide ${result.win > 0 ? "gold-gradient" : "text-muted-foreground"}`}>
                {result.win > 0 ? `+${fmt(result.win)}` : "0"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
