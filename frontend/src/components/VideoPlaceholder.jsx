import React from "react";
import { Play, VideoCamera } from "@phosphor-icons/react";

export function VideoPlaceholder({ label = "PROMOTIONAL VIDEO — Coming Soon", testId }) {
  return (
    <div
      data-testid={testId}
      className="hud relative w-full aspect-video overflow-hidden flex items-center justify-center group cursor-pointer"
      style={{ background: "radial-gradient(120% 120% at 50% 30%, #0a1f0a 0%, #050605 70%)" }}
    >
      <div className="absolute inset-0 tactical-bg opacity-60" />
      <div className="absolute top-3 left-3 flex items-center gap-2 font-mono text-[10px] tracking-widest text-nvg/70">
        <VideoCamera size={14} weight="fill" /> LIVE FEED · STANDBY
      </div>
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        <div className="w-20 h-20 rounded-full border-2 border-gold flex items-center justify-center glow-gold mb-4 transition-transform duration-300 group-hover:scale-110">
          <Play size={34} weight="fill" className="text-gold ml-1" />
        </div>
        <h3 className="font-display text-3xl sm:text-4xl tracking-wide gold-gradient leading-none">{label}</h3>
        <p className="font-mono text-[11px] tracking-widest text-muted-foreground mt-3 animate-flicker">// VIDEO CONTENT PENDING UPLOAD</p>
      </div>
      <span className="absolute bottom-3 right-3 border border-alert/50 text-alert font-mono text-[10px] px-2 py-0.5">REC ●</span>
    </div>
  );
}
