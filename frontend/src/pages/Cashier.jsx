import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { CASHIER } from "@/constants/testIds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Bank,
  CurrencyBtc,
  CreditCard,
  ArrowUp,
  ArrowDown,
  Copy,
  ShieldCheck,
  Vault,
  Warning,
  CircleNotch,
  CheckCircle,
  XCircle,
  Clock,
  IdentificationCard,
} from "@phosphor-icons/react";

const STATUS_STYLE = {
  pending: { c: "text-gold", Icon: Clock, label: "PENDING" },
  processing: { c: "text-gold", Icon: CircleNotch, label: "PROCESSING" },
  completed: { c: "text-nvg", Icon: CheckCircle, label: "COMPLETED" },
  rejected: { c: "text-alert", Icon: XCircle, label: "REJECTED" },
};

export default function Cashier() {
  const { user, refreshUser } = useAuth();
  const [params, setParams] = useSearchParams();
  const [meta, setMeta] = useState(null);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState("fiat");
  const [kyc, setKyc] = useState(null);
  const [kycBusy, setKycBusy] = useState(false);

  // fiat
  const [fiatAmt, setFiatAmt] = useState("50");
  const [fiatCur, setFiatCur] = useState("AUD");
  const [busy, setBusy] = useState(false);
  // crypto
  const [cryptoAmt, setCryptoAmt] = useState("50");
  const [cryptoCur, setCryptoCur] = useState("BTC");
  const [payment, setPayment] = useState(null);
  // withdraw
  const [wdAmt, setWdAmt] = useState("");
  const [wdCur, setWdCur] = useState("AUD");
  const [wdDest, setWdDest] = useState("");

  const load = useCallback(async () => {
    try {
      const [c, s, h, k] = await Promise.all([
        api.get("/cashier/currencies"),
        api.get("/cashier/summary"),
        api.get("/cashier/transactions"),
        api.get("/kyc/status"),
      ]);
      setMeta(c.data);
      setSummary(s.data);
      setHistory(h.data);
      setKyc(k.data);
    } catch (e) {
      console.warn("Cashier data load failed", e);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // handle Stripe Identity redirect (returns with ?kyc=complete)
  useEffect(() => {
    if (params.get("kyc") !== "complete") return;
    toast.message("Verifying your identity…");
    let tries = 0;
    const poll = setInterval(async () => {
      tries += 1;
      try {
        const { data } = await api.get("/kyc/status");
        setKyc(data);
        if (data.kyc_approved) {
          clearInterval(poll);
          toast.success("Identity verified — withdrawals unlocked.");
          await refreshUser();
          setParams({}, { replace: true });
        } else if (data.status === "age_failed") {
          clearInterval(poll);
          toast.error("Verification failed: you must be 18 or older.");
          setParams({}, { replace: true });
        }
      } catch (e) {
        console.warn("KYC status poll failed, retrying", e);
      }
      if (tries > 25) {
        clearInterval(poll);
        setParams({}, { replace: true });
      }
    }, 2000);
    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // handle Stripe redirect confirmation
  useEffect(() => {
    const dep = params.get("deposit");
    const sid = params.get("session_id");
    if (dep === "success" && sid) {
      let tries = 0;
      const poll = setInterval(async () => {
        tries += 1;
        try {
          const { data } = await api.get(`/payments/status/${sid}`);
          if (data.payment_status === "paid") {
            clearInterval(poll);
            toast.success("Deposit confirmed — cash balance credited.");
            await refreshUser();
            await load();
            setParams({}, { replace: true });
          }
        } catch (e) {
          console.warn("Deposit status poll failed, retrying", e);
        }
        if (tries > 20) {
          clearInterval(poll);
          setParams({}, { replace: true });
        }
      }, 1500);
      return () => clearInterval(poll);
    } else if (dep === "cancel") {
      toast.error("Deposit cancelled.");
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const fiats = (meta?.currencies || []).filter((c) => c.type === "FIAT");
  const cryptos = (meta?.currencies || []).filter((c) => c.type === "CRYPTO");
  const bal = summary?.real_balance_usd ?? 0;

  const depositFiat = async () => {
    const amt = Number(fiatAmt);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    setBusy(true);
    try {
      const { data } = await api.post("/cashier/deposit/stripe", {
        currency: fiatCur,
        amount: amt,
        origin_url: window.location.origin,
      });
      window.location.href = data.checkout_url;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Deposit failed");
      setBusy(false);
    }
  };

  const depositCrypto = async () => {
    const amt = Number(cryptoAmt);
    if (!amt || amt <= 0) return toast.error("Enter a valid USD amount");
    setBusy(true);
    setPayment(null);
    try {
      const { data } = await api.post("/cashier/deposit/crypto", {
        pay_currency: cryptoCur,
        amount_usd: amt,
      });
      setPayment(data);
      toast.success(
        `Send exactly ${data.pay_amount} ${data.pay_currency} to the address shown.`,
      );
      load();
    } catch (e) {
      toast.error(
        e.response?.data?.detail || "Could not create crypto payment",
      );
    }
    setBusy(false);
  };

  const withdraw = async () => {
    const amt = Number(wdAmt);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!wdDest || wdDest.length < 4)
      return toast.error("Enter a payout destination");
    setBusy(true);
    try {
      const { data } = await api.post("/cashier/withdraw", {
        currency: wdCur,
        amount: amt,
        destination: wdDest,
      });
      toast.success(
        `Withdrawal requested — status: ${data.status}. Awaiting vault approval.`,
      );
      setWdAmt("");
      setWdDest("");
      await refreshUser();
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Withdrawal failed");
    }
    setBusy(false);
  };

  const copy = (t) => {
    navigator.clipboard?.writeText(t);
    toast.success("Copied");
  };

  const startKyc = async () => {
    setKycBusy(true);
    try {
      const { data } = await api.post("/kyc/session", {
        origin_url: window.location.origin,
      });
      if (data.already_approved) {
        toast.success("Identity already verified.");
        const { data: k } = await api.get("/kyc/status");
        setKyc(k);
        setKycBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not start verification");
      setKycBusy(false);
    }
  };

  const kycApproved = !!kyc?.kyc_approved;
  const kycState = kyc?.status || "not_started";
  const kycMessage = kycApproved
    ? "Verified — real-money withdrawals unlocked."
    : kycState === "processing"
      ? "Processing your documents — this can take a moment."
      : kycState === "age_failed"
        ? "Verification failed: you must be 18 or older to withdraw."
        : kycState === "requires_input"
          ? "Additional input needed — please retry verification."
          : "Required before withdrawing (MGA 18+ identity compliance).";

  const tabBtn = (id, label, Icon, testId) => (
    <button
      data-testid={testId}
      onClick={() => setTab(id)}
      className={`flex-1 flex items-center justify-center gap-2 font-stencil tracking-widest uppercase text-sm py-3 border-b-2 transition-colors ${
        tab === id
          ? "border-gold text-gold"
          : "border-transparent text-muted-foreground hover:text-nvg"
      }`}
    >
      <Icon size={18} weight="fill" /> {label}
    </button>
  );

  const selectCls =
    "w-full bg-black/50 border border-border font-mono text-foreground px-3 py-2 focus:border-gold outline-none";

  return (
    <div
      data-testid={CASHIER.root}
      className="max-w-[1100px] mx-auto px-4 sm:px-8 py-10"
    >
      <div className="flex items-center gap-3 mb-6">
        <Vault size={34} weight="fill" className="text-gold" />
        <div>
          <p className="font-mono text-xs tracking-[0.4em] text-nvg/70">
            // CASHIER VAULT
          </p>
          <h1 className="font-display text-5xl tracking-wide gold-gradient leading-none">
            DEPOSIT &amp; WITHDRAW
          </h1>
        </div>
      </div>

      {summary &&
        (summary.crypto_live || summary.vault_live) &&
        !(summary.crypto_live && summary.vault_live) && (
          <div className="hud border-nvg/50 bg-nvg/5 p-4 mb-6 flex items-start gap-3">
            <ShieldCheck
              size={22}
              weight="fill"
              className="text-nvg shrink-0 mt-0.5"
            />
            <p className="text-sm text-foreground/80">
              <span className="text-nvg font-semibold">DEPOSITS LIVE.</span>{" "}
              Card (Stripe) and crypto (NOWPayments) deposits are connected and
              process real payments.
              {!summary.vault_live &&
                " Withdrawals are released via in-app admin approval until the external approval-vault key is connected."}
            </p>
          </div>
        )}
      {summary && !summary.crypto_live && !summary.vault_live && (
        <div className="hud border-alert/50 bg-alert/5 p-4 mb-6 flex items-start gap-3">
          <Warning
            size={22}
            weight="fill"
            className="text-alert shrink-0 mt-0.5"
          />
          <p className="text-sm text-foreground/80">
            <span className="text-alert font-semibold">SANDBOX MODE.</span>{" "}
            Payment rails are wired with test/placeholder keys. No real funds
            move until live keys are connected.
          </p>
        </div>
      )}

      {/* Balance */}
      <div className="hud hud-gold p-6 flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <p className="font-mono text-xs tracking-widest text-nvg/70">
            CASH BALANCE (withdrawable)
          </p>
          <div className="flex items-center gap-3 mt-1">
            <Bank size={34} weight="fill" className="text-gold" />
            <span
              data-testid={CASHIER.balance}
              className="font-mono text-4xl text-gold"
            >
              $
              {Number(bal).toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </span>
            <span className="font-mono text-sm text-muted-foreground">USD</span>
          </div>
        </div>
        <div className="font-mono text-[11px] text-muted-foreground text-right">
          <div className="flex items-center gap-1 text-nvg justify-end">
            <ShieldCheck size={14} weight="fill" /> MGA/B2C/912/2025
          </div>
          <div>Wages of War Operations Ltd.</div>
          <div>
            Min deposit ${meta?.min_deposit_usd} · Max deposit ${meta?.max_deposit_usd} · Min withdraw ${meta?.min_withdraw_usd ? `$${meta.min_withdraw_usd}` : "$0"} · Max withdraw ${meta?.max_withdraw_usd ? `$${meta.max_withdraw_usd}` : "$0"}
          </div>
        </div>
      </div>

      {/* KYC / Identity Verification */}
      <div
        data-testid={CASHIER.kycCard}
        className={`hud p-5 mb-8 flex flex-wrap items-center justify-between gap-4 ${
          kycApproved
            ? "border-nvg/50 bg-nvg/5"
            : kycState === "age_failed"
              ? "border-alert/50 bg-alert/5"
              : "border-gold/40 bg-gold/5"
        }`}
      >
        <div className="flex items-center gap-3">
          <IdentificationCard
            size={30}
            weight="fill"
            className={
              kycApproved
                ? "text-nvg"
                : kycState === "age_failed"
                  ? "text-alert"
                  : "text-gold"
            }
          />
          <div>
            <p className="font-stencil tracking-widest uppercase text-sm text-foreground">
              Identity Verification (KYC)
            </p>
            <p
              data-testid={CASHIER.kycStatus}
              className="font-mono text-xs text-muted-foreground max-w-md"
            >
              {kycMessage}
            </p>
          </div>
        </div>
        {kycApproved ? (
          <div className="flex items-center gap-2 text-nvg font-mono text-sm">
            <CheckCircle size={18} weight="fill" /> VERIFIED
          </div>
        ) : (
          <Button
            data-testid={CASHIER.kycVerify}
            onClick={startKyc}
            disabled={kycBusy || kycState === "processing"}
            className="bg-gold hover:bg-gold/90 text-black font-display tracking-widest gap-2"
          >
            <ShieldCheck size={18} weight="fill" />{" "}
            {kycBusy
              ? "OPENING…"
              : kycState === "requires_input"
                ? "RETRY VERIFICATION"
                : "VERIFY IDENTITY"}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="hud">
        <div className="flex border-b border-border">
          {tabBtn("fiat", "Card", CreditCard, CASHIER.tabFiat)}
          {tabBtn("crypto", "Crypto", CurrencyBtc, CASHIER.tabCrypto)}
          {tabBtn("withdraw", "Withdraw", ArrowUp, CASHIER.tabWithdraw)}
        </div>

        <div className="p-6">
          {tab === "fiat" && (
            <div className="max-w-md space-y-4">
              <p className="text-sm text-muted-foreground">
                Secure Stripe card checkout. Supports USD, EUR, GBP &amp; AUD.
              </p>
              <div>
                <label className="font-mono text-xs tracking-widest text-nvg/70">
                  AMOUNT
                </label>
                <Input
                  data-testid={CASHIER.fiatAmount}
                  type="number"
                  min="1"
                  value={fiatAmt}
                  onChange={(e) => setFiatAmt(e.target.value)}
                  className="bg-black/50 border-border font-mono text-lg mt-1"
                />
              </div>
              <div>
                <label className="font-mono text-xs tracking-widest text-nvg/70">
                  CURRENCY
                </label>
                <select
                  data-testid={CASHIER.fiatCurrency}
                  value={fiatCur}
                  onChange={(e) => setFiatCur(e.target.value)}
                  className={`${selectCls} mt-1`}
                >
                  {fiats.map((c) => (
                    <option key={c.code} value={c.code}>
                      {`${c.symbol} ${c.code} — ${c.name}`}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                data-testid={CASHIER.fiatSubmit}
                onClick={depositFiat}
                disabled={busy}
                className="w-full bg-gold hover:bg-gold/90 text-black font-display text-lg tracking-widest gap-2"
              >
                <CreditCard size={18} weight="fill" />{" "}
                {busy ? "REDIRECTING..." : "DEPOSIT VIA CARD"}
              </Button>
            </div>
          )}

          {tab === "crypto" && (
            <div className="grid md:grid-cols-2 gap-8">
              <div className="max-w-md space-y-4">
                <p className="text-sm text-muted-foreground">
                  Crypto deposit via NOWPayments. Enter a USD amount, pick a
                  coin.
                </p>
                <div>
                  <label className="font-mono text-xs tracking-widest text-nvg/70">
                    AMOUNT (USD)
                  </label>
                  <Input
                    data-testid={CASHIER.cryptoAmount}
                    type="number"
                    min="1"
                    value={cryptoAmt}
                    onChange={(e) => setCryptoAmt(e.target.value)}
                    className="bg-black/50 border-border font-mono text-lg mt-1"
                  />
                </div>
                <div>
                  <label className="font-mono text-xs tracking-widest text-nvg/70">
                    COIN
                  </label>
                  <select
                    data-testid={CASHIER.cryptoCurrency}
                    value={cryptoCur}
                    onChange={(e) => setCryptoCur(e.target.value)}
                    className={`${selectCls} mt-1`}
                  >
                    {cryptos.map((c) => (
                      <option key={c.code} value={c.code}>
                        {`${c.symbol} ${c.code} — ${c.name}`}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  data-testid={CASHIER.cryptoSubmit}
                  onClick={depositCrypto}
                  disabled={busy}
                  className="w-full bg-nvg hover:bg-nvg/90 text-black font-display text-lg tracking-widest gap-2"
                >
                  <CurrencyBtc size={18} weight="fill" />{" "}
                  {busy ? "CREATING..." : "GENERATE ADDRESS"}
                </Button>
              </div>

              {payment && (
                <div className="hud p-5 flex flex-col items-center text-center gap-3">
                  <p className="font-mono text-xs tracking-widest text-nvg/70">
                    SEND EXACTLY
                  </p>
                  <p className="font-display text-3xl gold-gradient">
                    {payment.pay_amount} {payment.pay_currency}
                  </p>
                  <div
                    data-testid={CASHIER.cryptoQr}
                    className="bg-white p-3 rounded"
                  >
                    <QRCodeSVG value={payment.pay_address || ""} size={168} />
                  </div>
                  <div className="w-full">
                    <p className="font-mono text-[10px] text-muted-foreground">
                      DEPOSIT ADDRESS
                    </p>
                    <button
                      onClick={() => copy(payment.pay_address)}
                      data-testid={CASHIER.cryptoAddress}
                      className="w-full break-all font-mono text-xs text-foreground border border-border px-3 py-2 hover:border-gold flex items-center gap-2 justify-center"
                    >
                      <Copy size={14} /> {payment.pay_address}
                    </button>
                  </div>
                  {payment.sandbox && (
                    <p className="font-mono text-[10px] text-alert">
                      SANDBOX ADDRESS — credits on live NOWPayments IPN
                      confirmation.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "withdraw" && (
            <div className="max-w-md space-y-4">
              {!kycApproved && (
                <div className="hud border-gold/40 bg-gold/5 p-4 flex items-start gap-3">
                  <ShieldCheck
                    size={22}
                    weight="fill"
                    className="text-gold shrink-0 mt-0.5"
                  />
                  <div className="space-y-2">
                    <p className="text-sm text-foreground/80">
                      <span className="text-gold font-semibold">
                        VERIFICATION REQUIRED.
                      </span>{" "}
                      Complete identity &amp; age (18+) verification before
                      requesting a withdrawal.
                    </p>
                    <Button
                      data-testid="cashier-wd-kyc-verify"
                      onClick={startKyc}
                      disabled={kycBusy || kycState === "processing"}
                      className="bg-gold hover:bg-gold/90 text-black font-display tracking-widest gap-2"
                    >
                      <ShieldCheck size={16} weight="fill" />{" "}
                      {kycBusy ? "OPENING…" : "VERIFY IDENTITY"}
                    </Button>
                  </div>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Withdrawals route through the approval vault. Funds release
                after approval.
              </p>
              <div>
                <label className="font-mono text-xs tracking-widest text-nvg/70">
                  AMOUNT
                </label>
                <Input
                  data-testid={CASHIER.wdAmount}
                  type="number"
                  min="1"
                  value={wdAmt}
                  onChange={(e) => setWdAmt(e.target.value)}
                  placeholder="0.00"
                  className="bg-black/50 border-border font-mono text-lg mt-1"
                />
              </div>
              <div>
                <label className="font-mono text-xs tracking-widest text-nvg/70">
                  CURRENCY
                </label>
                <select
                  data-testid={CASHIER.wdCurrency}
                  value={wdCur}
                  onChange={(e) => setWdCur(e.target.value)}
                  className={`${selectCls} mt-1`}
                >
                  {(meta?.currencies || []).map((c) => (
                    <option key={c.code} value={c.code}>
                      {`${c.symbol} ${c.code} — ${c.name}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-mono text-xs tracking-widest text-nvg/70">
                  PAYOUT DESTINATION (wallet address / bank ref)
                </label>
                <Input
                  data-testid={CASHIER.wdDestination}
                  value={wdDest}
                  onChange={(e) => setWdDest(e.target.value)}
                  placeholder="Destination address or account"
                  className="bg-black/50 border-border font-mono mt-1"
                />
              </div>
              <Button
                data-testid={CASHIER.wdSubmit}
                onClick={withdraw}
                disabled={busy || !kycApproved}
                className="w-full bg-alert hover:bg-alert/90 text-black font-display text-lg tracking-widest gap-2 disabled:opacity-50"
              >
                <ArrowUp size={18} weight="fill" />{" "}
                {busy
                  ? "SUBMITTING..."
                  : !kycApproved
                    ? "VERIFY IDENTITY TO WITHDRAW"
                    : "REQUEST WITHDRAWAL"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div className="mt-10 mb-4">
        <p className="font-mono text-xs tracking-[0.4em] text-nvg/70">
          // LEDGER
        </p>
        <h2 className="font-display text-4xl tracking-wide text-foreground">
          TRANSACTION HISTORY
        </h2>
      </div>
      <div data-testid={CASHIER.history} className="hud divide-y divide-border">
        {history.length === 0 && (
          <div className="p-6 font-mono text-sm text-muted-foreground">
            No cashier activity yet.
          </div>
        )}
        {history.map((t) => {
          const st = STATUS_STYLE[t.status] || STATUS_STYLE.pending;
          const isDep = t.direction === "deposit";
          return (
            <div
              key={t.id}
              className="flex items-center justify-between px-5 py-3 gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                {isDep ? (
                  <ArrowDown size={18} className="text-nvg shrink-0" />
                ) : (
                  <ArrowUp size={18} className="text-alert shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="font-stencil tracking-wide text-foreground uppercase text-sm truncate">
                    {isDep ? "Deposit" : "Withdrawal"} · {t.method} ·{" "}
                    {t.currency}
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {new Date(t.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div
                  className={`font-mono text-lg ${isDep ? "text-nvg" : "text-alert"}`}
                >
                  {isDep ? "+" : "−"}$
                  {Number(t.amount_usd).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <div
                  className={`flex items-center gap-1 justify-end font-mono text-[10px] ${st.c}`}
                >
                  <st.Icon size={11} weight="fill" /> {st.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
