import React, { useEffect, useMemo, useRef } from "react";
import { Coin } from "@phosphor-icons/react";

const CONFETTI_COLORS = [
  "#F6E27A",
  "#D4AF37",
  "#4EE44E",
  "#57E6C6",
  "#7FE3FF",
  "#FF7A2E",
  "#FF5A5A",
];

/**
 * Reusable, credit-free AAA win celebration:
 * gold coin rain + confetti burst + a one-shot screen shake.
 * intensity: "small" | "big"  — big = more coins/confetti + longer.
 */
export function WinCelebration({ show, intensity = "big", onDone, testId }) {
  const shakeTargetRef = useRef(null);

  const coinCount = intensity === "big" ? 46 : 22;
  const confettiCount = intensity === "big" ? 60 : 28;
  const duration = intensity === "big" ? 3200 : 2000;

  const coins = useMemo(
    () =>
      Array.from({ length: coinCount }).map(() => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.9,
        dur: 1.6 + Math.random() * 1.6,
        size: 20 + Math.random() * 26,
        drift: (Math.random() - 0.5) * 60,
      })),
    [coinCount],
  );

  const confetti = useMemo(
    () =>
      Array.from({ length: confettiCount }).map(() => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.1,
        dur: 1.8 + Math.random() * 1.8,
        w: 6 + Math.random() * 8,
        h: 10 + Math.random() * 14,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      })),
    [confettiCount],
  );

  useEffect(() => {
    if (!show) return;
    const root = document.getElementById("root") || document.body;
    root.classList.add("animate-celebrate-shake");
    const shakeT = setTimeout(
      () => root.classList.remove("animate-celebrate-shake"),
      750,
    );
    const doneT = setTimeout(() => onDone && onDone(), duration);
    return () => {
      clearTimeout(shakeT);
      clearTimeout(doneT);
      root.classList.remove("animate-celebrate-shake");
    };
  }, [show, duration, onDone]);

  if (!show) return null;

  return (
    <div
      data-testid={testId || "win-celebration"}
      className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {coins.map((c, i) => (
        <div
          key={`coin-${i}`}
          className="coin-fall absolute top-0"
          style={{
            left: `${c.left}%`,
            marginLeft: `${c.drift}px`,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.dur}s`,
          }}
        >
          <Coin
            size={c.size}
            weight="fill"
            className="text-gold"
            style={{ filter: "drop-shadow(0 0 6px rgba(246,198,74,0.75))" }}
          />
        </div>
      ))}
      {confetti.map((c, i) => (
        <div
          key={`conf-${i}`}
          className="confetti-fall absolute top-0 rounded-[1px]"
          style={{
            left: `${c.left}%`,
            width: `${c.w}px`,
            height: `${c.h}px`,
            background: c.color,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.dur}s`,
            boxShadow: `0 0 6px ${c.color}88`,
          }}
        />
      ))}
    </div>
  );
}

export default WinCelebration;
