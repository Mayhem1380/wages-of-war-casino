import React, { useEffect, useState } from "react";

// Rotating promo banner "digital screen" built from the campaign artwork set.
const BANNERS = [
  "/assets/promo/warkino-special-forces.png",
  "/assets/promo/signup-get-10.png",
  "/assets/promo/giveaway-35k.jpg",
  "/assets/promo/casino-lobby-full.png",
  "/assets/promo/features-banner.png",
  "/assets/promo/slot-cards-3.png",
  "/assets/promo/warkino-hud.png",
  "/assets/promo/crypto-currency-promo.png",
  "/assets/promo/140-slots-promo.png",
  "/assets/promo/second-chance-bonus.png",
];

export function PromoScreen() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % BANNERS.length), 4500);
    return () => clearInterval(t);
  }, []);
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
              loading={idx === 0 ? "eager" : "lazy"}
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: idx === i ? 1 : 0, transition: "opacity .8s ease" }}
            />
          ))}
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
