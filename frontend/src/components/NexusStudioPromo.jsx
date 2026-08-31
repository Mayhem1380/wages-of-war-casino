import React from "react";
import { Rocket, Check, ArrowUpRight } from "@phosphor-icons/react";

// Nexus Studio design/build service packages advertisement.
// EDIT the prices + URL below with your real values (or ask the agent to set them).
const NEXUS_URL = "https://nexusstudiomaster.com";
const PACKAGES = [
  {
    name: "10-SLOT PACK",
    price: "$5,000",
    tagline: "10 custom slot machines",
    perks: ["10 themed slot games", "Custom art per game", "Server-side RNG engine", "Mobile-ready + deploy"],
  },
  {
    name: "STARTUP BUILD",
    price: "$5,800",
    featured: true,
    tagline: "Full startup platform",
    perks: ["Full front + backend", "AAA custom graphics", "Payments & auth wired", "Deploy + launch support"],
  },
  {
    name: "PLATFORM COMPLETE",
    price: "$35,000",
    tagline: "Complete turnkey casino",
    perks: ["Everything in Startup", "40+ slots + table games", "Real-money & compliance", "Ongoing ops & scaling"],
  },
];

export function NexusStudioPromo() {
  return (
    <section
      data-testid="nexus-studio-promo"
      className="pt-10"
    >
      <div className="flex items-center gap-3 mb-6">
        <Rocket size={24} weight="fill" className="text-gold" />
        <div>
          <p className="font-mono text-[10px] tracking-[0.35em] text-gold/70">
            // BUILT BY NEXUS STUDIO
          </p>
          <h3 className="font-display text-2xl tracking-widest gold-gradient">
            WANT ONE BUILT LIKE THIS?
          </h3>
        </div>
        <a
          href={NEXUS_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="nexus-studio-link"
          className="ml-auto hidden sm:inline-flex items-center gap-1 font-mono text-xs tracking-widest text-nvg hover:text-gold transition-colors"
        >
          {NEXUS_URL.replace("https://", "")} <ArrowUpRight size={14} />
        </a>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {PACKAGES.map((p) => (
          <div
            key={p.name}
            data-testid={`nexus-pkg-${p.name.toLowerCase().replace(/\s+/g, "-")}`}
            className={`relative p-5 border ${
              p.featured
                ? "border-gold bg-gold/5 glow-gold"
                : "border-border bg-black/40"
            }`}
          >
            {p.featured && (
              <span className="absolute -top-2 left-4 bg-gold text-black font-mono text-[9px] tracking-widest px-2 py-0.5">
                MOST POPULAR
              </span>
            )}
            <p className="font-stencil tracking-widest uppercase text-sm text-foreground">
              {p.name}
            </p>
            <p className="font-mono text-[11px] text-muted-foreground mb-2">
              {p.tagline}
            </p>
            <p className="font-display text-3xl gold-gradient mb-3">{p.price}</p>
            <ul className="space-y-1.5">
              {p.perks.map((perk) => (
                <li
                  key={perk}
                  className="flex items-start gap-2 text-xs text-foreground/80"
                >
                  <Check
                    size={14}
                    weight="bold"
                    className="text-nvg shrink-0 mt-0.5"
                  />
                  {perk}
                </li>
              ))}
            </ul>
            <a
              href={NEXUS_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`nexus-cta-${p.name.toLowerCase().replace(/\s+/g, "-")}`}
              className={`mt-4 flex items-center justify-center gap-1 py-2 font-display tracking-widest text-sm transition-colors ${
                p.featured
                  ? "bg-gold hover:bg-gold/90 text-black"
                  : "border border-nvg/50 text-nvg hover:bg-nvg/10"
              }`}
            >
              GET A QUOTE <ArrowUpRight size={14} weight="bold" />
            </a>
          </div>
        ))}
      </div>
      <p className="font-mono text-[10px] text-muted-foreground text-center mt-4">
        Nexus Studio — cinematic web apps, games &amp; platforms. Enquire at{" "}
        <a href={NEXUS_URL} className="text-nvg underline">
          {NEXUS_URL.replace("https://", "")}
        </a>
      </p>
    </section>
  );
}

export default NexusStudioPromo;
