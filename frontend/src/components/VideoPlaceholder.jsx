import React, { useState } from "react";
import { Play, VideoCamera } from "@phosphor-icons/react";

export function VideoPlaceholder({
  label = "MISSION BRIEFING",
  src = "/brand/official_trailer.mp4",
  poster,
  testId,
}) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div
      data-testid={testId}
      className="hud relative w-full aspect-video overflow-hidden flex items-center justify-center group bg-black"
      style={{
        background:
          "radial-gradient(120% 120% at 50% 30%, #0a1f0a 0%, #050605 70%)",
      }}
    >
      {!failed && (
        <video
          src={src}
          poster={poster}
          controls
          muted
          playsInline
          preload="metadata"
          onLoadedData={() => setReady(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
        />
      )}
      <div className={`absolute inset-0 tactical-bg opacity-60 ${ready ? "pointer-events-none" : ""}`} />
      <div className="absolute top-3 left-3 flex items-center gap-2 font-mono text-[10px] tracking-widest text-nvg/70">
        <VideoCamera size={14} weight="fill" /> {failed ? "LIVE FEED · OFFLINE" : "LIVE FEED · BRIEFING"}
      </div>
      {!ready && (
        <div className="relative z-10 flex flex-col items-center text-center px-6">
          <div className="w-20 h-20 rounded-full border-2 border-gold flex items-center justify-center glow-gold mb-4 transition-transform duration-300 group-hover:scale-110">
            <Play size={34} weight="fill" className="text-gold ml-1" />
          </div>
          <h3 className="font-display text-3xl sm:text-4xl tracking-wide gold-gradient leading-none">
            {failed ? "SIGNAL LOST" : label}
          </h3>
          <p className="font-mono text-[11px] tracking-widest text-muted-foreground mt-3 animate-flicker">
            {failed ? "// BROADCAST UNAVAILABLE" : "// LOADING SECURE BROADCAST"}
          </p>
        </div>
      )}
      <span className={`absolute bottom-3 right-3 border font-mono text-[10px] px-2 py-0.5 ${failed ? "border-alert/50 text-alert" : "border-nvg/50 text-nvg"}`}>
        {failed ? "OFFLINE" : "REC ●"}
      </span>
    </div>
  );
}
