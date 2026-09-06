import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { BRAND } from "@/data/gameMeta";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Coins, Cube, Headset, RocketLaunch } from "@phosphor-icons/react";

const OFFERINGS = [
  {
    Icon: Coins,
    title: "WAGES OF WAR",
    body: "Night Ops demo casino with cinematic slots, Keno, Coin Flip, VIP progression, wallet, and support tooling.",
  },
  {
    Icon: Cube,
    title: "NEXUS STUDIO MASTER",
    body: "Brandable platform packages, custom gaming floors, deployment support, and operator enquiry routing.",
  },
  {
    Icon: Headset,
    title: "HQ + OPERATIONS",
    body: "Admin controls, cashier review, KYC status, support tickets, and an auditable operations workflow.",
  },
];

export function CommercialSpotlight() {
  const navigate = useNavigate();
  const { user, openAuth } = useAuth();
  const primary = () => (user ? navigate("/lobby") : openAuth("register"));

  return (
    <section
      data-testid="commercial-spotlight"
      aria-labelledby="commercial-spotlight-title"
      className="relative overflow-hidden border-y border-gold/25 bg-[#030504]"
    >
      <div className="absolute inset-0 opacity-25">
        <img
          src={BRAND.coinNightOps}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover object-center"
        />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#030504_0%,rgba(3,5,4,0.9)_42%,rgba(3,5,4,0.55)_100%)]" />
      <div className="relative mx-auto grid max-w-[1400px] gap-8 px-4 py-14 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-20">
        <div>
          <p className="font-mono text-[10px] tracking-[0.4em] text-gold">
            // COMMERCIAL TRANSMISSION · DEMO PLATFORM
          </p>
          <h2
            id="commercial-spotlight-title"
            className="mt-3 max-w-3xl font-display text-4xl leading-none tracking-wide text-foreground sm:text-6xl"
          >
            BUILD THE FLOOR.
            <br />
            <span className="gold-gradient">OWN THE MISSION.</span>
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-foreground/75 sm:text-base">
            A cinematic introduction to Wages of War Casino and the Nexus Studio
            Master platform fleet. Promotional signup offers and real-money
            services are subject to eligibility, published terms, licensing, and
            live provider configuration.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={primary}
              className="bg-gold text-black glow-gold gap-2 font-display text-lg tracking-widest"
            >
              <RocketLaunch size={19} weight="fill" />
              {user ? "ENTER DEMO" : "ENLIST — PROMO OFFER"}
            </Button>
            <Button
              onClick={() => navigate("/fleet")}
              variant="outline"
              className="border-nvg/50 text-nvg hover:bg-nvg/10 gap-2 font-display text-lg tracking-widest"
            >
              FLEET PACKAGES <ArrowUpRight size={18} />
            </Button>
          </div>
          <p className="mt-3 font-mono text-[10px] tracking-widest text-muted-foreground">
            STARTUP, TURNKEY, AND ENTERPRISE QUOTES · LOOP2LUCK CONCEPTS BY ENQUIRY
          </p>
        </div>
        <div className="grid gap-3">
          {OFFERINGS.map(({ Icon, title, body }) => (
            <div
              key={title}
              className="flex gap-4 border border-gold/20 bg-black/55 p-4 backdrop-blur-sm"
            >
              <Icon size={27} weight="fill" className="mt-1 shrink-0 text-nvg" />
              <div>
                <h3 className="font-stencil text-sm tracking-[0.2em] text-gold">
                  {title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default CommercialSpotlight;
