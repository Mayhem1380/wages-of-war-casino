import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Broadcast, Play } from "@phosphor-icons/react";
import { AnimatedShowcase } from "@/components/AnimatedShowcase";

export function IntermissionShowcase() {
  return (
    <section
      data-testid="intermission-showcase"
      aria-labelledby="intermission-showcase-title"
      className="hud overflow-hidden border-nvg/30 bg-black/55"
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] text-nvg">
          <Broadcast size={13} weight="fill" /> BETWEEN MISSIONS
        </p>
        <span className="font-mono text-[9px] tracking-widest text-muted-foreground">
          HIGHLIGHT REEL
        </span>
      </div>
      <div className="relative aspect-video">
        <AnimatedShowcase testId="intermission-reel" variant="promo" />
        <div className="pointer-events-none absolute inset-0 bg-black/10" />
      </div>
      <div className="flex items-center justify-between gap-3 p-3">
        <div>
          <h2 id="intermission-showcase-title" className="font-display text-lg tracking-widest text-foreground">
            WATCH THE FLEET
          </h2>
          <p className="font-mono text-[9px] tracking-widest text-muted-foreground">
            WARKINO · NEXUS PLATFORMS · NEW SLOTS
          </p>
        </div>
        <Link
          to="/keno"
          className="flex shrink-0 items-center gap-1 border border-gold/50 px-3 py-2 font-mono text-[10px] tracking-widest text-gold hover:bg-gold/10"
        >
          <Play size={12} weight="fill" /> WARKINO <ArrowUpRight size={12} />
        </Link>
      </div>
    </section>
  );
}

export default IntermissionShowcase;
