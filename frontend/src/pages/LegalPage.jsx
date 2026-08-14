import React from "react";
import { useNavigate } from "react-router-dom";
import { LEGAL } from "@/data/legal";
import { ArrowLeft, Scroll, ShieldCheck } from "@phosphor-icons/react";

function Block({ item }) {
  if (typeof item === "string") {
    return <p className="text-sm text-muted-foreground leading-relaxed mb-3">{item}</p>;
  }
  if (item.list) {
    return (
      <ul className="mb-3 space-y-1.5">
        {item.list.map((li, i) => (
          <li key={li} className="flex gap-2 text-sm text-foreground/80 leading-relaxed">
            <span className="text-nvg mt-0.5 shrink-0">▸</span>
            <span>{li}</span>
          </li>
        ))}
      </ul>
    );
  }
  return null;
}

export default function LegalPage({ slug }) {
  const navigate = useNavigate();
  const data = LEGAL[slug];
  if (!data) return null;

  return (
    <div data-testid={`legal-${slug}`} className="max-w-3xl mx-auto px-4 sm:px-8 py-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-nvg font-mono text-sm mb-6">
        <ArrowLeft size={16} /> BACK
      </button>

      <div className="hud hud-gold p-6 mb-8">
        <div className="flex items-center gap-3">
          <Scroll size={30} weight="fill" className="text-gold" />
          <div>
            <p className="font-mono text-[11px] tracking-[0.4em] text-nvg/70">// WAGES OF WAR OPERATIONS LTD.</p>
            <h1 className="font-display text-4xl sm:text-5xl tracking-wide gold-gradient leading-none">{data.title}</h1>
            {data.subtitle && <p className="font-mono text-sm text-alert mt-1">{data.subtitle}</p>}
          </div>
        </div>
        {data.meta && (
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 mt-5 pt-4 border-t border-border">
            {data.meta.map(([k, v]) => (
              <div key={k} className="font-mono text-xs">
                <span className="text-muted-foreground">{k}: </span>
                <span className="text-foreground">{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-7">
        {data.sections.map((sec) => (
          <section key={sec.h}>
            <h2 className="font-stencil text-lg tracking-widest uppercase text-nvg mb-2 flex items-center gap-2">
              <span className="h-px w-4 bg-gold/60" /> {sec.h}
            </h2>
            {sec.body.map((item, i) => <Block key={i} item={item} />)}
          </section>
        ))}
      </div>

      <div className="mt-10 pt-6 border-t border-border flex items-center gap-2 text-muted-foreground">
        <ShieldCheck size={16} className="text-gold" />
        <span className="font-mono text-[11px]">18+ • Please gamble responsibly • Licensed by the Malta Gaming Authority (MGA/B2C/912/2025)</span>
      </div>
    </div>
  );
}
