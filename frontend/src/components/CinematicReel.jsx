import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  ArrowClockwise,
  RocketLaunch,
  SpeakerSimpleHigh,
  SpeakerSimpleSlash,
} from "@phosphor-icons/react";
import { useCinematicScore } from "@/lib/cinematicScore";

// Code-based cinematic hero reel (no video file). Each scene is a still image
// with a slow Ken-Burns move + fade, timed to build a ~28s marketing sequence.
const SCENES = [
  {
    img: "/brand/coin-nightops.png",
    kicker: "// NIGHT OPS EDITION",
    title: "WAGES OF WAR",
    sub: "A cinematic casino operation beneath the surface",
    anim: "kb-zoom-in",
    gold: true,
  },
  {
    img: "/brand/cine_carrier.jpg",
    kicker: "// NIGHT OPS COMMAND",
    title: "WAGES OF WAR",
    sub: "The world's most elite military casino",
    anim: "kb-zoom-in",
  },
  {
    img: "/brand/cine_blackhawk.jpg",
    kicker: "// SPECIAL FORCES DEPLOYED",
    title: "ELITE NIGHT OPS",
    sub: "Enlist. Deploy. Dominate.",
    anim: "kb-pan-left",
  },
  {
    img: "/brand/cine_apache.jpg",
    kicker: "// FULL ARSENAL",
    title: "146 AAA SLOTS",
    sub: "146 AAA MACHINES · WARKINO · CARNIVAL 3D",
    anim: "kb-zoom-out",
  },
  {
    img: "/brand/cine_carrier.jpg",
    kicker: "// ENLISTMENT BONUS",
    title: "$10 FREE",
    sub: "The moment you enlist — no deposit needed",
    anim: "kb-pan-right",
    gold: true,
  },
  {
    img: "/brand/cine_apache.jpg",
    kicker: "// FUND YOUR ACCOUNT",
    title: "DEPOSIT IN CRYPTO",
    sub: "BTC · ETH · USDT · SOL · XRP — plus card",
    anim: "kb-zoom-in",
  },
  {
    img: "/brand/cine_blackhawk.jpg",
    kicker: "// NEXUS STUDIO MASTER",
    title: "WE SELL GAMING FLEETS",
    sub: "Aiming to be the world's #1 platform · turnkey from $5,000",
    anim: "kb-pan-left",
  },
  {
    img: "/brand/cine_carrier.jpg",
    kicker: "// JOIN THE ELITE",
    title: "ENLIST NOW",
    sub: "Wages of War Casino · Night Ops Edition",
    anim: "kb-zoom-in",
    cta: true,
    gold: true,
  },
];

const DUR = 4000; // ms per scene

export function CinematicReel({ onEnlist }) {
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const timer = useRef(null);
  const score = useCinematicScore();

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReducedMotion(media.matches);
      if (media.matches) setPlaying(false);
    };
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (!playing || reducedMotion) return;
    timer.current = setTimeout(() => {
      setI((p) => (p + 1 < SCENES.length ? p + 1 : p));
      if (i + 1 >= SCENES.length) setPlaying(false);
    }, DUR);
    return () => clearTimeout(timer.current);
  }, [i, playing, reducedMotion]);

  const replay = () => {
    setI(0);
    setPlaying(true);
  };

  return (
    <section
      data-testid="cinematic-reel"
      className="relative w-full bg-black overflow-hidden border-b-2 border-gold/25"
      style={{ height: "min(72vh, 620px)" }}
    >
      <style>{`
        @keyframes kb-zoom-in { from{transform:scale(1.02)} to{transform:scale(1.16)} }
        @keyframes kb-zoom-out { from{transform:scale(1.16)} to{transform:scale(1.02)} }
        @keyframes kb-pan-left { from{transform:scale(1.14) translateX(3%)} to{transform:scale(1.14) translateX(-3%)} }
        @keyframes kb-pan-right { from{transform:scale(1.14) translateX(-3%)} to{transform:scale(1.14) translateX(3%)} }
        .reel-scene { animation: reelFade .9s ease both; }
        @keyframes reelFade { from{opacity:0} to{opacity:1} }
        .reel-copy > * { animation: reelUp .8s ease both; }
        @keyframes reelUp { from{opacity:0; transform:translateY(18px)} to{opacity:1; transform:translateY(0)} }
      `}</style>

      {SCENES.map((s, idx) => (
        <div
          key={idx}
          className="reel-scene absolute inset-0"
          style={{
            opacity: idx === i ? 1 : 0,
            transition: reducedMotion ? "none" : "opacity .8s ease",
            zIndex: idx === i ? 2 : 1,
          }}
        >
          <img
            src={s.img}
            alt=""
            loading={idx === 0 ? "eager" : "lazy"}
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              animation:
                !reducedMotion && idx === i
                  ? `${s.anim} ${DUR + 900}ms ease both`
                  : "none",
              filter: "brightness(0.62) saturate(1.05)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(4,6,5,0.92) 0%, rgba(4,6,5,0.55) 42%, rgba(4,6,5,0.15) 100%)",
            }}
          />
          {idx === i && (
            <div className="reel-copy relative z-10 h-full max-w-[1400px] mx-auto px-6 sm:px-12 flex flex-col justify-center">
              <p className="font-mono text-[10px] sm:text-xs tracking-[0.5em] text-nvg mb-3">
                {s.kicker}
              </p>
              <h2
                className={`font-display text-5xl sm:text-7xl lg:text-8xl tracking-wide leading-none ${
                  s.gold ? "gold-gradient" : "text-white"
                }`}
                style={{ textShadow: "0 4px 24px rgba(0,0,0,0.8)" }}
              >
                {s.title}
              </h2>
              <p className="text-foreground/85 text-base sm:text-xl mt-4 max-w-xl">
                {s.sub}
              </p>
              {s.cta && (
                <button
                  data-testid="reel-enlist-btn"
                  onClick={() => (onEnlist ? onEnlist() : navigate("/lobby"))}
                  className="mt-7 w-fit inline-flex items-center gap-2 bg-gold hover:bg-gold/90 text-black font-display text-lg tracking-widest px-8 py-3.5 glow-gold"
                >
                  <RocketLaunch size={20} weight="fill" /> ENLIST NOW
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {/* progress ticks */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
        {SCENES.map((_, idx) => (
          <button
            key={idx}
            aria-label={`Scene ${idx + 1}`}
            onClick={() => {
              setI(idx);
              setPlaying(true);
            }}
            className="h-1 rounded-full transition-all"
            style={{
              width: idx === i ? 28 : 12,
              background: idx === i ? "#D4AF37" : "rgba(255,255,255,0.35)",
            }}
          />
        ))}
      </div>

      {/* sound + replay / play controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          data-testid="reel-sound"
          onClick={score.toggle}
          className="flex items-center gap-2 px-3 py-1.5 bg-black/60 border border-gold/30 text-gold font-mono text-[10px] tracking-widest hover:bg-black/80"
        >
          {score.on ? (
            <SpeakerSimpleHigh size={12} weight="fill" />
          ) : (
            <SpeakerSimpleSlash size={12} weight="fill" />
          )}
          {score.on ? "SCORE ON" : "SOUND"}
        </button>
        <button
          data-testid="reel-replay"
          onClick={replay}
          className="flex items-center gap-2 px-3 py-1.5 bg-black/60 border border-gold/30 text-gold font-mono text-[10px] tracking-widest hover:bg-black/80"
        >
          {playing ? <Play size={12} weight="fill" /> : <ArrowClockwise size={12} weight="bold" />}
          {playing ? "PLAYING" : "REPLAY"}
        </button>
      </div>
    </section>
  );
}
