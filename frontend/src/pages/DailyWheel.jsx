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
import { ArrowLeft, Sparkle, Flame, Lightning } from "@phosphor-icons/react";

const SEG_COLORS = ["#D4AF37", "#0d1b12", "#F6C64A", "#12241a", "#E0B84A", "#0d1b12", "#F6C64A", "#12241a", "#FFD84E"];

function fmtCountdown(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function DailyWheel() {
  const navigate = useNavigate();
  const { user, refreshUser, openAuth } = useAuth();
  const [status, setStatus] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [win, setWin] = useState(null);
  const [celebrate, setCelebrate] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const segsRef = useRef([]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/wheel/status");
      setStatus(data);
      setCountdown(data.seconds_left || 0);
      segsRef.current = data.segments || [];
    } catch (e) {
      console.warn("wheel status failed", e);
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const segments = status?.segments || [500, 1000, 2000, 3000, 5000, 8000, 12000, 20000, 50000];
  const segCount = segments.length;
  const segAngle = 360 / segCount;
  const megaUnlocked = !!status?.mega_unlocked;
  const megaIdx = megaUnlocked ? segCount - 1 : -1;
  const segColor = (i) =>
    i === megaIdx ? "#ff2d2d" : SEG_COLORS[i % SEG_COLORS.length];

  const doSpin = async () => {
    if (!user) return openAuth("register");
    if (spinning) return;
    if (countdown > 0) {
      toast.error("Wheel not ready yet");
      return;
    }
    setSpinning(true);
    setWin(null);
    sfx.spin?.();
    try {
      const { data } = await api.post("/wheel/spin");
      const idx = data.segment_index;
      // land the winning segment centre under the top pointer
      const target =
        rotation -
        (rotation % 360) +
        360 * 6 +
        (360 - (idx * segAngle + segAngle / 2));
      setRotation(target);
      setTimeout(async () => {
        setSpinning(false);
        setWin(data);
        setCelebrate(true);
        sfx.bigWin?.();
        toast.success(
          `+${fmt(data.amount)} credits${data.multiplier > 1 ? ` (x${data.multiplier} streak!)` : ""}`,
        );
        await refreshUser();
        await load();
      }, 4200);
    } catch (e) {
      setSpinning(false);
      toast.error(e.response?.data?.detail || "Spin failed");
      await load();
    }
  };

  const streak = status?.streak || 0;
  const nextMult = status?.next_multiplier || 1;
  const ready = countdown <= 0;

  return (
    <div
      data-testid={WHEEL.root}
      className="relative min-h-screen"
      style={{
        backgroundImage:
          "linear-gradient(rgba(6,8,6,0.75), rgba(3,5,4,0.9)), url(/brand/warmap_bg.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <WinCelebration
        show={celebrate}
        intensity={win?.mega || win?.multiplier > 1 ? "big" : "small"}
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

        <div className="text-center mb-8">
          <p className="font-mono text-xs tracking-[0.4em] text-gold/70">
            // DAILY SUPPLY WHEEL
          </p>
          <h1 className="font-display text-5xl sm:text-6xl tracking-wide gold-gradient">
            STREAK WHEEL
          </h1>
          <p className="text-muted-foreground mt-2">
            One free spin every day. Keep your streak alive — every 7th day pays{" "}
            <span className="text-gold">DOUBLE</span>.
          </p>
        </div>

        {/* Streak bar */}
        <div className="flex items-center justify-center gap-2 mb-8" data-testid={WHEEL.streak}>
          {Array.from({ length: 7 }).map((_, i) => {
            const filled = i < streak % 7 || (streak > 0 && streak % 7 === 0);
            return (
              <div
                key={i}
                className={`w-9 h-9 flex items-center justify-center border font-mono text-xs ${
                  filled
                    ? "border-gold bg-gold/20 text-gold glow-gold"
                    : "border-border text-muted-foreground"
                }`}
              >
                {i === 6 ? <Flame size={16} weight="fill" /> : i + 1}
              </div>
            );
          })}
          <span className="ml-3 font-mono text-sm text-foreground/80">
            Day <span className="text-gold">{streak || 0}</span> streak
          </span>
        </div>

        {megaUnlocked && (
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-2 px-5 py-2 border border-alert bg-alert/15 text-alert font-display tracking-widest animate-pulse">
              <Flame size={18} weight="fill" /> MEGA JACKPOT LIVE —{" "}
              {fmt(status.mega_value)} ON THE WHEEL
            </span>
          </div>
        )}

        {/* Wheel */}
        <div className="relative mx-auto w-[320px] h-[320px] sm:w-[380px] sm:h-[380px]">
          {/* pointer */}
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
              background: `conic-gradient(${segments
                .map(
                  (_, i) =>
                    `${segColor(i)} ${i * segAngle}deg ${(i + 1) * segAngle}deg`,
                )
                .join(", ")})`,
              transform: `rotate(${rotation}deg)`,
              transition: spinning
                ? "transform 4s cubic-bezier(0.15,0.85,0.2,1)"
                : "none",
            }}
          >
            {segments.map((v, i) => (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 origin-left font-display text-sm sm:text-base tracking-wide"
                style={{
                  transform: `rotate(${i * segAngle + segAngle / 2}deg) translateX(70px)`,
                  color:
                    i === megaIdx
                      ? "#fff"
                      : i % 2 === 0
                        ? "#150c02"
                        : "#FFD84E",
                  fontWeight: i === megaIdx ? 800 : undefined,
                }}
              >
                {i === megaIdx ? "MEGA" : v >= 1000 ? `${v / 1000}K` : v}
              </div>
            ))}
          </div>
          {/* hub */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-black border-2 border-gold flex items-center justify-center z-10 glow-gold">
            <Sparkle size={28} weight="fill" className="text-gold" />
          </div>
        </div>

        {/* Result / action */}
        <div className="text-center mt-8 space-y-4">
          <div data-testid={WHEEL.result} className="h-10">
            {win && !spinning && (
              <p className="font-display text-3xl tracking-wide gold-gradient animate-pop">
                {win.mega && <span className="text-alert">MEGA JACKPOT · </span>}
                +{fmt(win.amount)}{" "}
                {win.multiplier > 1 && !win.mega && (
                  <span className="text-gold">· x{win.multiplier} STREAK</span>
                )}
              </p>
            )}
          </div>

          {ready ? (
            <Button
              data-testid={WHEEL.spin}
              onClick={doSpin}
              disabled={spinning}
              className="h-14 px-10 bg-gold hover:bg-gold/90 text-black font-display text-xl tracking-widest glow-gold gap-2"
            >
              <Lightning size={22} weight="fill" />
              {spinning ? "SPINNING…" : "SPIN THE WHEEL"}
            </Button>
          ) : (
            <div className="space-y-1">
              <p className="font-mono text-xs text-muted-foreground tracking-widest">
                NEXT FREE SPIN IN
              </p>
              <p
                data-testid={WHEEL.timer}
                className="font-display text-3xl tracking-widest text-nvg"
              >
                {fmtCountdown(countdown)}
              </p>
              <p className="font-mono text-[11px] text-gold/70">
                Come back tomorrow to keep your streak (x{nextMult} on day 7).
              </p>
            </div>
          )}

          <p className="font-mono text-xs text-muted-foreground">
            Balance: <span className="text-gold">{fmt(user?.balance || 0)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
