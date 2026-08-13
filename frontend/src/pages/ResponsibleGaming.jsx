import React from "react";
import { RG } from "@/constants/testIds";
import { ShieldCheck, Clock, HandPalm, Heart, Warning, LinkSimple } from "@phosphor-icons/react";

export default function ResponsibleGaming() {
  const items = [
    { Icon: Clock, title: "Set Time Limits", body: "Decide how long you'll play before you start. Wages of War Casino is entertainment — not a way to make money." },
    { Icon: HandPalm, title: "Take Breaks", body: "Step away regularly. Chasing losses is a red flag. Every game here uses virtual play-money credits only." },
    { Icon: Heart, title: "Play for Fun", body: "If gameplay stops being fun, stop playing. Never let a game affect your mood, sleep, or relationships." },
    { Icon: Warning, title: "18+ Only", body: "Access is strictly restricted to adults aged 18 and over. Underage play is prohibited under our MGA licence." },
  ];

  return (
    <div data-testid={RG.root} className="max-w-3xl mx-auto px-4 sm:px-8 py-14">
      <div className="text-center mb-10">
        <ShieldCheck size={52} weight="fill" className="text-gold mx-auto" />
        <p className="font-mono text-xs tracking-[0.4em] text-nvg/70 mt-3">// DUTY OF CARE</p>
        <h1 className="font-display text-5xl sm:text-6xl tracking-wide text-foreground">RESPONSIBLE GAMING</h1>
      </div>

      <div className="hud hud-gold p-6 mb-8">
        <p className="text-muted-foreground leading-relaxed">
          <span className="text-foreground font-semibold">Wages of War Operations Ltd.</span> is committed to safe,
          responsible entertainment under Malta Gaming Authority licence <span className="text-gold">MGA/B2C/912/2025</span>.
          All gameplay on Wages of War Casino uses virtual play-money credits with no monetary value and no real-money payouts.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        {items.map((it, i) => (
          <div key={it.title} className="hud p-6">
            <it.Icon size={30} weight="fill" className="text-nvg" />
            <h3 className="font-display text-2xl tracking-wide text-foreground mt-3">{it.title}</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{it.body}</p>
          </div>
        ))}
      </div>

      <div className="hud p-6">
        <h3 className="font-display text-2xl tracking-wide text-gold flex items-center gap-2"><LinkSimple size={22} /> NEED SUPPORT?</h3>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          If you or someone you know needs help with gambling-related concerns, confidential support is available at
          <span className="text-nvg"> BeGambleAware.org</span>,<span className="text-nvg"> GamCare</span>, and the
          <span className="text-nvg"> National Gambling Helpline</span>. Support is free and available 24/7.
        </p>
      </div>
    </div>
  );
}
