import React, { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { fmt } from "@/data/gameMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Users, Coins, ChartLineUp, Envelope, ShieldCheck, MagnifyingGlass, PencilSimple } from "@phosphor-icons/react";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [players, setPlayers] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [search, setSearch] = useState("");

  const loadPlayers = useCallback((q = "") => api.get(`/admin/players?search=${encodeURIComponent(q)}`).then(({ data }) => setPlayers(data)).catch(() => {}), []);

  useEffect(() => {
    if (user && user.role === "admin") {
      api.get("/admin/stats").then(({ data }) => setStats(data)).catch(() => {});
      loadPlayers();
      api.get("/admin/enquiries").then(({ data }) => setEnquiries(data)).catch(() => {});
    }
  }, [user, loadPlayers]);

  if (user === null) return <div className="p-16 font-mono text-nvg/70">// verifying clearance...</div>;
  if (!user || user.role !== "admin") return <Navigate to="/" replace />;

  const adjust = async (p) => {
    const val = window.prompt(`Adjust balance for ${p.name} (${p.email}).\nEnter a delta (e.g. 5000 or -2000):`, "1000");
    if (val === null) return;
    const amount = Number(val);
    if (Number.isNaN(amount)) { toast.error("Enter a valid number"); return; }
    try {
      const { data } = await api.post(`/admin/players/${p.user_id}/balance`, { amount, mode: "delta" });
      toast.success(`${p.name}: balance now ${fmt(data.balance)}`);
      loadPlayers(search);
    } catch (e) { toast.error(e.response?.data?.detail || "Adjust failed"); }
  };

  const stat = (Icon, label, value) => (
    <div className="hud p-5">
      <Icon size={26} weight="fill" className="text-nvg" />
      <div className="font-display text-3xl tracking-wide text-foreground mt-3">{value}</div>
      <div className="font-mono text-[10px] tracking-widest text-muted-foreground mt-1">{label}</div>
    </div>
  );

  const tabBtn = (id, label) => (
    <button data-testid={`admin-tab-${id}`} onClick={() => setTab(id)}
      className={`font-stencil tracking-widest uppercase text-sm px-4 py-2 border ${tab === id ? "border-gold text-gold bg-gold/10" : "border-border text-muted-foreground hover:text-nvg"}`}>
      {label}
    </button>
  );

  return (
    <div data-testid="admin-root" className="max-w-[1200px] mx-auto px-4 sm:px-8 py-10">
      <div className="flex items-center gap-3 mb-8">
        <ShieldCheck size={34} weight="fill" className="text-gold" />
        <div>
          <p className="font-mono text-xs tracking-[0.4em] text-nvg/70">// HIGH COMMAND</p>
          <h1 className="font-display text-5xl tracking-wide gold-gradient leading-none">ADMIN OPERATIONS</h1>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {tabBtn("overview", "Overview")}
        {tabBtn("players", "Players")}
        {tabBtn("enquiries", "Fleet Enquiries")}
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
          <form onSubmit={(e) => { e.preventDefault(); loadPlayers(search); }} className="flex gap-2 mb-4 max-w-md">
            <Input data-testid="admin-player-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" className="bg-black/40 border-border font-mono" />
            <Button type="submit" className="bg-nvg text-black gap-1"><MagnifyingGlass size={16} weight="bold" /></Button>
          </form>
          <div className="hud divide-y divide-border">
            {players.map((p) => (
              <div key={p.user_id} data-testid={`admin-player-${p.user_id}`} className="flex items-center justify-between px-5 py-3 gap-4">
                <div className="min-w-0">
                  <div className="font-stencil tracking-wide text-foreground truncate">{p.name} {p.role === "admin" && <span className="text-gold text-xs">★ADMIN</span>}</div>
                  <div className="font-mono text-[11px] text-muted-foreground truncate">{p.email} · {p.vip_tier}</div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-mono text-gold">{fmt(p.balance)}</span>
                  <button data-testid={`admin-adjust-${p.user_id}`} onClick={() => adjust(p)} className="flex items-center gap-1 border border-border px-2 py-1 font-mono text-xs hover:border-nvg hover:text-nvg">
                    <PencilSimple size={14} /> ADJUST
                  </button>
                </div>
              </div>
            ))}
            {players.length === 0 && <div className="p-5 font-mono text-sm text-muted-foreground">No players found.</div>}
          </div>
        </div>
      )}

      {tab === "enquiries" && (
        <div className="hud divide-y divide-border">
          {enquiries.map((q) => (
            <div key={q.id} className="px-5 py-4">
              <div className="flex items-center justify-between">
                <span className="font-stencil tracking-wide text-foreground">{q.name} {q.company && <span className="text-muted-foreground text-sm">· {q.company}</span>}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{new Date(q.created_at).toLocaleString()}</span>
              </div>
              <div className="font-mono text-[11px] text-nvg">{q.email}{q.country && ` · ${q.country}`}</div>
              <p className="text-sm text-muted-foreground mt-1">{q.message}</p>
            </div>
          ))}
          {enquiries.length === 0 && <div className="p-5 font-mono text-sm text-muted-foreground">No enquiries yet.</div>}
        </div>
      )}
    </div>
  );
}
