import React, { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { fmt } from "@/data/gameMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Users,
  Coins,
  ChartLineUp,
  Envelope,
  ShieldCheck,
  MagnifyingGlass,
  PencilSimple,
  Vault,
  ArrowDown,
  ArrowUp,
  Check,
  X,
} from "@phosphor-icons/react";
import { ADMINPAY } from "@/constants/testIds";
import OpsAssistanceButton from "@/components/OpsAssistanceButton";
import AdScreen from "@/components/AdScreen";
import UpgradesPanel from "@/components/UpgradesPanel";
import PublishPanel from "@/components/PublishPanel";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [players, setPlayers] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [hqPin, setHqPin] = useState("");
  const [hqUnlocked, setHqUnlocked] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState("");
  const [payTxns, setPayTxns] = useState([]);
  const [paySummary, setPaySummary] = useState(null);
  const [payFilter, setPayFilter] = useState({
    status: "",
    method: "",
    direction: "",
    search: "",
  });

  const loadPayments = useCallback((f = {}) => {
    const qs = new URLSearchParams(
      Object.entries(f).filter(([, v]) => v),
    ).toString();
    api
      .get(`/admin/cashier/transactions?${qs}`)
      .then(({ data }) => setPayTxns(data))
      .catch(() => {});
    api
      .get("/admin/cashier/summary")
      .then(({ data }) => setPaySummary(data))
      .catch(() => {});
  }, []);

  const loadPlayers = useCallback(
    (q = "") =>
      api
        .get(`/admin/players?search=${encodeURIComponent(q)}`)
        .then(({ data }) => setPlayers(data))
        .catch(() => {}),
    [],
  );

  useEffect(() => {
    if (user && user.role === "admin") {
      api
        .get("/admin/stats")
        .then(({ data }) => setStats(data))
        .catch(() => {});
      loadPlayers();
      api
        .get("/admin/enquiries")
        .then(({ data }) => setEnquiries(data))
        .catch(() => {});
      loadPayments();
    }
  }, [user, loadPlayers, loadPayments]);

  if (user === null)
    return (
      <div className="p-16 font-mono text-nvg/70">
        // verifying clearance...
      </div>
    );
  if (!user || user.role !== "admin") return <Navigate to="/" replace />;

  const adjust = async (p) => {
    const val = window.prompt(
      `Adjust balance for ${p.name} (${p.email}).\nEnter a delta (e.g. 5000 or -2000):`,
      "1000",
    );
    if (val === null) return;
    const amount = Number(val);
    if (Number.isNaN(amount)) {
      toast.error("Enter a valid number");
      return;
    }
    try {
      const { data } = await api.post(`/admin/players/${p.user_id}/balance`, {
        amount,
        mode: "delta",
      });
      toast.success(`${p.name}: balance now ${fmt(data.balance)}`);
      loadPlayers(search);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Adjust failed");
    }
  };

  const decideWithdrawal = async (t, action) => {
    if (
      !window.confirm(
        `${action === "approve" ? "Approve & release" : "Reject & refund"} withdrawal of $${t.amount_usd} for ${t.user_name || t.user_email}?`,
      )
    )
      return;
    try {
      await api.post(`/admin/cashier/withdrawals/${t.id}/${action}`);
      toast.success(
        action === "approve"
          ? "Withdrawal approved & released"
          : "Withdrawal rejected & refunded",
      );
      loadPayments(payFilter);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Action failed");
    }
  };

  const unlockHq = async () => {
    if (!hqPin.trim()) return;
    try {
      const { data } = await api.get("/support/tickets", {
        headers: { "X-HQ-Pin": hqPin },
      });
      setTickets(data);
      setHqUnlocked(true);
    } catch (e) {
      toast.error(
        e.response?.status === 403
          ? "Incorrect HQ PIN"
          : "Could not open HQ Inbox",
      );
    }
  };

  const resolveTicket = async (id) => {
    try {
      await api.post(
        `/support/tickets/${id}/resolve`,
        {},
        { headers: { "X-HQ-Pin": hqPin } },
      );
      setTickets((ts) =>
        ts.map((t) => (t.id === id ? { ...t, status: "resolved" } : t)),
      );
      toast.success("Ticket marked resolved");
    } catch (e) {
      toast.error("Could not update ticket");
    }
  };

  const stat = (Icon, label, value) => (
    <div className="hud p-5">
      <Icon size={26} weight="fill" className="text-nvg" />
      <div className="font-display text-3xl tracking-wide text-foreground mt-3">
        {value}
      </div>
      <div className="font-mono text-[10px] tracking-widest text-muted-foreground mt-1">
        {label}
      </div>
    </div>
  );

  const tabBtn = (id, label) => (
    <button
      data-testid={`admin-tab-${id}`}
      onClick={() => setTab(id)}
      className={`font-stencil tracking-widest uppercase text-sm px-4 py-2 border ${tab === id ? "border-gold text-gold bg-gold/10" : "border-border text-muted-foreground hover:text-nvg"}`}
    >
      {label}
    </button>
  );

  return (
    <div
      data-testid="admin-root"
      className="max-w-[1200px] mx-auto px-4 sm:px-8 py-10"
    >
      <div className="flex items-center gap-3 mb-8">
        <ShieldCheck size={34} weight="fill" className="text-gold" />
        <div>
          <p className="font-mono text-xs tracking-[0.4em] text-nvg/70">
            // HIGH COMMAND
          </p>
          <h1 className="font-display text-5xl tracking-wide gold-gradient leading-none">
            ADMIN OPERATIONS
          </h1>
        </div>
      </div>

      <div className="flex gap-4 mb-8">
        <OpsAssistanceButton
          onClick={() =>
            window.alert("Ops Assistance activated — demo UI only.")
          }
        />
        <AdScreen />
      </div>

      <div className="mb-8">
        <UpgradesPanel />
        <PublishPanel />
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {tabBtn("overview", "Overview")}
        {tabBtn("players", "Players")}
        {tabBtn("payments", "Payments")}
        {tabBtn("enquiries", "Fleet Enquiries")}
        {tabBtn("hq", "HQ Inbox")}
      </div>

      {tab === "overview" && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stat(Users, "PLAYERS", fmt(stats.players))}
          {stat(Coins, "CREDITS IN PLAY", fmt(stats.total_balance))}
          {stat(ChartLineUp, "TOTAL WAGERED", fmt(stats.total_wagered))}
          {stat(ChartLineUp, "TOTAL WON", fmt(stats.total_won))}
          {stat(Coins, "GAMES PLAYED", fmt(stats.games_played))}
          {stat(Envelope, "FLEET ENQUIRIES", fmt(stats.enquiries))}
          {stat(Coins, "PAID DEPOSITS", fmt(stats.deposits))}
        </div>
      )}

      {tab === "players" && (
        <div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadPlayers(search);
            }}
            className="flex gap-2 mb-4 max-w-md"
          >
            <Input
              data-testid="admin-player-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email"
              className="bg-black/40 border-border font-mono"
            />
            <Button type="submit" className="bg-nvg text-black gap-1">
              <MagnifyingGlass size={16} weight="bold" />
            </Button>
          </form>
          <div className="hud divide-y divide-border">
            {players.map((p) => (
              <div
                key={p.user_id}
                data-testid={`admin-player-${p.user_id}`}
                className="flex items-center justify-between px-5 py-3 gap-4"
              >
                <div className="min-w-0">
                  <div className="font-stencil tracking-wide text-foreground truncate">
                    {p.name}{" "}
                    {p.role === "admin" && (
                      <span className="text-gold text-xs">★ADMIN</span>
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground truncate">
                    {p.email} · {p.vip_tier}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-mono text-gold">{fmt(p.balance)}</span>
                  <button
                    data-testid={`admin-adjust-${p.user_id}`}
                    onClick={() => adjust(p)}
                    className="flex items-center gap-1 border border-border px-2 py-1 font-mono text-xs hover:border-nvg hover:text-nvg"
                  >
                    <PencilSimple size={14} /> ADJUST
                  </button>
                </div>
              </div>
            ))}
            {players.length === 0 && (
              <div className="p-5 font-mono text-sm text-muted-foreground">
                No players found.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "payments" && (
        <div>
          {paySummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {stat(
                ArrowDown,
                "TOTAL DEPOSITS",
                `$${fmt(paySummary.total_deposits_usd)}`,
              )}
              {stat(
                ArrowUp,
                "TOTAL WITHDRAWALS",
                `$${fmt(paySummary.total_withdrawals_usd)}`,
              )}
              {stat(
                Vault,
                "PLAYER CASH BALANCES",
                `$${fmt(paySummary.total_player_balances_usd)}`,
              )}
              {stat(
                Coins,
                "PENDING WITHDRAWALS",
                fmt(paySummary.pending_withdrawals),
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2 mb-4">
            <Input
              data-testid="admin-pay-search"
              value={payFilter.search}
              onChange={(e) =>
                setPayFilter({ ...payFilter, search: e.target.value })
              }
              placeholder="Search player"
              className="bg-black/40 border-border font-mono max-w-[200px]"
            />
            {["", "deposit", "withdrawal"].map((d) => (
              <button
                key={d || "all-dir"}
                onClick={() => {
                  const f = { ...payFilter, direction: d };
                  setPayFilter(f);
                  loadPayments(f);
                }}
                className={`font-mono text-xs px-3 py-2 border ${payFilter.direction === d ? "border-gold text-gold" : "border-border text-muted-foreground hover:text-nvg"}`}
              >
                {d ? d.toUpperCase() : "ALL"}
              </button>
            ))}
            {["", "pending", "completed", "rejected"].map((s) => (
              <button
                key={s || "all-st"}
                onClick={() => {
                  const f = { ...payFilter, status: s };
                  setPayFilter(f);
                  loadPayments(f);
                }}
                className={`font-mono text-xs px-3 py-2 border ${payFilter.status === s ? "border-nvg text-nvg" : "border-border text-muted-foreground hover:text-nvg"}`}
              >
                {s ? s.toUpperCase() : "ANY STATUS"}
              </button>
            ))}
            <Button
              onClick={() => loadPayments(payFilter)}
              className="bg-nvg text-black gap-1"
            >
              <MagnifyingGlass size={16} weight="bold" />
            </Button>
          </div>
          <div className="hud divide-y divide-border">
            {payTxns.map((t) => (
              <div
                key={t.id}
                data-testid={ADMINPAY.txnRow(t.id)}
                className="flex items-center justify-between px-5 py-3 gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {t.direction === "deposit" ? (
                    <ArrowDown size={18} className="text-nvg shrink-0" />
                  ) : (
                    <ArrowUp size={18} className="text-alert shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-stencil tracking-wide text-foreground truncate">
                      {t.user_name}{" "}
                      <span className="text-muted-foreground text-xs">
                        · {t.method} · {t.currency}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground truncate">
                      {t.user_email} · {new Date(t.created_at).toLocaleString()}
                      {t.destination ? ` · → ${t.destination}` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div
                      className={`font-mono ${t.direction === "deposit" ? "text-nvg" : "text-alert"}`}
                    >
                      {t.direction === "deposit" ? "+" : "−"}$
                      {fmt(t.amount_usd)}
                    </div>
                    <div
                      className={`font-mono text-[10px] ${t.status === "completed" ? "text-nvg" : t.status === "rejected" ? "text-alert" : "text-gold"}`}
                    >
                      {t.status.toUpperCase()}
                    </div>
                  </div>
                  {t.direction === "withdrawal" && t.status === "pending" && (
                    <div className="flex items-center gap-1">
                      <button
                        data-testid={ADMINPAY.approve(t.id)}
                        onClick={() => decideWithdrawal(t, "approve")}
                        title="Approve & release"
                        className="w-8 h-8 flex items-center justify-center border border-nvg/50 text-nvg hover:bg-nvg/10"
                      >
                        <Check size={16} weight="bold" />
                      </button>
                      <button
                        data-testid={ADMINPAY.reject(t.id)}
                        onClick={() => decideWithdrawal(t, "reject")}
                        title="Reject & refund"
                        className="w-8 h-8 flex items-center justify-center border border-alert/50 text-alert hover:bg-alert/10"
                      >
                        <X size={16} weight="bold" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {payTxns.length === 0 && (
              <div className="p-5 font-mono text-sm text-muted-foreground">
                No cashier transactions.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "enquiries" && (
        <div className="hud divide-y divide-border">
          {enquiries.map((q) => (
            <div key={q.id} className="px-5 py-4">
              <div className="flex items-center justify-between">
                <span className="font-stencil tracking-wide text-foreground">
                  {q.name}{" "}
                  {q.company && (
                    <span className="text-muted-foreground text-sm">
                      · {q.company}
                    </span>
                  )}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {new Date(q.created_at).toLocaleString()}
                </span>
              </div>
              <div className="font-mono text-[11px] text-nvg">
                {q.email}
                {q.country && ` · ${q.country}`}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{q.message}</p>
            </div>
          ))}
          {enquiries.length === 0 && (
            <div className="p-5 font-mono text-sm text-muted-foreground">
              No enquiries yet.
            </div>
          )}
        </div>
      )}

      {tab === "hq" && (
        <div>
          {!hqUnlocked ? (
            <div className="hud max-w-sm mx-auto p-6 text-center space-y-4">
              <ShieldCheck size={36} weight="fill" className="text-gold mx-auto" />
              <div>
                <p className="font-display text-2xl gold-gradient tracking-wide">
                  HQ INBOX
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  Enter your HQ PIN to view support messages.
                </p>
              </div>
              <Input
                data-testid="hq-pin-input"
                type="password"
                value={hqPin}
                onChange={(e) => setHqPin(e.target.value)}
                placeholder="HQ PIN"
                className="text-center tracking-[0.4em]"
                onKeyDown={(e) => e.key === "Enter" && unlockHq()}
              />
              <Button
                data-testid="hq-unlock-btn"
                onClick={unlockHq}
                className="w-full bg-gold hover:bg-gold/90 text-black font-display tracking-widest"
              >
                UNLOCK HQ
              </Button>
            </div>
          ) : (
            <div className="hud divide-y divide-border" data-testid="hq-inbox">
              {tickets.map((tk) => (
                <div key={tk.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-stencil tracking-wide text-foreground">
                      {tk.name}
                      <span
                        className={`ml-2 text-[10px] font-mono px-2 py-0.5 ${
                          tk.status === "resolved"
                            ? "bg-nvg/20 text-nvg"
                            : "bg-gold/20 text-gold"
                        }`}
                      >
                        {(tk.status || "open").toUpperCase()}
                      </span>
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {new Date(tk.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-nvg">{tk.email}</div>
                  <p className="text-sm text-foreground/80 mt-1 font-semibold">
                    {tk.subject}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {tk.message}
                  </p>
                  {tk.status !== "resolved" && (
                    <Button
                      data-testid={`hq-resolve-${tk.id}`}
                      onClick={() => resolveTicket(tk.id)}
                      className="mt-2 h-8 bg-nvg hover:bg-nvg/90 text-black font-mono text-xs tracking-widest gap-1"
                    >
                      <Check size={14} weight="bold" /> MARK RESOLVED
                    </Button>
                  )}
                </div>
              ))}
              {tickets.length === 0 && (
                <div className="p-5 font-mono text-sm text-muted-foreground">
                  No support messages yet.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
