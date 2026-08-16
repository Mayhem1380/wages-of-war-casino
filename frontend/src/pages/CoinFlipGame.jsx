import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { fmt } from "@/data/gameMeta";
import { COINFLIP } from "@/constants/testIds";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sfx } from "@/lib/sounds";
import { Coins, ArrowLeft, Lightning } from "@phosphor-icons/react";

export default function CoinFlipGame() {
  const navigate = useNavigate();
  const { user, refreshUser, openAuth } = useAuth();
  const [side, setSide] = useState("heads");
  const [bet, setBet] = useState(100);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [flip, setFlip] = useState(false);
  const LBL = { heads: "GRENADE", tails: "KNIFE" };

  const play = async () => {
    if (!user) { openAuth("register"); return; }
    if (user.balance < bet) { toast.error("Insufficient credits"); return; }
    setBusy(true);
    setResult(null);
    setFlip(true);
    sfx.prime();
    sfx.spin();
    try {
      const { data } = await api.post("/games/coinflip", { side, bet });
      setTimeout(() => {
        setFlip(false);
        setResult(data);
        refreshUser();
        if (data.win > 0) { sfx.win(); toast.success(`${LBL[data.outcome]} — WIN +${fmt(data.win)}`); }
        else { sfx.lose(); toast(`${LBL[data.outcome]} — no dice.`); }
        setBusy(false);
      }, 900);
    } catch (e) {
      setFlip(false);
      setBusy(false);
      toast.error(e.response?.data?.detail || "Flip failed");
    }
  };

  const sideBtn = (s, testId) => (
    <button
      data-testid={testId}
      onClick={() => setSide(s)}
      className={`flex-1 py-3 font-display text-2xl tracking-widest border transition-all ${
        side === s ? "border-gold text-gold bg-gold/10 glow-gold" : "border-border text-muted-foreground hover:border-gold/50"
      }`}
    >
      {LBL[s]}
    </button>
  );

  const face = flip ? side : (result ? result.outcome : side);
  const faceImg = face === "heads" ? "/slots/coin_heads.png" : "/slots/coin_tails.png";

  return (
    <div data-testid={COINFLIP.root} className="relative min-h-screen"
      style={{ backgroundImage: "linear-gradient(rgba(8,10,10,0.55), rgba(4,6,6,0.8)), url(/slots/coinflip_bg.jpg)", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}>
    <div className="max-w-lg mx-auto px-4 sm:px-8 py-8">
      <button onClick={() => navigate("/lobby")} className="flex items-center gap-2 text-muted-foreground hover:text-nvg font-mono text-sm mb-6">
        <ArrowLeft size={16} /> RETURN TO LOBBY
      </button>

      <div className="text-center mb-8">
        <p className="font-mono text-xs tracking-[0.4em] text-gold/70">// 1.96× INSTANT PAYOUT</p>
        <h1 className="font-display text-5xl tracking-wide gold-gradient">DOG-TAG FLIP</h1>
      </div>

      <div className="hud hud-gold p-8 flex flex-col items-center gap-6" style={{ perspective: "900px" }}>
        <motion.div
          className="w-44 h-44 flex items-center justify-center"
          animate={flip ? { rotateY: [0, 2160], scale: [1, 1.12, 1] } : { rotateY: 0, scale: 1 }}
          transition={flip ? { duration: 0.9, ease: "easeInOut" } : { duration: 0.3 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          <img
            src={faceImg}
            alt={face}
            className={`w-full h-full object-contain drop-shadow-[0_0_24px_rgba(246,198,74,0.5)] ${result && !flip && result.win > 0 ? "animate-pop" : ""}`}
          />
        </motion.div>
        <div data-testid={COINFLIP.result} className="h-10 text-center">
          {result && !flip && (
            <p className={`font-display text-3xl tracking-wide animate-pop ${result.win > 0 ? "gold-gradient" : "text-alert"}`}>
              {LBL[result.outcome]} · {result.win > 0 ? `+${fmt(result.win)}` : `-${fmt(bet)}`}
            </p>
          )}
        </div>

        <div className="flex gap-3 w-full">{sideBtn("heads", COINFLIP.heads)}{sideBtn("tails", COINFLIP.tails)}</div>

        <div className="w-full">
          <p className="font-mono text-[10px] tracking-widest text-nvg/70 mb-2">STAKE</p>
          <input
            data-testid={COINFLIP.bet}
            type="number"
            value={bet}
            onChange={(e) => setBet(Math.max(10, Number(e.target.value) || 10))}
            className="w-full bg-black/50 border border-border text-center font-mono text-lg text-gold py-2 outline-none focus:border-gold"
          />
        </div>

        <Button data-testid={COINFLIP.flip} onClick={play} disabled={busy} className="w-full h-14 bg-gold hover:bg-gold/90 text-black font-display text-xl tracking-widest glow-gold gap-2">
          <Lightning size={22} weight="fill" /> {busy ? "FLIPPING..." : "FLIP THE TAG"}
        </Button>
        <p className="font-mono text-xs text-muted-foreground">Balance: <span className="text-gold">{fmt(user?.balance || 0)}</span></p>
      </div>
    </div>
    </div>
  );
}
