import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FLAGSHIP_ART, BRAND } from "@/data/gameMeta";
import { VideoCamera, Lightning } from "@phosphor-icons/react";

const COINS = "/slots/sym_firecoin.png";

const F = FLAGSHIP_ART;
const SLIDES = {
  keno: [
    { img: "/slots/keno_bg.jpg", kicker: "// WARHEAD KENO", title: "MARK YOUR TARGETS", sub: "PICK UP TO 10 · LAUNCH THE DRAW", accent: "#4EE44E" },
    { img: "/slots/thumb_inferno.jpg", kicker: "DIRECT HIT", title: "UP TO 5,000×", sub: "DETONATE THE GRID", accent: "#FF8A2E" },
    { img: "/brand/nexus_warthog.jpg", kicker: "CLOSE AIR SUPPORT", title: "PRECISION STRIKE", sub: "EVERY HIT COUNTS", accent: "#F6C64A" },
    { img: "/slots/keno_bg.jpg", kicker: "// TACTICAL PAYOUTS", title: "STACK THE HITS", sub: "MORE MARKS · BIGGER MULTIPLIERS", accent: "#57E6C6" },
  ],
  "game-preview": [
    { img: F.pharaohs_arsenal.thumb, kicker: "AAA FLAGSHIP", title: "PHARAOH'S ARSENAL", sub: "HOLD & WIN · ROYAL 10,000×", accent: "#F6C64A" },
    { img: F.inferno_airstrike.thumb, kicker: "AAA FLAGSHIP", title: "INFERNO AIRSTRIKE", sub: "FIRE-COIN JACKPOT BARRAGE", accent: "#FF8A2E" },
    { img: F.golden_dynasty.thumb, kicker: "AAA FLAGSHIP", title: "GOLDEN DYNASTY", sub: "IMPERIAL FORTUNE · 88,000×", accent: "#FFC04A" },
    { img: F.book_of_ops.thumb, kicker: "AAA FLAGSHIP", title: "BOOK OF OPS", sub: "EXPANDING RELIC · HOLD & WIN", accent: "#E0B24A" },
    { img: F.big_bass_bombardment.thumb, kicker: "AAA FLAGSHIP", title: "BIG BASS BOMBARDMENT", sub: "REEL IN THE HEAVY ORDNANCE", accent: "#5AA6FF" },
    { img: F.money_train_convoy.thumb, kicker: "AAA FLAGSHIP", title: "MONEY TRAIN CONVOY", sub: "ARMOURED PAYLOAD · POWER WHEEL", accent: "#F6C64A" },
  ],
  promo: [
    { img: BRAND.hero, kicker: "// BRIEFING REEL", title: "15 ELITE SLOTS", sub: "6 AAA FLAGSHIPS · HOLD & WIN", accent: "#F6C64A" },
    { img: "/brand/nexus_sniper.png", kicker: "NEXUS STUDIO MASTER", title: "SPECIAL FORCES SNIPER", sub: "ARID TERRAIN MISSION", accent: "#E0B24A" },
    { img: F.pharaohs_arsenal.thumb, kicker: "JACKPOT LADDER", title: "ROYAL 10,000×", sub: "GRAND · MAJOR · MIDI · MINOR · MINI", accent: "#FF5A5A" },
    { img: "/brand/nexus_warthog.jpg", kicker: "NEXUS STUDIO MASTER", title: "A-10 WARTHOG", sub: "CLOSE AIR SUPPORT · DESERT ENGAGEMENT", accent: "#FF8A2E" },
    { img: F.inferno_airstrike.thumb, kicker: "POWER FEATURE", title: "HOLD & WIN", sub: "FIRE COINS LOCK · POWER WHEEL", accent: "#FF8A2E" },
    { img: F.money_train_convoy.thumb, kicker: "WARHEAD KENO", title: "UP TO 5,000×", sub: "MARK · LAUNCH · DETONATE", accent: "#4EE44E" },
    { img: F.book_of_ops.thumb, kicker: "8 VIP RANKS", title: "WEEKLY CASHBACK", sub: "CLIMB · EARN · DOMINATE", accent: "#57E6C6" },
    { img: F.golden_dynasty.thumb, kicker: "ENLIST NOW", title: "10,000 FREE CREDITS", sub: "DEPLOY INTO THE FLOOR", accent: "#4EE44E" },
  ],
  giveaway: [
    { img: BRAND.giveaway, kicker: "// MISSION ALERT", title: "$35,000 GIVEAWAY", sub: "TURNKEY PLATFORM LICENSE", accent: "#F6C64A" },
    { img: BRAND.nexusBanner, kicker: "FLEET LAUNCH", title: "NEXUS STUDIO MASTER", sub: "GLOBAL GAMING FLEET", accent: "#FF8A2E" },
    { img: F.golden_dynasty.thumb, kicker: "PRIZE POOL", title: "ONE FULL LICENSE", sub: "UP FOR EXTRACTION", accent: "#FFC04A" },
    { img: F.pharaohs_arsenal.thumb, kicker: "CLIMB THE RANKS", title: "JOIN THE ELITE", sub: "ENLIST TO QUALIFY", accent: "#F6C64A" },
    { img: F.inferno_airstrike.thumb, kicker: "LIMITED WINDOW", title: "DON'T MISS OUT", sub: "DRAW CLOSING SOON", accent: "#FF5A5A" },
  ],
};

function FloatingCoins() {
  const coins = [
    { left: "8%", size: 46, delay: 0, dur: 6 },
    { left: "24%", size: 30, delay: 1.4, dur: 7.5 },
    { left: "68%", size: 38, delay: 0.7, dur: 6.8 },
    { left: "84%", size: 52, delay: 2.1, dur: 8 },
    { left: "50%", size: 26, delay: 3.2, dur: 7 },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {coins.map((c, i) => (
        <motion.img
          key={i}
          src={COINS}
          alt=""
          className="absolute bottom-[-60px] opacity-70"
          style={{ left: c.left, width: c.size, height: c.size }}
          initial={{ y: 0, opacity: 0, rotate: -10 }}
          animate={{ y: -420, opacity: [0, 0.8, 0], rotate: 20 }}
          transition={{ duration: c.dur, delay: c.delay, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

export function AnimatedShowcase({ variant = "promo", testId }) {
  const slides = SLIDES[variant] || SLIDES.promo;
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % slides.length), 5200);
    return () => clearInterval(t);
  }, [slides.length]);

  const s = slides[i];

  return (
    <div
      data-testid={testId}
      className="hud relative w-full aspect-video overflow-hidden bg-black"
      style={{ boxShadow: "inset 0 0 80px rgba(0,0,0,0.8)" }}
    >
      {/* Ken Burns background */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={i}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.15 }}
          animate={{ opacity: 1, scale: 1.0 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ opacity: { duration: 0.9 }, scale: { duration: 4.6, ease: "linear" } }}
        >
          <img src={s.img} alt={s.title} className="w-full h-full object-cover" />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.9) 100%)" }} />
      <div className="absolute inset-0 reel-scan opacity-40 pointer-events-none" />
      <FloatingCoins />

      {/* HUD tag */}
      <div className="absolute top-3 left-3 flex items-center gap-2 font-mono text-[10px] tracking-widest text-nvg/80 z-10">
        <span className="w-2 h-2 rounded-full bg-alert animate-flicker" /> LIVE FEED · ONLINE
        <VideoCamera size={13} weight="fill" />
      </div>

      {/* Text */}
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5 }}
          >
            <p className="font-mono text-[11px] tracking-[0.4em] mb-1" style={{ color: s.accent }}>★ {s.kicker}</p>
            <h3 className="font-display text-4xl sm:text-6xl tracking-wide text-white leading-none drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)]">{s.title}</h3>
            <p className="font-mono text-xs sm:text-sm tracking-widest text-white/80 mt-2 flex items-center gap-2">
              <Lightning size={14} weight="fill" style={{ color: s.accent }} /> {s.sub}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* progress dots */}
        <div className="flex items-center gap-2 mt-4">
          {slides.map((_, idx) => (
            <div key={idx} className="h-1 rounded-full transition-all duration-300"
              style={{ width: idx === i ? 28 : 10, background: idx === i ? s.accent : "rgba(255,255,255,0.3)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
