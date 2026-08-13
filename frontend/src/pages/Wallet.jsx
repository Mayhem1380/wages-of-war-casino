import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { fmt, BRAND } from "@/data/gameMeta";
import { WALLET } from "@/constants/testIds";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Coins, Package, Lightning, ArrowUp, ArrowDown, Gift, ShieldCheck, Percent } from "@phosphor-icons/react";

const TXN_LABEL = {
  slots: "Slots", keno: "Warhead Keno", coinflip: "Dog-Tag Flip",
  daily_bonus: "Daily Supply Drop", signup_bonus: "Enlistment Bonus", deposit: "Credit Resupply",
  free_spin: "Free Fire Spin", cashback: "VIP Cashback",
};

export default function Wallet() {
  const { user, refreshUser } = useAuth();
  const [packages, setPackages] = useState([]);
  const [txns, setTxns] = useState([]);
  const [busy, setBusy] = useState(null);
  const [cashback, setCashback] = useState(null);
  const [cashbackLog, setCashbackLog] = useState([]);
  const [claiming, setClaiming] = useState(false);

  const loadCashback = () => api.get("/cashback/status").then(({ data }) => setCashback(data)).catch(() => {});
  const loadCashbackLog = () => api.get("/cashback/history").then(({ data }) => setCashbackLog(data)).catch(() => {});

  useEffect(() => {
    api.get("/payments/packages").then(({ data }) => setPackages(data)).catch(() => {});
    api.get("/wallet/transactions").then(({ data }) => setTxns(data)).catch(() => {});
    loadCashback();
    loadCashbackLog();
  }, []);

  const claimCashback = async () => {
    setClaiming(true);
    try {
      const { data } = await api.post("/cashback/claim");
      toast.success(`VIP cashback secured — +${fmt(data.claimed)} credits`);
      await refreshUser();
      await loadCashback();
      loadCashbackLog();
      api.get("/wallet/transactions").then(({ data }) => setTxns(data)).catch(() => {});
    } catch (e) {
      toast.error(e.response?.data?.detail || "Cashback not ready");
    }
    setClaiming(false);
  };

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

      {cashback && cashback.percent > 0 && (
        <div data-testid={WALLET.cashback} className="hud p-6 flex flex-wrap items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-4">
            <Percent size={30} weight="fill" className="text-nvg" />
            <div>
              <p className="font-mono text-xs tracking-widest text-nvg/70">{cashback.tier} WEEKLY CASHBACK · {cashback.percent}%</p>
              <div className="font-display text-3xl tracking-wide text-foreground leading-none mt-1">
                {cashback.available ? <span className="gold-gradient">+{fmt(cashback.amount)} READY</span> : <span className="text-muted-foreground">Accruing…</span>}
              </div>
              <p className="font-mono text-[11px] text-muted-foreground mt-1">
                {cashback.available ? "Cashback on your weekly net losses is ready to bank." :
                  cashback.seconds_left > 0 ? `Next payout in ${Math.ceil(cashback.seconds_left / 3600)}h` : "Play more to accrue cashback on net losses."}
              </p>
            </div>
          </div>
          <Button
            data-testid={WALLET.cashbackClaim}
            onClick={claimCashback}
            disabled={!cashback.available || claiming}
            className="bg-nvg hover:bg-nvg/90 text-black font-display text-lg tracking-widest px-6 glow-nvg disabled:opacity-50"
          >
            {claiming ? "CLAIMING..." : "CLAIM CASHBACK"}
          </Button>
        </div>
      )}

      {cashbackLog.length > 0 && (
        <div data-testid="wallet-cashback-log" className="mb-10">
          <div className="mb-3">
            <p className="font-mono text-xs tracking-[0.4em] text-nvg/70">// CASHBACK LEDGER</p>
            <h2 className="font-display text-3xl tracking-wide text-foreground">WEEKLY CASHBACK HISTORY</h2>
          </div>
          <div className="hud divide-y divide-border">
            {cashbackLog.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <Percent size={18} weight="fill" className="text-nvg" />
                  <div>
                    <div className="font-stencil tracking-wide text-foreground uppercase text-sm">
                      {c.meta?.tier || "VIP"} Cashback{c.meta?.percent ? ` · ${c.meta.percent}%` : ""}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString()}</div>
                  </div>
                </div>
                <div className="font-mono text-lg text-nvg">+{fmt(c.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

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
