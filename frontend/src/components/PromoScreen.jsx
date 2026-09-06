import React, { useEffect, useState } from "react";

// Rotating promo banner "digital screen" built from user-uploaded artwork.
const BANNERS = [
  "/brand/promo_1.png",
  "/brand/promo_2.png",
  "/brand/promo_3.png",
  "/brand/promo_4.png",
  "/brand/promo_5.png",
];

export function PromoScreen() {
  const [i, setI] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (reducedMotion) return undefined;
    const t = setInterval(() => setI((p) => (p + 1) % BANNERS.length), 4500);
    return () => clearInterval(t);
  }, [reducedMotion]);
  return (
    <section
      data-testid="promo-screen"
      className="relative w-full bg-black border-b-2 border-gold/25"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono text-[10px] sm:text-xs tracking-[0.4em] text-gold animate-flicker">
            // FIELD BROADCAST
          </span>
          <div className="flex-1 h-px bg-gold/20" />
        </div>
        <div className="relative overflow-hidden rounded-md border-2 border-gold/30 aspect-[1200/630] glow-gold">
          {BANNERS.map((src, idx) => (
            <img
              key={src}
              src={src}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                opacity: idx === i ? 1 : 0,
                transition: reducedMotion ? "none" : "opacity .8s ease",
              }}
            />
          ))}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(180deg, rgba(3,7,5,0.05), rgba(3,7,5,0.12) 55%, rgba(3,7,5,0.72)), repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 4px)",
              mixBlendMode: "screen",
            }}
          />
        </div>
        <div className="flex justify-center gap-1.5 mt-3">
          {BANNERS.map((_, idx) => (
            <button
              key={idx}
              aria-label={`Banner ${idx + 1}`}
              onClick={() => setI(idx)}
              className="h-1 rounded-full transition-all"
              style={{
                width: idx === i ? 26 : 10,
                background: idx === i ? "#D4AF37" : "rgba(255,255,255,0.35)",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
