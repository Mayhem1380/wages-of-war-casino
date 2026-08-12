import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/data/gameMeta";
import {
  ArrowLeft, GlobeHemisphereWest, Cube, ShieldCheck, Lightning, Headset, Gauge, RocketLaunch, CheckCircle, Airplane,
} from "@phosphor-icons/react";

export default function FleetSales() {
  const navigate = useNavigate();
  const { user, openAuth } = useAuth();

  const features = [
    { Icon: Cube, title: "Turnkey Platforms", body: "Fully-built, brandable online casino platforms deployed and ready for launch — the same engine powering Wages of War." },
    { Icon: GlobeHemisphereWest, title: "Global Fleet", body: "Deploy across regulated markets worldwide with multi-currency, multi-language and geo-aware configuration." },
    { Icon: ShieldCheck, title: "Licence-Ready", body: "Compliance-first architecture built to MGA standards, with responsible-gaming tooling baked in." },
    { Icon: Gauge, title: "Best-In-Class Reels", body: "Server-authoritative slot engine with 20-line mechanics, wilds, scatters, rising free-spin multipliers and provable RNG." },
    { Icon: Lightning, title: "Rapid Deployment", body: "From contract to live floor in record time. Your fleet, your branding, our battle-tested tech." },
    { Icon: Headset, title: "Command Support", body: "Dedicated onboarding and 24/7 operational support from the Nexus Studio Master team." },
  ];

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-10">
      <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground hover:text-nvg font-mono text-sm mb-6">
        <ArrowLeft size={16} /> RETURN TO BASE
      </button>

      <div className="hud hud-gold overflow-hidden mb-10">
        <img src={BRAND.nexusBanner} alt="Nexus Studio Master — Global Gaming Fleet Sales" className="w-full" />
      </div>

      <div className="text-center mb-12">
        <p className="font-mono text-xs tracking-[0.4em] text-nvg/70">// NEXUS STUDIO MASTER</p>
        <h1 className="font-display text-5xl sm:text-6xl tracking-wide gold-gradient flex items-center justify-center gap-3">
          <Airplane size={44} weight="fill" className="text-gold" /> GLOBAL GAMING FLEET SALES
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl mx-auto leading-relaxed">
          We build and sell elite, ready-to-deploy online casino platforms. Wages of War Casino is our
          flagship — now the same military-grade gaming fleet is available for operators worldwide.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
        {features.map((f, i) => (
          <div key={i} className="hud p-6 hover:border-gold/60 transition-colors animate-pop" style={{ animationDelay: `${i * 0.06}s` }}>
            <f.Icon size={30} weight="fill" className="text-nvg" />
            <h3 className="font-display text-2xl tracking-wide text-foreground mt-3">{f.title}</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{f.body}</p>
          </div>
        ))}
      </div>

      <div className="hud hud-gold grid md:grid-cols-2 items-center gap-8 p-8 mb-10">
        <div>
          <p className="font-mono text-xs tracking-[0.4em] text-gold animate-flicker">// FLAGSHIP DEPLOYMENT</p>
          <h2 className="font-display text-4xl tracking-wide gold-gradient mt-2">THE $35,000 FLEET GIVEAWAY</h2>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            One complete Turnkey Platform Licence from the Nexus Studio Master fleet is up for extraction.
            Enlist at Wages of War Casino, climb the ranks, and join the elite in contention.
          </p>
          <ul className="mt-4 space-y-2">
            {["Full platform licence", "Brand & theme customisation", "Launch + operational support"].map((t) => (
              <li key={t} className="flex items-center gap-2 font-mono text-sm text-foreground/80">
                <CheckCircle size={16} weight="fill" className="text-nvg" /> {t}
              </li>
            ))}
          </ul>
          <Button
            onClick={() => (user ? navigate("/lobby") : openAuth("register"))}
            className="mt-6 bg-gold hover:bg-gold/90 text-black font-display text-lg tracking-widest px-6 glow-gold gap-2"
          >
            <RocketLaunch size={20} weight="fill" /> {user ? "ENTER THE FLEET" : "ENLIST TO ENTER"}
          </Button>
        </div>
        <img src={BRAND.giveaway} alt="Wages of War Casino giveaway" className="w-full max-w-sm mx-auto ring-1 ring-gold/30" />
      </div>

      <div className="flex items-center gap-3 justify-center text-center">
        <img src={BRAND.coin} alt="Nexus Studio Master" className="w-12 h-12 rounded-full ring-1 ring-gold/40 object-cover" />
        <p className="font-mono text-xs text-muted-foreground max-w-xl leading-relaxed">
          Fleet sales enquiries are handled by the Nexus Studio Master command team. Wages of War Casino play
          remains virtual play-money entertainment; fleet products are B2B operator solutions.
        </p>
      </div>
    </div>
  );
}
