import React from "react";
import { BRAND } from "@/data/gameMeta";

export function BrandLogo({ size = 40, showText = true, subtitle = true }) {
  return (
    <div className="flex items-center gap-3 select-none">
      <img
        src={BRAND.emblem}
        alt="Wages of War Casino"
        width={size}
        height={size}
        className="rounded-full object-cover ring-1 ring-gold/60"
        style={{ width: size, height: size, boxShadow: "0 0 14px rgba(212,175,55,0.35)" }}
      />
      {showText && (
        <div className="leading-none">
          <div className="font-display text-xl sm:text-2xl tracking-wide gold-gradient">
            WAGES OF WAR
          </div>
          {subtitle && (
            <div className="font-stencil text-[10px] sm:text-xs tracking-[0.4em] text-nvg/80 -mt-0.5">
              CASINO • NIGHT OPS
            </div>
          )}
        </div>
      )}
    </div>
  );
}
