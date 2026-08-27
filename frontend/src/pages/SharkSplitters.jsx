import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { fmt } from "@/data/gameMeta";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sfx } from "@/lib/sounds";
import { WinCelebration } from "@/components/WinCelebration";
import { ArrowLeft, Waves } from "@phosphor-icons/react";

const CHIPS = [10, 50, 100, 500];
const MAX_BET = 1000;
const HEADS = "/brand/shark_coin_heads.png";
const TAILS = "/brand/shark_coin_tails.png";

const OUTCOME_META = {
  heads: { img: HEADS, label: "SHARK HEAD", mult: "2×", filter: "none" },
  tails: { img: TAILS, label: "SHARK TAIL", mult: "2×", filter: "none" },
  evens: {
    img: HEADS,
    label: "GOLDEN EVENS",
    mult: "3×",
    filter: "sepia(1) saturate(3) hue-rotate(-12deg) brightness(1.15)",
  },
  split: {
    img: TAILS,
    label: "SHARK SPLIT",
    mult: "0×",
    filter: "grayscale(0.6) brightness(0.6)",
  },
};

export default function SharkSplitters() {
  const navigate = useNavigate();
  const { user, refreshUser, openAuth } = useAuth();
  const [bet, setBet] = useState(50);
  const [busy, setBusy] = useState(false);
  const [flip, setFlip] = useState(false);
  const [result, setResult] = useState(null);
  const [celebrate, setCelebrate] = useState(false);

  const face = flip ? "heads" : result ? result.outcome : "heads";
  const meta = OUTCOME_META[face];

  const play = async () => {
    if (!user) {
      openAuth("register");
      return;
    }
    if (user.balance < bet) {
      toast.error("Insufficient credits");
      return;
    }
    setBusy(true);
    setResult(null);
    setFlip(true);
    sfx.prime();
    sfx.spin();
    try {
      const { data } = await api.post("/games/shark/flip", { bet });
      setTimeout(() => {
        setFlip(false);
        setResult(data);
        refreshUser();
        if (data.win > 0) {
          sfx.bigWin();
          setCelebrate(true);
          toast.success(`${OUTCOME_META[data.outcome].label} — WIN +${fmt(data.win)}`);
        } else {
          sfx.lose();
          toast("The shark split your coin. No payout.");
        }
        setBusy(false);
      }, 1500);
    } catch (e) {
      setFlip(false);
      setBusy(false);
      toast.error(e.response?.data?.detail || "Flip failed");
    }
  };

  return (
    <div
      data-testid="shark-splitters-root"
      className="relative min-h-screen"
      style={{
        backgroundImage:
          "linear-gradient(rgba(3,18,32,0.55), rgba(2,10,22,0.85)), url(/brand/footer_underwater.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <WinCelebration
        show={celebrate}
        intensity={result && result.multiplier >= 3 ? "big" : "small"}
        onDone={() => setCelebrate(false)}
        testId="shark-celebration"
      />
      <div className="max-w-xl mx-auto px-4 sm:px-8 py-8">
        <button
          data-testid="shark-back-btn"
          onClick={() => navigate("/lobby")}
          className="flex items-center gap-2 text-cyan-200/70 hover:text-cyan-100 font-mono text-sm mb-6"
        >
          <ArrowLeft size={16} /> RETURN TO LOBBY
        </button>

        <div className="text-center mb-6">
          <p className="font-mono text-xs tracking-[0.4em] text-cyan-300/70">
            // 2× HEAD · 3× EVENS · 2× TAIL
          </p>
          <h1 className="font-display text-5xl sm:text-6xl tracking-wide text-cyan-100 drop-shadow-[0_2px_18px_rgba(56,189,248,0.6)]">
            SHARK SPLITTERS
          </h1>
        </div>

        {/* multiplier strip */}
        <div className="grid grid-cols-3 gap-2 mb-6" data-testid="shark-multiplier-strip">
          {[
            { t: "2×", s: "HEAD" },
            { t: "3×", s: "EVENS" },
            { t: "2×", s: "TAIL" },
          ].map((m) => (
            <div
              key={m.s}
              className="border border-cyan-400/30 bg-black/40 backdrop-blur-sm py-3 text-center"
            >
              <div className="font-display text-3xl text-gold leading-none">{m.t}</div>
              <div className="font-mono text-[10px] tracking-widest text-cyan-200/70 mt-1">
                {m.s}
              </div>
            </div>
          ))}
        </div>

        {/* arena */}
        <div
          className="relative border border-cyan-400/30 bg-black/30 backdrop-blur-sm overflow-hidden"
          style={{ perspective: "1000px" }}
        >
          <div className="h-72 flex items-end justify-center relative">
            {/* water line */}
            <div className="absolute left-0 right-0 bottom-16 h-px bg-cyan-300/30" />
            <motion.div
              className="w-40 h-40 mb-24 flex items-center justify-center"
              animate={
                flip
                  ? { y: [60, -110, -110, 60], rotateY: [0, 1440, 2520, 2880], scale: [0.8, 1.15, 1.15, 1] }
                  : { y: 0, rotateY: 0, scale: 1 }
              }
              transition={
                flip
                  ? { duration: 1.5, ease: "easeInOut", times: [0, 0.25, 0.75, 1] }
                  : { duration: 0.3 }
              }
              style={{ transformStyle: "preserve-3d" }}
            >
              <img
                src={meta.img}
                alt={face}
                className={`w-full h-full object-contain drop-shadow-[0_0_28px_rgba(56,189,248,0.55)] ${result && !flip && result.win > 0 ? "animate-pop" : ""}`}
                style={{ filter: meta.filter }}
              />
            </motion.div>
          </div>

          {/* result overlay */}
          <AnimatePresence>
            {result && !flip && (
              <motion.div
                data-testid="shark-result"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/55"
              >
                {result.win > 0 ? (
                  <>
                    <div className="font-display text-5xl text-gold leading-none animate-pop drop-shadow-[0_0_20px_rgba(246,198,74,0.7)]">
                      {result.multiplier}×
                    </div>
                    <div className="font-display text-3xl tracking-widest text-cyan-100 mt-2">
                      WINNER!
                    </div>
                    <div className="font-mono text-xs tracking-widest text-cyan-200/70 mt-1">
                      {OUTCOME_META[result.outcome].label}
                    </div>
                    <div
                      data-testid="shark-win-amount"
                      className="font-display text-4xl gold-gradient mt-3"
                    >
                      +{fmt(result.win)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-display text-4xl tracking-widest text-alert animate-pop">
                      SHARK SPLIT!
                    </div>
                    <div
                      data-testid="shark-win-amount"
                      className="font-mono text-lg text-alert/80 mt-2"
                    >
                      -{fmt(bet)}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* chips */}
        <div className="flex flex-wrap gap-2 justify-center mt-6" data-testid="shark-chips">
          {CHIPS.map((c) => (
            <button
              key={c}
              data-testid={`shark-chip-${c}`}
              onClick={() => setBet(c)}
              className={`w-16 h-16 rounded-full border-2 font-display text-lg transition-all ${
                bet === c
                  ? "border-gold text-gold bg-gold/15 glow-gold scale-105"
                  : "border-cyan-400/40 text-cyan-100 hover:border-gold/60"
              }`}
            >
              ${c}
            </button>
          ))}
          <button
            data-testid="shark-max-bet"
            onClick={() => setBet(Math.min(MAX_BET, Math.floor(user?.balance || MAX_BET)))}
            className="px-4 h-16 rounded-full border-2 border-cyan-400/40 text-cyan-100 font-display text-sm hover:border-gold/60"
          >
            MAX
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between font-mono text-sm">
          <span className="text-cyan-200/70">
            BET <span className="text-gold text-lg">${fmt(bet)}</span>
          </span>
          <span className="text-cyan-200/70">
            Balance <span className="text-gold">{fmt(user?.balance || 0)}</span>
          </span>
        </div>

        <Button
          data-testid="shark-flip-btn"
          onClick={play}
          disabled={busy}
          className="w-full h-16 mt-4 bg-gold hover:bg-gold/90 text-black font-display text-2xl tracking-widest glow-gold gap-2"
        >
          <Waves size={24} weight="fill" /> {busy ? "FLIPPING..." : "START FLIP"}
        </Button>
      </div>
    </div>
  );
}
