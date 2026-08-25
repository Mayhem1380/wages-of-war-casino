import React from "react";
import { useNavigate } from "react-router-dom";
import {
  SquaresFour,
  Cube,
  Target,
  Coins,
  CircleNotch,
  Trophy,
  Crown,
  Wallet,
  UserCircle,
  IdentificationCard,
  Rocket,
  Heartbeat,
  House,
  ShieldCheck,
} from "@phosphor-icons/react";

// Single launchpad linking every player screen and operator tool in one place.
const SECTIONS = [
  {
    label: "Games",
    items: [
      { icon: House, name: "Main Lobby", desc: "All games", to: "/lobby" },
      { icon: Cube, name: "Slots", desc: "40+ machines", to: "/lobby#slots" },
      { icon: Target, name: "Keno", desc: "Live draw board", to: "/keno" },
      { icon: Coins, name: "Coin Flip", desc: "Heads or tails", to: "/coinflip" },
      { icon: CircleNotch, name: "Daily Wheel", desc: "Free spin", to: "/wheel" },
      { icon: Trophy, name: "Tournaments", desc: "Compete live", to: "/tournament" },
      { icon: SquaresFour, name: "Leaderboard", desc: "Top operators", to: "/leaderboard" },
      { icon: Crown, name: "VIP Club", desc: "Ranks & perks", to: "/vip" },
    ],
  },
  {
    label: "Account & Cashier",
    items: [
      { icon: Wallet, name: "Cashier / Wallet", desc: "Deposit & cash out", to: "/wallet" },
      { icon: UserCircle, name: "Profile", desc: "Account settings", to: "/profile" },
      { icon: IdentificationCard, name: "KYC Verification", desc: "Identity checks", to: "/kyc" },
      { icon: Heartbeat, name: "Responsible Gaming", desc: "Limits & tools", to: "/responsible-gaming" },
    ],
  },
  {
    label: "Operator (B2B)",
    items: [
      { icon: Rocket, name: "Fleet Sales", desc: "Platform licensing", to: "/fleet-sales" },
      { icon: ShieldCheck, name: "Admin Operations", desc: "This console", to: "/admin" },
    ],
  },
];

export default function CommandHub() {
  const navigate = useNavigate();

  const go = (to) => {
    const [path, hash] = to.split("#");
    navigate(path);
    if (hash) {
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  };

  return (
    <div data-testid="command-hub" className="space-y-8">
      <p className="font-mono text-xs tracking-[0.35em] text-nvg/70">
        // COMMAND HUB — QUICK ACCESS TO ALL PLATFORMS
      </p>
      {SECTIONS.map((section) => (
        <div key={section.label} data-testid={`hub-section-${section.label.toLowerCase().replace(/[^a-z]/g, "-")}`}>
          <div className="font-stencil tracking-widest uppercase text-sm text-gold/80 mb-3">
            {section.label}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  data-testid={`hub-link-${item.name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/(^-|-$)/g, "")}`}
                  onClick={() => go(item.to)}
                  className="group flex flex-col items-start gap-3 border border-border bg-black/40 backdrop-blur-sm p-4 text-left hover:border-gold/70 hover:bg-gold/[0.06] transition-colors"
                >
                  <Icon
                    size={26}
                    weight="duotone"
                    className="text-nvg group-hover:text-gold transition-colors"
                  />
                  <div className="min-w-0">
                    <div className="font-stencil tracking-wide uppercase text-sm text-foreground truncate">
                      {item.name}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground truncate">
                      {item.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
