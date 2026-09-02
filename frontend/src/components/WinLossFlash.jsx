import React, { useEffect } from "react";
import { Trophy, X } from "@phosphor-icons/react";

/**
 * Full-screen flashing WINNER / LOSE state overlay.
 * Non-blocking (pointer-events-none) so rapid play is never interrupted.
 * type: "win" | "lose". Auto-dismisses via onDone.
 */
export function WinLossFlash({ show, type = "win", label, onDone, testId }) {
  useEffect(() => {
    if (!show) return;
    const dur = type === "win" ? 1500 : 850;
    const t = setTimeout(() => onDone && onDone(), dur);
    return () => clearTimeout(t);
  }, [show, type, onDone]);

  if (!show) return null;
  const isWin = type === "win";

  return (
    <div
      data-testid={testId || (isWin ? "win-flash" : "lose-flash")}
      className={`fixed inset-0 z-[9998] pointer-events-none flex items-center justify-center overflow-hidden ${
        isWin ? "wow-flash-win" : "wow-flash-lose"
      }`}
      aria-hidden="true"
    >
      <div className="relative text-center select-none">
        {isWin ? (
          <>
            <Trophy
              size={64}
              weight="fill"
              className="mx-auto text-gold mb-2 wow-flash-pop"
              style={{ filter: "drop-shadow(0 0 22px rgba(246,198,74,0.9))" }}
            />
            <h2
              className="font-display tracking-[0.15em] text-7xl sm:text-9xl leading-none wow-flash-pop"
              style={{
                background:
                  "linear-gradient(180deg,#FFF6C8 0%,#F6C64A 45%,#B9821A 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "0 0 40px rgba(246,198,74,0.5)",
                filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.6))",
              }}
            >
              WINNER
            </h2>
          </>
        ) : (
          <>
            <X
              size={56}
              weight="bold"
              className="mx-auto text-red-500 mb-1 wow-flash-pop"
              style={{ filter: "drop-shadow(0 0 18px rgba(239,68,68,0.9))" }}
            />
            <h2
              className="font-display tracking-[0.35em] text-6xl sm:text-8xl leading-none text-red-500/90 wow-flash-pop"
              style={{ textShadow: "0 0 30px rgba(239,68,68,0.7)" }}
            >
              LOSE
            </h2>
          </>
        )}
        {label && (
          <div
            className={`font-mono text-lg sm:text-2xl mt-3 ${
              isWin ? "text-gold" : "text-red-400/80"
            }`}
          >
            {label}
          </div>
        )}
      </div>
    </div>
  );
}

export default WinLossFlash;
