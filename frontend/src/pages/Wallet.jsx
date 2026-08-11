import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { fmt, BRAND } from "@/data/gameMeta";
import { WALLET } from "@/constants/testIds";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Coins, Package, Lightning, ArrowUp, ArrowDown, Gift, ShieldCheck } from "@phosphor-icons/react";

const TXN_LABEL = {
  slots: "Slots", keno: "Warhead Keno", coinflip: "Dog-Tag Flip",
  daily_bonus: "Daily Supply Drop", signup_bonus: "Enlistment Bonus", deposit: "Credit Resupply",
};

export default function Wallet() {
  const { user } = useAuth();
  const [packages, setPackages] = useState([]);
  const [txns, setTxns] = useState([]);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    api.get("/payments/packages").then(({ data }) => setPackages(data)).catch(() => {});
    api.get("/wallet/transactions").then(({ data }) => setTxns(data)).catch(() => {});
  }, []);

  const buy = async (pkg) => {
    setBusy(pkg.id);
    try {
      const { data } = await api.post("/payments/checkout", { lookup_key: pkg.lookup_key, origin_url: window.location.origin });
      window.location.href = data.checkout_url;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Checkout failed");
      setBusy(null);
    }
  };

  return (
    <div data-testid={WALLET.root} className="max-w-[1100px] mx-auto px-4 sm:px-8 py-10">
      <div className="hud hud-gold p-6 flex flex-wrap items-center justify-between gap-4 mb-10">
        <div>
          <p className="font-mono text-xs tracking-widest text-nvg/70">OPERATIVE BALANCE</p>
          <div className="flex items-center gap-3 mt-1">
            <Coins size={34} weight="fill" className="text-gold" />
            <span data-testid={WALLET.balance} className="font-mono text-4xl text-gold">{fmt(user?.balance || 0)}</span>
            <span className="font-mono text-sm text-muted-foreground">credits</span>
          </div>
        </div>
        <img src={BRAND.emblem} alt="emblem" className="w-16 h-16 rounded-full ring-1 ring-gold/40 object-cover" />
      </div>

      <div className="mb-6">
        <p className="font-mono text-xs tracking-[0.4em] text-nvg/70">// RESUPPLY DEPOT</p>
        <h2 className="font-display text-4xl tracking-wide text-foreground">CREDIT PACKAGES</h2>
        <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1"><ShieldCheck size={14} className="text-gold" /> Secure Stripe checkout (test mode). Play-money credits — no cash value.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
        {packages.map((p) => {
          const total = p.credits + (p.bonus || 0);
          return (
            <div key={p.id} data-testid={WALLET.pkg(p.id)} className="hud p-6 flex flex-col hover:border-gold/60 transition-colors">
              <div className="flex items-center justify-between">
                <Package size={28} weight="duotone" className="text-nvg" />
                {p.bonus > 0 && <span className="font-mono text-[10px] text-black bg-gold px-2 py-0.5">+{fmt(p.bonus)} BONUS</span>}
              </div>
              <h3 className="font-display text-3xl tracking-wide text-foreground mt-4">{p.name}</h3>
              <div className="font-mono text-2xl text-gold mt-1">{fmt(total)} <span className="text-sm text-muted-foreground">credits</span></div>
              <div className="font-mono text-sm text-muted-foreground mt-1">${(p.amount / 100).toFixed(2)} USD</div>
              <Button
                data-testid={WALLET.buy(p.id)}
                onClick={() => buy(p)}
                disabled={busy === p.id}
                className="mt-5 w-full bg-gold hover:bg-gold/90 text-black font-display text-lg tracking-widest gap-2"
              >
                <Lightning size={18} weight="fill" /> {busy === p.id ? "REDIRECTING..." : "RESUPPLY"}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mb-4">
        <p className="font-mono text-xs tracking-[0.4em] text-nvg/70">// MISSION LOG</p>
        <h2 className="font-display text-4xl tracking-wide text-foreground">TRANSACTION HISTORY</h2>
      </div>
      <div data-testid={WALLET.txn} className="hud divide-y divide-border">
        {txns.length === 0 && <div className="p-6 font-mono text-sm text-muted-foreground">No transactions yet. Deploy into the lobby.</div>}
        {txns.map((t) => {
          const positive = t.amount >= 0;
          return (
            <div key={t.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                {t.type === "daily_bonus" || t.type === "signup_bonus" ? <Gift size={18} className="text-nvg" /> : positive ? <ArrowUp size={18} className="text-nvg" /> : <ArrowDown size={18} className="text-alert" />}
                <div>
                  <div className="font-stencil tracking-wide text-foreground uppercase text-sm">{TXN_LABEL[t.type] || t.type}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                </div>
              </div>
              <div className={`font-mono text-lg ${positive ? "text-nvg" : "text-alert"}`}>{positive ? "+" : ""}{fmt(t.amount)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
