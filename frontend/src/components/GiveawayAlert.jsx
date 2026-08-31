import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Fire, Trophy, ArrowRight } from "@phosphor-icons/react";

// $35,000 Turnkey Platform Licence giveaway — live extraction countdown.
const TARGET = new Date("2026-09-30T23:59:59Z").getTime();

function useCountdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, TARGET - now);
  const s = Math.floor(diff / 1000);
  return {
    days: Math.floor(s / 86400),
    hrs: Math.floor((s % 86400) / 3600),
    mins: Math.floor((s % 3600) / 60),
    secs: s % 60,
  };
}

const Unit = ({ v, label }) => (
  <div className="text-center" data-testid={`giveaway-countdown-${label.toLowerCase()}`}>
    <div className="font-display text-4xl sm:text-5xl text-gold leading-none tabular-nums">
      {String(v).padStart(2, "0")}
    </div>
    <div className="font-mono text-[10px] tracking-[0.3em] text-emerald-300/60 mt-1">
      {label}
    </div>
  </div>
);

export const GiveawayAlert = () => {
  const navigate = useNavigate();
  const { days, hrs, mins, secs } = useCountdown();

  return (
    <section
      data-testid="giveaway-alert"
      className="relative max-w-[1200px] mx-auto my-12 px-4 sm:px-8"
    >
      <div className="relative overflow-hidden border border-emerald-500/30 bg-black/50 backdrop-blur-sm rounded-sm">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: "url(/brand/nexus_fleet_sizzle.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/40" />
        <div className="relative grid md:grid-cols-[1.4fr_1fr] gap-6 p-6 sm:p-10 items-center">
          <div>
            <p className="flex items-center gap-2 font-mono text-xs tracking-[0.35em] text-emerald-300/70">
              <Fire size={16} weight="fill" className="text-alert" /> // MISSION ALERT
            </p>
            <h2 className="font-display text-4xl sm:text-5xl mt-2 leading-none">
              THE <span className="gold-gradient">$35,000</span> GIVEAWAY
              <br /> IS LIVE
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-4 max-w-md leading-relaxed">
              To celebrate the launch of the Nexus Studio Master fleet, one full
              Turnkey Platform Licence is up for extraction. Enlist, climb the
              ranks, and join the elite.
            </p>

            <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.3em] text-emerald-300/60 mt-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              TIME TO EXTRACTION
            </p>
            <div className="flex items-center gap-4 sm:gap-6 mt-3">
              <Unit v={days} label="DAYS" />
              <span className="font-display text-3xl text-emerald-500/40">:</span>
              <Unit v={hrs} label="HRS" />
              <span className="font-display text-3xl text-emerald-500/40">:</span>
              <Unit v={mins} label="MINS" />
              <span className="font-display text-3xl text-emerald-500/40">:</span>
              <Unit v={secs} label="SECS" />
            </div>

            <button
              data-testid="giveaway-join-btn"
              onClick={() => navigate("/fleet-sales")}
              className="mt-8 inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-stencil tracking-widest uppercase px-6 py-3 rounded-sm transition-colors"
            >
              Join The Elite <ArrowRight size={18} weight="bold" />
            </button>
          </div>

          <div className="relative hidden md:block">
            <div className="relative border border-gold/40 bg-black/40 p-4 rounded-sm">
              <div className="flex items-center gap-2 mb-3">
                <Trophy size={20} weight="fill" className="text-gold" />
                <span className="font-stencil tracking-widest uppercase text-sm text-gold">
                  Turnkey Platform Licence
                </span>
              </div>
              <img
                src="/brand/nexus_fleet_sizzle.jpg"
                alt="Nexus Studio Master — Global Gaming Fleet"
                className="w-full h-44 object-cover rounded-sm ring-1 ring-gold/20"
              />
              <p className="font-mono text-[11px] text-muted-foreground mt-3 leading-relaxed">
                Value $35,000 USD · How to enter: enlist, climb the ranks, and
                stay deployed. Winner extracted at the end of the mission.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GiveawayAlert;
