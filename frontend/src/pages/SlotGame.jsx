import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { SymbolTile } from "@/components/SymbolTile";
import { MACHINE_ART, fmt } from "@/data/gameMeta";
import { SLOT } from "@/constants/testIds";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sfx } from "@/lib/sounds";
import { BigWinOverlay } from "@/components/BigWinOverlay";
import { Lightning, Minus, Plus, ArrowLeft, Coins, Info, Sparkle, Target } from "@phosphor-icons/react";

const MIN_BET = 20;
const MAX_BET = 100000;

export default function SlotGame() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser, openAuth } = useAuth();
  const [machine, setMachine] = useState(null);
  const [grid, setGrid] = useState([[], [], [], [], []]);
  const [bet, setBet] = useState(100);
  const [spinning, setSpinning] = useState(false);
  const [reelStop, setReelStop] = useState([false, false, false, false, false]);
  const [winCells, setWinCells] = useState(new Set());
  const [lastWin, setLastWin] = useState(0);
  const [free, setFree] = useState(null); // {active, spinsLeft, multiplier, total, done, sessionId}
  const [bigWin, setBigWin] = useState(null); // {win, multiplier}
  const [shake, setShake] = useState(false);
  const spinRef = useRef();
  const machineRef = useRef(null);

  const art = MACHINE_ART[id] || { accent: "#4EE44E" };
  const randSym = useCallback((syms) => syms[Math.floor(Math.random() * syms.length)], []);

  useEffect(() => {
    let alive = true;
    api.get(`/games/slots/${id}`).then(({ data }) => {
      if (!alive) return;
      setMachine(data);
      machineRef.current = data;
      setGrid(Array.from({ length: 5 }, () =>
        Array.from({ length: 3 }, () => data.symbols[Math.floor(Math.random() * data.symbols.length)])
      ));
    }).catch(() => navigate("/lobby"));
    return () => { alive = false; clearInterval(spinRef.current); };
  }, [id, navigate]);

  const highlight = (data) => {
    const cells = new Set();
    (data.line_wins || []).forEach((lw) => lw.positions.forEach(([r, c]) => cells.add(`${r}-${c}`)));
    (data.scatter_positions || []).forEach(([r, c]) => cells.add(`${r}-${c}`));
    setWinCells(cells);
  };

  const animateReels = (finalGrid, onDone) => {
    const m = machineRef.current;
    setWinCells(new Set());
    setReelStop([false, false, false, false, false]);
    sfx.spin();
    clearInterval(spinRef.current);
    spinRef.current = setInterval(() => {
      setGrid((prev) => prev.map((col) => col.map(() => randSym(m.symbols))));
    }, 70);
    setTimeout(() => {
      clearInterval(spinRef.current);
      finalGrid.forEach((col, reel) => {
        setTimeout(() => {
          setGrid((prev) => prev.map((c, r) => (r === reel ? col : c)));
          setReelStop((prev) => prev.map((v, r) => (r === reel ? true : v)));
          sfx.reelStop();
          if (reel === 4) setTimeout(onDone, 150);
        }, reel * 150);
      });
    }, 500);
  };

  const doSpin = async () => {
    if (!user) { openAuth("register"); return; }
    if (spinning || (free && free.active) || !machine) return;
    if (user.balance < bet) { toast.error("Insufficient credits — resupply at the wallet."); return; }
    sfx.prime();
    setSpinning(true);
    setLastWin(0);
    try {
      const { data } = await api.post("/games/slots/spin", { machine_id: id, bet });
      animateReels(data.grid, () => finalizePaid(data));
    } catch (e) {
      clearInterval(spinRef.current);
      setSpinning(false);
      toast.error(e.response?.data?.detail || "Spin failed");
    }
  };

  const triggerNearMiss = (data) => {
    if (data.scatter_count === 2) {
      sfx.nearMiss();
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  const finalizePaid = (data) => {
    highlight(data);
    setLastWin(data.total_win);
    setSpinning(false);
    refreshUser();
    triggerNearMiss(data);
    if (data.total_win >= bet * 15) sfx.bigWin();
    else if (data.total_win > 0) sfx.win();
    if (data.total_win >= bet * 50) setBigWin({ win: data.total_win, multiplier: 1 });
    if (data.total_win > 0) toast.success(`WIN +${fmt(data.total_win)} credits`);
    if (data.free_session) {
      sfx.scatter();
      toast.success(`★ SCATTER! ${data.free_session.spins_left} FREE SPINS INBOUND`);
      setFree({ active: true, spinsLeft: data.free_session.spins_left, multiplier: 1, total: 0, done: false, sessionId: data.free_session.session_id });
      setTimeout(() => runFree(data.free_session.session_id), 1400);
    }
  };

  const runFree = async (sessionId) => {
    try {
      const { data } = await api.post("/games/slots/freespin", { session_id: sessionId });
      animateReels(data.grid, () => {
        highlight(data);
        setLastWin(data.win);
        setFree((f) => ({ ...f, spinsLeft: data.spins_left, multiplier: data.next_multiplier, total: data.total_session_win, done: !data.active }));
        if (data.win >= machineRef.current.paylines * 5) sfx.bigWin();
        else if (data.win > 0) sfx.win();
        if (data.win >= bet * 50) setBigWin({ win: data.win, multiplier: data.multiplier });
        if (data.retrigger) { sfx.scatter(); toast.success("★ RETRIGGER +5 SPINS"); }
        else triggerNearMiss(data);
        refreshUser();
        if (data.active) setTimeout(() => runFree(sessionId), 950);
      });
    } catch (e) {
      toast.error(e.response?.data?.detail || "Free spin failed");
      setFree((f) => (f ? { ...f, done: true } : f));
    }
  };

  const collectFree = () => {
    const total = free?.total || 0;
    sfx.coin();
    setFree(null);
    setLastWin(0);
    setWinCells(new Set());
    refreshUser();
    toast.success(`FREE FIRE COMPLETE — banked +${fmt(total)} credits`);
  };

  const changeBet = (delta) => setBet((b) => Math.max(MIN_BET, Math.min(MAX_BET, b + delta)));

  if (!machine) return <div className="max-w-6xl mx-auto p-16 font-mono text-nvg/70">// loading machine...</div>;

  const inFree = free && free.active;

  return (
    <div data-testid={SLOT.root} className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
      {bigWin && <BigWinOverlay win={bigWin.win} multiplier={bigWin.multiplier} onDone={() => setBigWin(null)} />}
      <button onClick={() => navigate("/lobby")} className="flex items-center gap-2 text-muted-foreground hover:text-nvg font-mono text-sm mb-6">
        <ArrowLeft size={16} /> RETURN TO LOBBY
      </button>

      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="font-mono text-xs tracking-[0.4em]" style={{ color: art.accent }}>// {machine.volatility.toUpperCase()} VOLATILITY • {machine.paylines} LINES</p>
          <h1 className="font-display text-5xl tracking-wide gold-gradient">{machine.name}</h1>
          <p className="text-muted-foreground">{machine.tagline}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 hud hud-gold">
          <Coins size={18} weight="fill" className="text-gold" />
          <span data-testid={SLOT.balance} className="font-mono text-lg text-gold">{fmt(user?.balance || 0)}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        {/* REELS */}
        <div className={`hud p-4 sm:p-6 relative overflow-hidden ${shake ? "animate-shake" : ""}`} style={{ background: "#060906" }}>
          {/* FREE SPINS BANNER */}
          {free && (
            <div data-testid={SLOT.freeOverlay} className="absolute inset-x-0 top-0 z-20 bg-black/85 border-b-2 border-gold px-5 py-3 flex items-center justify-between animate-pop">
              <div className="flex items-center gap-3">
                <Sparkle size={26} weight="fill" className="text-gold animate-flicker" />
                <div className="leading-none">
                  <div className="font-display text-2xl tracking-widest gold-gradient">FREE FIRE</div>
                  <div className="font-mono text-[10px] text-nvg tracking-widest">RISING MULTIPLIER ENGAGED</div>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <div className="text-center">
                  <div data-testid={SLOT.freeSpinsLeft} className="font-mono text-2xl text-nvg leading-none">{free.spinsLeft}</div>
                  <div className="font-mono text-[9px] text-muted-foreground tracking-widest">SPINS</div>
                </div>
                <div className="text-center">
                  <div data-testid={SLOT.freeMultiplier} className="font-display text-3xl leading-none gold-gradient">×{free.multiplier}</div>
                  <div className="font-mono text-[9px] text-muted-foreground tracking-widest">MULTI</div>
                </div>
                <div className="text-center">
                  <div data-testid={SLOT.freeWin} className="font-mono text-2xl text-gold leading-none">{fmt(free.total)}</div>
                  <div className="font-mono text-[9px] text-muted-foreground tracking-widest">WON</div>
                </div>
              </div>
            </div>
          )}

          <div
            data-testid={SLOT.grid}
            className={`grid grid-cols-5 gap-2 sm:gap-3 ${free ? "mt-16" : ""}`}
            style={{ background: "linear-gradient(180deg, #0a120a, #060906)" }}
          >
            {grid.map((col, reel) => (
              <div key={reel} className="flex flex-col gap-2 sm:gap-3">
                {col.map((sym, row) => {
                  const hl = winCells.has(`${reel}-${row}`);
                  const isSpin = (spinning || inFree) && !reelStop[reel];
                  return (
                    <div
                      key={row}
                      data-testid={SLOT.cell(reel, row)}
                      className={`aspect-square flex items-center justify-center border transition-all duration-150 ${
                        hl ? "border-gold bg-gold/10 glow-gold" : "border-border bg-black/40"
                      } ${isSpin ? "opacity-80 blur-[1px]" : ""}`}
                    >
                      <div className={hl ? "animate-pop" : ""}>
                        <SymbolTile id={sym} size={46} highlighted={hl} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <div className="font-mono text-xs text-muted-foreground tracking-widest">LAST PAYOUT</div>
            <div data-testid={SLOT.win} className={`font-display text-4xl tracking-wide ${lastWin > 0 ? "gold-gradient animate-pop" : "text-muted-foreground"}`}>
              {lastWin > 0 ? `+${fmt(lastWin)}` : "0"}
            </div>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="space-y-4">
          <div className="hud p-5">
            <p className="font-mono text-[10px] tracking-widest text-nvg/70 mb-2">STAKE / SPIN</p>
            <div className="flex items-center gap-2">
              <button data-testid={SLOT.betDec} onClick={() => changeBet(-20)} disabled={inFree} className="w-10 h-10 border border-border hover:border-nvg text-nvg flex items-center justify-center disabled:opacity-40">
                <Minus size={16} weight="bold" />
              </button>
              <input
                data-testid={SLOT.betInput}
                type="number"
                value={bet}
                disabled={inFree}
                onChange={(e) => setBet(Math.max(MIN_BET, Math.min(MAX_BET, Number(e.target.value) || MIN_BET)))}
                className="flex-1 bg-black/50 border border-border text-center font-mono text-lg text-gold py-2 outline-none focus:border-gold disabled:opacity-50"
              />
              <button data-testid={SLOT.betInc} onClick={() => changeBet(20)} disabled={inFree} className="w-10 h-10 border border-border hover:border-nvg text-nvg flex items-center justify-center disabled:opacity-40">
                <Plus size={16} weight="bold" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[100, 500, 2000].map((v) => (
                <button key={v} onClick={() => setBet(v)} disabled={inFree} className="font-mono text-xs border border-border py-1.5 hover:border-gold hover:text-gold text-muted-foreground disabled:opacity-40">
                  {fmt(v)}
                </button>
              ))}
            </div>
          </div>

          {free && free.done ? (
            <Button
              data-testid={SLOT.freeCollect}
              onClick={collectFree}
              className="w-full h-16 bg-nvg hover:bg-nvg/90 text-black font-display text-2xl tracking-widest glow-nvg gap-2 animate-flicker"
            >
              <Coins size={26} weight="fill" /> COLLECT {fmt(free.total)}
            </Button>
          ) : (
            <Button
              data-testid={SLOT.spin}
              onClick={doSpin}
              disabled={spinning || inFree}
              className="w-full h-16 bg-gold hover:bg-gold/90 text-black font-display text-2xl tracking-widest glow-gold gap-2 disabled:opacity-60"
            >
              {inFree ? <Sparkle size={26} weight="fill" /> : <Lightning size={26} weight="fill" />}
              {inFree ? "FREE FIRE..." : spinning ? "SPINNING..." : "SPIN"}
            </Button>
          )}

          <div className="hud p-4">
            <p className="font-mono text-[10px] tracking-widest text-nvg/70 flex items-center gap-1 mb-3"><Info size={12} /> PAYTABLE (×line bet)</p>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {Object.entries(machine.paytable).map(([sym, pt]) => (
                <div key={sym} className="flex items-center justify-between">
                  <SymbolTile id={sym} size={24} />
                  <span className="font-mono text-xs text-muted-foreground">
                    3:<span className="text-foreground">{pt["3"]}</span> · 4:<span className="text-foreground">{pt["4"]}</span> · 5:<span className="text-gold">{pt["5"]}</span>
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border pt-2 mt-2">
                <div className="flex items-center gap-1"><Target size={18} weight="fill" className="text-nvg" /><SymbolTile id={machine.scatter} size={22} /></div>
                <span className="font-mono text-[11px] text-nvg text-right">3+ scatter →<br/>{machine.free_spins} free spins, rising ×</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
