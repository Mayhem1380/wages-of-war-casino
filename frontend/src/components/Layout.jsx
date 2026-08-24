import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useSound } from "@/context/SoundContext";
import { BrandLogo } from "@/components/BrandLogo";
import CombatBackground from "@/components/CombatBackground";
import SharkBite from "@/components/SharkBite";
import { AuthDialog } from "@/components/AuthDialog";
import { RankUpBanner } from "@/components/RankUpBanner";
import ChatWidget from "@/components/ChatWidget";
import { LEGAL_LINKS } from "@/data/legal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { NAV } from "@/constants/testIds";
import { fmt, BRAND } from "@/data/gameMeta";
import api from "@/lib/api";
import { toast } from "sonner";
import { SupportDialog } from "@/components/SupportDialog";
import { NexusStudioPromo } from "@/components/NexusStudioPromo";
import {
  Coins,
  Gift,
  UserCircle,
  Wallet as WalletIcon,
  SignOut,
  Medal,
  Trophy,
  GameController,
  ShieldCheck,
  SpeakerSimpleHigh,
  SpeakerSimpleSlash,
  Vault as VaultIcon,
} from "@phosphor-icons/react";

function MuteToggle() {
  const { muted, toggle } = useSound();
  return (
    <button
      data-testid={NAV.muteBtn}
      onClick={toggle}
      title={muted ? "Unmute battle sounds" : "Mute battle sounds"}
      className={`w-9 h-9 flex items-center justify-center border transition-colors ${
        muted
          ? "border-border text-muted-foreground hover:text-foreground"
          : "border-nvg/50 text-nvg hover:bg-nvg/10"
      }`}
    >
      {muted ? (
        <SpeakerSimpleSlash size={18} weight="fill" />
      ) : (
        <SpeakerSimpleHigh size={18} weight="fill" />
      )}
    </button>
  );
}

function DailyBonus() {
  const { user, refreshUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/bonus/status");
      setStatus(data);
    } catch (e) {
      console.warn("bonus status load failed", e);
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (!user) return null;

  const claim = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/bonus/claim");
      toast.success(
        `+${fmt(data.claimed)} credits — ${data.tier} daily supply drop!`,
      );
      await refreshUser();
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Bonus not ready");
    }
    setBusy(false);
  };

  const ready = status?.available;
  return (
    <button
      data-testid={NAV.bonusBtn}
      onClick={claim}
      disabled={busy || !ready}
      title={ready ? "Claim daily supply drop" : "Come back in 24h"}
      className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 border font-mono text-xs tracking-wide transition-colors ${
        ready
          ? "border-gold/60 text-gold hover:bg-gold/10 animate-flicker"
          : "border-border text-muted-foreground"
      }`}
    >
      <Gift size={16} weight="fill" />
      {ready ? "SUPPLY DROP" : "CLAIMED"}
    </button>
  );
}

function VerifyBonusButton() {
  const { user, refreshUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get("/bonus/verify-status");
      setStatus(data);
    } catch (e) {
      console.warn("verify bonus status failed", e);
    }
  }, [user]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (!user) return null;

  const claim = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/bonus/verify");
      toast.success(
        `+${fmt(data.claimed)} credits — verified bonus credited. Terms apply.`,
      );
      await refreshUser();
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Verification bonus unavailable");
    }
    setBusy(false);
  };

  const eligible = !!status?.eligible && !status?.claimed;
  return (
    <button
      data-testid="bonus-signup-verify-btn"
      onClick={claim}
      disabled={busy || !eligible}
      title={
        eligible
          ? "Claim $10 signup + verify bonus"
          : status?.claimed
            ? "Verification bonus already claimed"
            : "Complete KYC to unlock the $10 bonus"
      }
      className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 border font-mono text-xs tracking-wide transition-colors ${
        eligible
          ? "border-nvg/60 text-nvg hover:bg-nvg/10 animate-flicker"
          : "border-border text-muted-foreground"
      }`}
    >
      <Gift size={16} weight="fill" />
      {status?.claimed ? "BONUS CLAIMED" : "VERIFY BONUS"}
    </button>
  );
}

export function Layout({ children }) {
  const { user, logout, openAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navLink = (to, label, testId, Icon) => {
    const active = location.pathname === to;
    return (
      <Link
        to={to}
        data-testid={testId}
        className={`hidden md:flex items-center gap-1.5 font-stencil text-sm tracking-widest uppercase transition-colors ${
          active ? "text-nvg" : "text-foreground/70 hover:text-nvg"
        }`}
      >
        <Icon size={16} weight={active ? "fill" : "regular"} />
        {label}
      </Link>
    );
  };

  return (
    <div className="App tactical-bg scanlines min-h-screen flex flex-col">
      {/* Site-wide holographic war-map backdrop behind all tiles */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center opacity-[0.18]"
        style={{ backgroundImage: "url(/brand/warmap_bg.jpg)" }}
      />
      {/* War-zone combat scene (muzzle flashes) — shown on entry for everyone */}
      <CombatBackground />
      <header className="sticky top-0 z-50 border-b-2 border-gold/25 bg-black/85 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/" data-testid={NAV.logo}>
            <BrandLogo size={38} subtitle={false} />
          </Link>

          <nav className="flex items-center gap-6">
            {navLink("/lobby", "Ops Lobby", NAV.lobby, GameController)}
            {navLink("/vip", "VIP Ranks", NAV.vip, Medal)}
            {navLink("/leaderboard", "Leaderboard", NAV.leaderboard, Trophy)}
          </nav>

          <div className="flex items-center gap-3">
            <MuteToggle />
            {user ? (
              <>
                <VerifyBonusButton />
                <DailyBonus />
                <Link
                  to="/wallet"
                  data-testid={NAV.balance}
                  className="flex items-center gap-2 px-3 py-1.5 hud hud-gold text-gold font-mono text-sm glow-gold"
                >
                  <Coins size={16} weight="fill" />
                  <span data-testid="balance-value">{fmt(user.balance)}</span>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild data-testid={NAV.userMenu}>
                    <button className="flex items-center gap-2 outline-none">
                      {user.picture ? (
                        <img
                          src={user.picture}
                          alt="me"
                          className="w-9 h-9 rounded-full ring-1 ring-nvg/50 object-cover"
                        />
                      ) : (
                        <UserCircle
                          size={34}
                          weight="fill"
                          className="text-nvg"
                        />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="bg-[#0a0d0a] border-gold/30 w-52"
                  >
                    <div className="px-2 py-2">
                      <p className="font-display text-lg tracking-wide text-foreground leading-none">
                        {user.name}
                      </p>
                      <p className="font-mono text-[11px] text-gold">
                        {user.vip_tier} • Rank {user.vip_rank}
                      </p>
                    </div>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem
                      data-testid={NAV.profileBtn}
                      onClick={() => navigate("/profile")}
                      className="font-mono text-sm gap-2 cursor-pointer"
                    >
                      <UserCircle size={16} /> Dossier
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate("/wallet")}
                      className="font-mono text-sm gap-2 cursor-pointer"
                    >
                      <WalletIcon size={16} /> Wallet & Deposit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      data-testid="nav-cashier-btn"
                      onClick={() => navigate("/cashier")}
                      className="font-mono text-sm gap-2 cursor-pointer text-gold"
                    >
                      <VaultIcon size={16} /> Cashier · Deposit/Withdraw
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border" />
                    {user.role === "admin" && (
                      <DropdownMenuItem
                        data-testid="nav-admin-btn"
                        onClick={() => navigate("/admin")}
                        className="font-mono text-sm gap-2 cursor-pointer text-gold"
                      >
                        <ShieldCheck size={16} /> Admin Ops
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      data-testid={NAV.logoutBtn}
                      onClick={logout}
                      className="font-mono text-sm gap-2 cursor-pointer text-alert"
                    >
                      <SignOut size={16} /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button
                  data-testid={NAV.loginBtn}
                  variant="ghost"
                  onClick={() => openAuth("login")}
                  className="font-stencil tracking-widest uppercase text-foreground/80 hover:text-nvg hover:bg-transparent"
                >
                  Login
                </Button>
                <Button
                  data-testid={NAV.enlistBtn}
                  onClick={() => openAuth("register")}
                  className="bg-gold hover:bg-gold/90 text-black font-display text-base tracking-widest px-5 glow-gold"
                >
                  ENLIST
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Announcement banner */}
      <div className="w-full bg-gradient-to-r from-gold/90 via-gold/70 to-yellow-400 text-black font-display text-sm tracking-wide py-2 text-center z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
          <strong className="uppercase">Best Platform of 2026</strong>
          <span className="ml-3">
            — Everything is competing to be the best online casino in the world;
            our goal is to be number one.
          </span>
        </div>
      </div>

      <main className="flex-1 relative z-10">{children}</main>

      {/* Nexus Studio — standalone professional band (moved OUT of the underwater footer) */}
      <section
        data-testid="nexus-studio-band"
        className="relative z-10 border-t-2 border-gold/20 bg-gradient-to-b from-[#0b0f0b] via-black to-[#0a0d0a]"
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-4">
          <NexusStudioPromo />
        </div>
      </section>

      <footer className="relative z-10 border-t-2 border-gold/20 bg-black/70 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.6]"
          style={{
            backgroundImage: `url(${BRAND.footerUnderwater})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-hidden="true"
        />
        <SharkBite />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.8))",
          }}
          aria-hidden="true"
        />

        {/* Blue glowing casino emblem faded between the diver & shark (breathing) + rising bubbles */}
        <style>{`
          @keyframes wowBreathe { 0%,100%{ opacity:.42; transform:translate(-50%,-50%) scale(1); } 50%{ opacity:.68; transform:translate(-50%,-50%) scale(1.05); } }
          @keyframes wowBubble { 0%{ transform:translateY(0) scale(1); opacity:0; } 12%{ opacity:.55; } 100%{ transform:translateY(-210px) scale(1.5); opacity:0; } }
        `}</style>
        <img
          src="/brand/footer_logo_blue.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 w-56 sm:w-80 z-[1]"
          style={{
            filter:
              "brightness(0) invert(1) drop-shadow(0 0 26px rgba(255,255,255,0.9)) drop-shadow(0 0 60px rgba(255,255,255,0.55))",
            animation: "wowBreathe 5s ease-in-out infinite",
          }}
        />
        {[...Array(7)].map((_, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="pointer-events-none absolute rounded-full bg-cyan-300/40 z-[1]"
            style={{
              left: `${13 + i * 11}%`,
              bottom: "6%",
              width: `${6 + (i % 3) * 4}px`,
              height: `${6 + (i % 3) * 4}px`,
              filter: "blur(0.5px)",
              boxShadow: "0 0 8px rgba(56,189,248,0.7)",
              animation: `wowBubble ${5 + i * 0.8}s ease-in ${i * 0.7}s infinite`,
            }}
          />
        ))}

        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-8 py-16">
          <div className="grid md:grid-cols-4 gap-10">
            <div className="md:col-span-2">
              <BrandLogo size={44} />
              <p className="mt-5 text-sm text-muted-foreground leading-relaxed max-w-md">
                Wages of War Casino — elite night-vision ops gaming. Play-money
                virtual credits for entertainment only. No real-money wagering
                or payouts.
              </p>
              <div className="mt-5 max-w-md">
                <SupportDialog />
              </div>
              <div
                data-testid="footer-hq-contact"
                className="mt-5 space-y-1 font-mono text-[11px] text-muted-foreground"
              >
                <div className="tracking-[0.3em] text-nvg/70 uppercase mb-1">
                  HQ · Contact
                </div>
                <a href="mailto:support@wagesofwarcasino.com" className="block hover:text-nvg transition-colors">
                  support@wagesofwarcasino.com
                </a>
                <a href="mailto:payments@wagesofwarcasino.com" className="block hover:text-nvg transition-colors">
                  payments@wagesofwarcasino.com · vault &amp; payouts
                </a>
                <a href="mailto:compliance@wagesofwarcasino.com" className="block hover:text-nvg transition-colors">
                  compliance@wagesofwarcasino.com · KYC &amp; compliance
                </a>
                <div className="pt-1 text-foreground/80">Wages of War Operations Ltd.</div>
                <div>Registered Office — Malta (MGA licensed)</div>
              </div>
              <div className="mt-5 flex items-center gap-4">
                <img
                  src={BRAND.coin}
                  alt="Nexus Studio Master"
                  className="w-11 h-11 rounded-full ring-1 ring-gold/40 object-cover"
                />
                <div className="font-mono text-[11px] text-muted-foreground leading-tight">
                  <div className="tracking-widest text-nvg/70">POWERED BY</div>
                  <div className="text-foreground">NEXUS STUDIO MASTER</div>
                </div>
                <img
                  src="/brand/award_emblem.png"
                  alt="Award-Winning Platform 2026 · Established 2025"
                  data-testid="award-emblem"
                  className="w-20 h-20 object-contain drop-shadow-[0_0_16px_rgba(212,175,55,0.5)] ml-auto md:ml-4"
                />
              </div>
            </div>

            <div>
              <h4 className="font-stencil tracking-[0.3em] text-nvg text-sm uppercase mb-4">
                Operations
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    to="/lobby"
                    className="hover:text-nvg transition-colors"
                  >
                    Ops Lobby
                  </Link>
                </li>
                <li>
                  <Link to="/vip" className="hover:text-nvg transition-colors">
                    VIP Ranks
                  </Link>
                </li>
                <li>
                  <Link
                    to="/leaderboard"
                    className="hover:text-nvg transition-colors"
                  >
                    Leaderboard
                  </Link>
                </li>
                <li>
                  <Link
                    to="/responsible-gambling"
                    className="hover:text-nvg transition-colors"
                  >
                    Responsible Gaming
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-stencil tracking-[0.3em] text-nvg text-sm uppercase mb-4">
                Legal & Compliance
              </h4>
              <div className="flex items-center gap-2 text-gold mb-3">
                <ShieldCheck size={18} weight="fill" />
                <span className="font-mono text-xs">MGA LICENSED · TYPE 1</span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {LEGAL_LINKS.map(([label, href]) => (
                  <li key={href}>
                    <Link
                      to={href}
                      data-testid={`footer-legal-${href.slice(1)}`}
                      className="hover:text-nvg transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-14 pt-8 border-t border-border flex flex-col md:flex-row items-start justify-between gap-6">
            <div
              data-testid="footer-licence"
              className="font-mono text-[11px] text-muted-foreground leading-relaxed max-w-3xl space-y-0.5"
            >
              <p>
                <span className="text-foreground font-semibold">
                  © 2025 Wages of War Operations Ltd.
                </span>{" "}
                All rights reserved.
              </p>
              <p>
                Licensed and regulated by the Malta Gaming Authority under
                licence number{" "}
                <span className="text-gold">MGA/B2C/912/2025</span>.
              </p>
              <p>
                Gaming Service Licence (Type 1 – Online Casino &amp; Virtual
                Slot Content).
              </p>
              <p>Registered Address: [Registered Address]</p>
              <p>Players must be 18+ to gamble. Please gamble responsibly.</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="border border-alert/60 text-alert font-mono text-xs px-2 py-0.5">
                18+
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                Play responsibly.
              </span>
            </div>
          </div>
        </div>
      </footer>

      <AuthDialog />
      <RankUpBanner />
      <ChatWidget />
      <div className="fx-overlay" aria-hidden="true" />
    </div>
  );
}
