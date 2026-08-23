import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BRAND } from "@/data/gameMeta";
import { FLEET } from "@/constants/testIds";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";

// Platform giveaway draw locked to 12+ months out to keep the timer visible and seasonal.
const GIVEAWAY_END = new Date(Date.now() + 395 * 24 * 60 * 60 * 1000).getTime();

function GiveawayCountdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, GIVEAWAY_END - now);
  const s = Math.floor(diff / 1000);
  const months = Math.floor(s / (30 * 86400));
  const days = Math.floor((s % (30 * 86400)) / 86400);
  const hrs = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const near = diff > 0 && diff < 7 * 86400 * 1000;
  const drawDate = new Date(GIVEAWAY_END).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const cell = (v, l) => (
    <div className="flex flex-col items-center">
      <span className="font-display text-3xl sm:text-4xl text-gold leading-none tabular-nums">{String(v).padStart(2, "0")}</span>
      <span className="font-mono text-[9px] tracking-[0.3em] text-muted-foreground mt-1">{l}</span>
    </div>
  );
  return (
    <div data-testid="giveaway-countdown" className={`mt-5 border bg-black/50 p-4 ${near ? "border-alert animate-pulse" : "border-gold/30"}`}>
      <p className={`font-mono text-[10px] tracking-[0.4em] animate-flicker mb-3 ${near ? "text-alert" : "text-nvg"}`}>// DRAW CLOSES IN</p>
      <div className="flex items-center gap-3 sm:gap-5">
        {cell(months, "MONTHS")}<span className="text-gold/40 text-2xl">:</span>
        {cell(days, "DAYS")}<span className="text-gold/40 text-2xl">:</span>
        {cell(hrs, "HRS")}<span className="text-gold/40 text-2xl">:</span>
        {cell(mins, "MIN")}<span className="text-gold/40 text-2xl">:</span>
        {cell(secs, "SEC")}
      </div>
      <p className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground mt-3">DRAW DATE — {drawDate}</p>
    </div>
  );
}
import {
  ArrowLeft,
  GlobeHemisphereWest,
  Cube,
  ShieldCheck,
  Lightning,
  Headset,
  Gauge,
  RocketLaunch,
  CheckCircle,
  Airplane,
  PaperPlaneTilt,
} from "@phosphor-icons/react";

export default function FleetSales() {
  const navigate = useNavigate();
  const { user, openAuth } = useAuth();
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    country: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const setField = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submitEnquiry = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post("/fleet/enquiry", form);
      setSent(true);
      toast.success(
        "Enquiry transmitted — the Nexus command team will be in contact.",
      );
    } catch (err) {
      toast.error(
        apiError(
          err.response?.data?.detail,
          "Could not send enquiry. Try again.",
        ),
      );
    }
    setSending(false);
  };

  const features = [
    {
      Icon: Cube,
      title: "Turnkey Platforms",
      body: "Fully-built, brandable online casino platforms deployed and ready for launch — the same engine powering Wages of War.",
    },
    {
      Icon: GlobeHemisphereWest,
      title: "Global Fleet",
      body: "Deploy across regulated markets worldwide with multi-currency, multi-language and geo-aware configuration.",
    },
    {
      Icon: ShieldCheck,
      title: "Licence-Ready",
      body: "Compliance-first architecture built to MGA standards, with responsible-gaming tooling baked in.",
    },
    {
      Icon: Gauge,
      title: "Best-In-Class Reels",
      body: "Server-authoritative slot engine with 20-line mechanics, wilds, scatters, rising free-spin multipliers and provable RNG.",
    },
    {
      Icon: Lightning,
      title: "Rapid Deployment",
      body: "From contract to live floor in record time. Your fleet, your branding, our battle-tested tech.",
    },
    {
      Icon: Headset,
      title: "Command Support",
      body: "Dedicated onboarding and 24/7 operational support from the Nexus Studio Master team.",
    },
  ];

  // Confirmed Nexus Studio fleet package pricing (USD).
  const pricing = [
    {
      name: "10-Slot Pack",
      note: "10 custom slot machines · deploy-ready",
      price: "$5,000",
    },
    {
      name: "Startup Build",
      note: "Full platform · front + backend",
      price: "$5,800",
    },
    {
      name: "Platform Complete",
      note: "Turnkey casino · real-money & compliance",
      price: "$35,000",
    },
    {
      name: "Enterprise Fleet",
      note: "Multi-brand · custom deployment",
      price: "P.O.A.",
    },
  ];

  return (
    <div
      data-testid={FLEET.root}
      className="max-w-[1200px] mx-auto px-4 sm:px-8 py-10"
    >
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2 text-muted-foreground hover:text-nvg font-mono text-sm mb-6"
      >
        <ArrowLeft size={16} /> RETURN TO BASE
      </button>

      <div className="hud hud-gold overflow-hidden mb-10">
        <img
          src={BRAND.nexusBanner}
          alt="Nexus Studio Master — Global Gaming Fleet Sales"
          className="w-full"
        />
      </div>

      <div className="text-center mb-12">
        <p className="font-mono text-xs tracking-[0.4em] text-nvg/70">
          // NEXUS STUDIO MASTER
        </p>
        <h1 className="font-display text-5xl sm:text-6xl tracking-wide gold-gradient flex items-center justify-center gap-3">
          <Airplane size={44} weight="fill" className="text-gold" /> GLOBAL
          GAMING FLEET SALES
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl mx-auto leading-relaxed">
          We build and sell elite, ready-to-deploy online casino platforms.
          Wages of War Casino is our flagship — now the same military-grade
          gaming fleet is available for operators worldwide.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
        {features.map((f, i) => (
          <div
            key={f.title}
            className="hud p-6 hover:border-gold/60 transition-colors animate-pop"
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            <f.Icon size={30} weight="fill" className="text-nvg" />
            <h3 className="font-display text-2xl tracking-wide text-foreground mt-3">
              {f.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {f.body}
            </p>
          </div>
        ))}
      </div>

      <div className="hud hud-gold grid md:grid-cols-2 items-center gap-8 p-8 mb-10">
        <div>
          <p className="font-mono text-xs tracking-[0.4em] text-gold animate-flicker">
            // FLAGSHIP DEPLOYMENT
          </p>
          <h2 className="font-display text-4xl tracking-wide gold-gradient mt-2">
            THE $35,000 FLEET GIVEAWAY
          </h2>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            One complete Turnkey Platform Licence from the Nexus Studio Master
            fleet is up for extraction. Enlist at Wages of War Casino, climb the
            ranks, and join the elite in contention.
          </p>
          <GiveawayCountdown />
          <ul className="mt-4 space-y-2">
            {[
              "Full platform licence",
              "Brand & theme customisation",
              "Launch + operational support",
            ].map((t) => (
              <li
                key={t}
                className="flex items-center gap-2 font-mono text-sm text-foreground/80"
              >
                <CheckCircle size={16} weight="fill" className="text-nvg" /> {t}
              </li>
            ))}
          </ul>
          <Button
            onClick={() => (user ? navigate("/lobby") : openAuth("register"))}
            className="mt-6 bg-gold hover:bg-gold/90 text-black font-display text-lg tracking-widest px-6 glow-gold gap-2"
          >
            <RocketLaunch size={20} weight="fill" />{" "}
            {user ? "ENTER THE FLEET" : "ENLIST TO ENTER"}
          </Button>
        </div>
        <img
          src={BRAND.giveaway}
          alt="Wages of War Casino giveaway"
          className="w-full max-w-sm mx-auto ring-1 ring-gold/30"
        />
      </div>

      {/* NEXUS FLEET CINEMATIC REEL + PRICING */}
      <div
        data-testid="fleet-pricing-reel"
        className="hud hud-gold relative overflow-hidden mb-10"
      >
        <video
          src="/brand/nexus_fleet_reel.mp4"
          poster="/brand/nexus_fleet_poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(5,6,5,0.97) 0%, rgba(5,6,5,0.9) 40%, rgba(5,6,5,0.4) 75%, rgba(5,6,5,0.15) 100%)",
          }}
        />
        <div className="relative p-8 md:p-10 min-h-[460px] flex flex-col justify-center max-w-xl">
          <p className="font-mono text-xs tracking-[0.4em] text-gold animate-flicker">
            // NEXUS STUDIO MASTER
          </p>
          <h2 className="font-display text-4xl sm:text-5xl tracking-wide gold-gradient mt-2 leading-none">
            GLOBAL GAMING FLEET SALES
          </h2>
          <p className="text-sm text-muted-foreground mt-3 max-w-md leading-relaxed">
            Deploy your own military-grade casino from the Nexus Studio Master
            fleet. Select a deployment package.
          </p>
          <div className="mt-6 space-y-3">
            {pricing.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between gap-4 border border-gold/25 bg-black/50 backdrop-blur-sm px-4 py-3 hover:border-gold/70 transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-stencil tracking-wide text-foreground uppercase text-sm truncate">
                    {p.name}
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {p.note}
                  </div>
                </div>
                <div className="font-display text-2xl text-gold whitespace-nowrap drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                  {p.price}
                </div>
              </div>
            ))}
          </div>
          <a
            href="#enquiry"
            className="inline-flex items-center gap-2 mt-6 w-fit font-stencil tracking-widest uppercase text-sm text-black bg-gold px-5 py-2.5 hover:bg-gold/90 glow-gold"
          >
            <RocketLaunch size={16} weight="fill" /> Request Fleet Quote
          </a>
        </div>
      </div>

      <div className="hud hud-gold p-8 mb-10" id="enquiry">
        <div className="mb-6">
          <p className="font-mono text-xs tracking-[0.4em] text-nvg/70">
            // REQUEST A PLATFORM QUOTE
          </p>
          <h2 className="font-display text-4xl tracking-wide gold-gradient flex items-center gap-3">
            <PaperPlaneTilt size={32} weight="fill" className="text-gold" />{" "}
            FLEET ENQUIRY
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Operators only. Tell us about your deployment and the Nexus command
            team will respond.
          </p>
        </div>

        {sent ? (
          <div
            data-testid={FLEET.success}
            className="flex flex-col items-center text-center py-8 animate-pop"
          >
            <CheckCircle size={56} weight="fill" className="text-nvg" />
            <h3 className="font-display text-3xl tracking-wide text-foreground mt-4">
              TRANSMISSION RECEIVED
            </h3>
            <p className="text-muted-foreground mt-1 max-w-md">
              Your fleet enquiry is logged. Expect contact from the Nexus Studio
              Master command team shortly.
            </p>
            <Button
              onClick={() => {
                setSent(false);
                setForm({
                  name: "",
                  company: "",
                  email: "",
                  country: "",
                  message: "",
                });
              }}
              variant="outline"
              className="mt-6 border-nvg/40 text-nvg font-stencil tracking-widest"
            >
              SEND ANOTHER
            </Button>
          </div>
        ) : (
          <form onSubmit={submitEnquiry} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                data-testid={FLEET.name}
                required
                placeholder="Your name"
                value={form.name}
                onChange={setField("name")}
                className="bg-black/40 border-border font-mono"
              />
              <Input
                data-testid={FLEET.company}
                placeholder="Company / operator"
                value={form.company}
                onChange={setField("company")}
                className="bg-black/40 border-border font-mono"
              />
              <Input
                data-testid={FLEET.email}
                required
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={setField("email")}
                className="bg-black/40 border-border font-mono"
              />
              <Input
                data-testid={FLEET.country}
                placeholder="Target market / country"
                value={form.country}
                onChange={setField("country")}
                className="bg-black/40 border-border font-mono"
              />
            </div>
            <Textarea
              data-testid={FLEET.message}
              required
              rows={4}
              placeholder="Tell us about your platform requirements, target markets, and timeline…"
              value={form.message}
              onChange={setField("message")}
              className="bg-black/40 border-border font-mono"
            />
            <Button
              data-testid={FLEET.submit}
              type="submit"
              disabled={sending}
              className="bg-gold hover:bg-gold/90 text-black font-display text-lg tracking-widest px-6 glow-gold gap-2"
            >
              <PaperPlaneTilt size={18} weight="fill" />{" "}
              {sending ? "TRANSMITTING..." : "TRANSMIT ENQUIRY"}
            </Button>
          </form>
        )}
      </div>

      <div className="flex items-center gap-3 justify-center text-center">
        <img
          src={BRAND.coin}
          alt="Nexus Studio Master"
          className="w-12 h-12 rounded-full ring-1 ring-gold/40 object-cover"
        />
        <p className="font-mono text-xs text-muted-foreground max-w-xl leading-relaxed">
          Fleet sales enquiries are handled by the Nexus Studio Master command
          team. Wages of War Casino play remains virtual play-money
          entertainment; fleet products are B2B operator solutions.
        </p>
      </div>
    </div>
  );
}
