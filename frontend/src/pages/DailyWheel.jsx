import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { fmt } from "@/data/gameMeta";
import { WHEEL } from "@/constants/testIds";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sfx } from "@/lib/sounds";
import { WinCelebration } from "@/components/WinCelebration";
import { ArrowLeft, Sparkle, Lightning, Trophy } from "@phosphor-icons/react";

// Colour a wedge by its segment type.
const colorFor = (seg, i) => {
  if (seg.type === "luck") return "#2b2f2b";
  if (seg.type === "again") return "#1f7a3a";
  return i % 2 === 0 ? "#D4AF37" : "#0d1b12";
};
const shortLabel = (seg) => {
  if (seg.type === "luck") return "BL";
  if (seg.type === "again") return "AGAIN";
  return seg.label;
};

const DEFAULT_META = [
  { label: "$5", value: 5, type: "cash" },
  { label: "$10", value: 10, type: "cash" },
  { label: "$15", value: 15, type: "cash" },
  { label: "$20", value: 20, type: "cash" },
  { label: "$25", value: 25, type: "cash" },
  { label: "$30", value: 30, type: "cash" },
  { label: "$35", value: 35, type: "cash" },
  { label: "$40", value: 40, type: "cash" },
  { label: "$45", value: 45, type: "cash" },
  { label: "$50", value: 50, type: "cash" },
  { label: "BETTER LUCK", value: 0, type: "luck" },
  { label: "BETTER LUCK", value: 0, type: "luck" },
  { label: "SPIN AGAIN", value: 0, type: "again" },
];

export default function DailyWheel() {
  const navigate = useNavigate();
  const { user, refreshUser, openAuth } = useAuth();
  const [status, setStatus] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [win, setWin] = useState(null);
  const [celebrate, setCelebrate] = useState(false);
  const segAngleRef = useRef(0);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/wheel/status");
      setStatus(data);
    } catch (e) {
      console.warn("wheel status failed", e);
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const segMeta = status?.segment_meta || DEFAULT_META;
  const segCount = segMeta.length;
  const segAngle = 360 / segCount;
  segAngleRef.current = segAngle;
  const spins = status?.spins_available || 0;
  const canSpin = spins > 0;

  const doSpin = async () => {
    if (!user) return openAuth("register");
    if (spinning) return;
    if (!canSpin) {
      toast.error("No spins yet — deposit over $500 or reach $1000 total deposits");
      return;
    }
    setSpinning(true);
    setWin(null);
    sfx.spin?.();
    try {
      const { data } = await api.post("/wheel/spin");
      const idx = data.segment_index;
      const target =
        rotation -
        (rotation % 360) +
        360 * 6 +
        (360 - (idx * segAngle + segAngle / 2));
      setRotation(target);
      setTimeout(async () => {
        setSpinning(false);
        setWin(data);
        if (data.type === "cash") {
          setCelebrate(true);
          sfx.bigWin?.();
          toast.success(`You won ${fmt(data.amount)}! Added to your balance.`);
        } else if (data.type === "again") {
          sfx.spin?.();
          toast("SPIN AGAIN — you keep your spin!", { icon: "🔄" });
        } else {
          toast("Better luck next time, soldier.");
        }
        await refreshUser();
        await load();
      }, 4200);
    } catch (e) {
      setSpinning(false);
      toast.error(e.response?.data?.detail || "Spin failed");
      await load();
    }
  };

  return (
    <div
      data-testid={WHEEL.root}
      className="relative min-h-screen"
      style={{
        backgroundImage:
          "linear-gradient(rgba(6,8,6,0.78), rgba(3,5,4,0.92)), url(/brand/warmap_bg.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <WinCelebration
        show={celebrate}
        intensity="big"
        onDone={() => setCelebrate(false)}
        testId="wheel-celebration"
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
        <button
          onClick={() => navigate("/lobby")}
          className="flex items-center gap-2 text-muted-foreground hover:text-gold font-mono text-sm mb-6"
        >
          <ArrowLeft size={16} /> RETURN TO LOBBY
        </button>

        <div className="text-center mb-6">
          <p className="font-mono text-xs tracking-[0.4em] text-gold/70">
            // CASH REWARD
          </p>
          <h1 className="font-display text-5xl sm:text-6xl tracking-wide gold-gradient">
            WHEEL OF WEALTH
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            Win real cash back — <span className="text-gold">$5 up to $50</span>,
            no wagering, no terms.
          </p>
        </div>

        {/* Spins available + how to earn */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div
            data-testid="wheel-spins-available"
            className={`inline-flex items-center gap-2 px-6 py-2.5 hud font-display text-xl tracking-widest ${
              canSpin
                ? "hud-gold text-gold glow-gold animate-pulse"
                : "text-muted-foreground"
            }`}
          >
            <Trophy size={20} weight="fill" /> {spins} SPIN{spins === 1 ? "" : "S"}{" "}
            AVAILABLE
          </div>
          <p className="font-mono text-[11px] text-muted-foreground tracking-wide text-center">
            Earn a spin for every deposit over{" "}
            <span className="text-gold">${status?.big_deposit_usd ?? 500}</span>{" "}
            — plus a free spin every{" "}
            <span className="text-gold">${status?.milestone_usd ?? 1000}</span> in
            total deposits.
          </p>
        </div>

        {/* Wheel */}
        <div className="relative mx-auto w-[320px] h-[320px] sm:w-[380px] sm:h-[380px]">
          <div className="absolute left-1/2 -translate-x-1/2 -top-2 z-20">
            <div
              className="w-0 h-0"
              style={{
                borderLeft: "16px solid transparent",
                borderRight: "16px solid transparent",
                borderTop: "26px solid #FFD84E",
                filter: "drop-shadow(0 0 6px rgba(246,198,74,0.9))",
              }}
            />
          </div>
          <div
            className="absolute inset-0 rounded-full border-4 border-gold/70"
            style={{
              boxShadow:
                "0 0 40px rgba(212,175,55,0.4), inset 0 0 40px rgba(0,0,0,0.7)",
              background: `conic-gradient(${segMeta
                .map(
                  (seg, i) =>
                    `${colorFor(seg, i)} ${i * segAngle}deg ${(i + 1) * segAngle}deg`,
                )
                .join(", ")})`,
              transform: `rotate(${rotation}deg)`,
              transition: spinning
                ? "transform 4s cubic-bezier(0.15,0.85,0.2,1)"
                : "none",
            }}
          >
            {segMeta.map((seg, i) => (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 origin-left font-display text-xs sm:text-sm tracking-wide"
                style={{
                  transform: `rotate(${i * segAngle + segAngle / 2}deg) translateX(64px)`,
                  color:
                    seg.type === "luck"
                      ? "#9aa5a0"
                      : seg.type === "again"
                        ? "#eafff0"
                        : i % 2 === 0
                          ? "#150c02"
                          : "#FFD84E",
                }}
              >
                {shortLabel(seg)}
              </div>
            ))}
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-black border-2 border-gold flex items-center justify-center z-10 glow-gold">
            <Sparkle size={28} weight="fill" className="text-gold" />
          </div>
        </div>

        {/* Result / action */}
        <div className="text-center mt-8 space-y-4">
          <div data-testid={WHEEL.result} className="h-10">
            {win && !spinning && (
              <p className="font-display text-3xl tracking-wide animate-pop">
                {win.type === "cash" ? (
                  <span className="gold-gradient">+{fmt(win.amount)} CASH</span>
                ) : win.type === "again" ? (
                  <span className="text-nvg">SPIN AGAIN — FREE RE-SPIN</span>
                ) : (
                  <span className="text-muted-foreground">BETTER LUCK NEXT TIME</span>
                )}
              </p>
            )}
          </div>

          <Button
            data-testid={WHEEL.spin}
            onClick={doSpin}
            disabled={spinning || (!canSpin && !!user)}
            className="h-14 px-10 bg-gold hover:bg-gold/90 text-black font-display text-xl tracking-widest glow-gold gap-2 disabled:opacity-50"
          >
            <Lightning size={22} weight="fill" />
            {spinning
              ? "SPINNING…"
              : !user
                ? "ENLIST TO SPIN"
                : canSpin
                  ? "SPIN THE WHEEL"
                  : "NO SPINS YET"}
          </Button>

          {!canSpin && user && !spinning && (
            <Button
              variant="ghost"
              onClick={() => navigate("/cashier")}
              className="block mx-auto font-mono text-xs text-gold/80 hover:text-gold"
            >
              → Make a deposit to earn a spin
            </Button>
          )}

          <p className="font-mono text-xs text-muted-foreground">
            Balance: <span className="text-gold">{fmt(user?.balance || 0)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
