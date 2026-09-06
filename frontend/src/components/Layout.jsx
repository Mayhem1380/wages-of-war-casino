import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useSound } from "@/context/SoundContext";
import { BrandLogo } from "@/components/BrandLogo";
import CombatBackground from "@/components/CombatBackground";
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
  List as ListIcon,
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
      <div aria-hidden="true" className="tactical-targets">
        <span className="target-point target-one" />
        <span className="target-point target-two" />
        <span className="target-point target-three" />
        <span className="target-point target-four" />
        <span className="target-point target-five" />
      </div>
      {/* War-zone combat scene (muzzle flashes) — shown on entry for everyone */}
      <CombatBackground />
      <a
        href="https://gaming-fleet-hq.preview.emergentagent.com"
        target="_blank"
        rel="noopener noreferrer"
        data-testid="nexus-top-banner"
        className="relative z-50 block w-full bg-gradient-to-r from-[#11130d] via-[#0c1b10] to-[#11130d] border-b border-gold/40 py-1.5 text-center font-mono text-[11px] tracking-[0.32em] text-gold hover:text-nvg transition-colors"
      >
        ⚡ NEXUS · EXPLORE THE FULL GAMING FLEET HQ →
      </a>
      <header className="sticky top-0 z-50 border-b border-gold/20 bg-[#070a07]/90 backdrop-blur-xl shadow-[0_12px_50px_rgba(0,0,0,0.32)]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/" data-testid={NAV.logo}>
            <BrandLogo size={38} subtitle={false} />
          </Link>

          <nav className="hidden lg:flex items-center gap-6">
            {navLink("/lobby", "Ops Lobby", NAV.lobby, GameController)}
            {navLink("/leaderboard", "Leaderboard", NAV.leaderboard, Trophy)}
            {navLink("/wallet", "Wallet", NAV.wallet, WalletIcon)}
            {navLink("/kyc", "KYC", NAV.kyc, ShieldCheck)}
            {navLink("/vip", "VIP Ranks", NAV.vip, Medal)}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <MuteToggle />
            {user ? (
              <>
                <span className="hidden sm:inline-flex">
                  <VerifyBonusButton />
                </span>
                <DailyBonus />
                <Link
                  to="/wallet"
                  data-testid={NAV.balance}
                  className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 border border-gold/40 bg-gradient-to-r from-[#120f07] to-[#090b09] text-gold font-mono text-xs sm:text-sm shadow-[0_0_20px_rgba(212,175,55,0.08)]"
                >
                  <Coins size={16} weight="fill" />
                  <span data-testid="balance-value">{fmt(user.balance)}</span>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild data-testid={NAV.userMenu}>
                    <button className="flex items-center gap-2 outline-none rounded-full border border-gold/20 bg-black/30 p-1.5 hover:border-gold/40 transition-colors">
                      {user.picture ? (
                        <img
                          src={user.picture}
                          alt="me"
                          className="w-9 h-9 rounded-full ring-1 ring-gold/30 object-cover"
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
                      onClick={() => navigate("/lobby")}
                      className="font-mono text-sm gap-2 cursor-pointer lg:hidden"
                    >
                      <GameController size={16} /> Ops Lobby
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate("/vip")}
                      className="font-mono text-sm gap-2 cursor-pointer lg:hidden"
                    >
                      <Medal size={16} /> VIP Ranks
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate("/leaderboard")}
                      className="font-mono text-sm gap-2 cursor-pointer lg:hidden"
                    >
                      <Trophy size={16} /> Leaderboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border lg:hidden" />
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      data-testid="nav-mobile-menu"
                      aria-label="Menu"
                      className="lg:hidden flex items-center justify-center w-9 h-9 text-nvg hover:text-gold outline-none"
                    >
                      <ListIcon size={24} weight="bold" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="bg-[#0a0d0a] border-gold/30 w-48"
                  >
                    <DropdownMenuItem
                      onClick={() => navigate("/lobby")}
                      className="font-mono text-sm gap-2 cursor-pointer"
                    >
                      <GameController size={16} /> Ops Lobby
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate("/vip")}
                      className="font-mono text-sm gap-2 cursor-pointer"
                    >
                      <Medal size={16} /> VIP Ranks
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate("/leaderboard")}
                      className="font-mono text-sm gap-2 cursor-pointer"
                    >
                      <Trophy size={16} /> Leaderboard
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  data-testid={NAV.loginBtn}
                  variant="ghost"
                  onClick={() => openAuth("login")}
                  className="hidden sm:inline-flex font-stencil tracking-widest uppercase text-foreground/80 hover:text-nvg hover:bg-transparent"
                >
                  Login
                </Button>
                <Button
                  data-testid={NAV.enlistBtn}
                  className="bg-gold hover:bg-gold/90 text-black font-display text-sm sm:text-base tracking-widest px-4 sm:px-5 glow-gold"
                >
                  ENLIST
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Announcement banner */}
      <div className="w-full bg-gradient-to-r from-gold/90 via-gold/70 to-yellow-400 text-black font-display text-xs sm:text-sm tracking-wide py-2 text-center z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
          <strong className="uppercase">Best Platform of 2026</strong>
          <span className="hidden sm:inline ml-3">
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
          className="absolute inset-0 pointer-events-none opacity-90"
          style={{
            backgroundImage: `url(${BRAND.footerUnderwater})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(1,8,12,0.35), rgba(0,0,0,0.85) 80%)",
          }}
          aria-hidden="true"
        />

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
