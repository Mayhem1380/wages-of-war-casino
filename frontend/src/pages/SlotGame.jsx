import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { SymbolTile } from "@/components/SymbolTile";
import { MACHINE_ART, fmt } from "@/data/gameMeta";
import { SLOT } from "@/constants/testIds";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Lightning, Minus, Plus, ArrowLeft, Coins, Info } from "@phosphor-icons/react";

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
  const [freeSpins, setFreeSpins] = useState(0);
  const spinRef = useRef();

  const art = MACHINE_ART[id] || { accent: "#4EE44E" };

  const randSym = useCallback((syms) => syms[Math.floor(Math.random() * syms.length)], []);

  useEffect(() => {
    let mounted = true;
    api.get(`/games/slots/${id}`).then(({ data }) => {
      if (!mounted) return;
      setMachine(data);
      const g = Array.from({ length: 5 }, () =>
        Array.from({ length: 3 }, () => data.symbols[Math.floor(Math.random() * data.symbols.length)])
      );
      setGrid(g);
    }).catch(() => navigate("/lobby"));
    return () => { mounted = true; clearInterval(spinRef.current); };
  }, [id, navigate]);

  const doSpin = async () => {
    if (!user) { openAuth("register"); return; }
    if (spinning || !machine) return;
    if (user.balance < bet) { toast.error("Insufficient credits — resupply at the wallet."); return; }

    setSpinning(true);
    setWinCells(new Set());
    setLastWin(0);
    setFreeSpins(0);
    setReelStop([false, false, false, false, false]);

    // spinning animation: randomize all cells rapidly
    spinRef.current = setInterval(() => {
      setGrid((prev) => prev.map((col) => col.map(() => randSym(machine.symbols))));
    }, 70);

    try {
      const { data } = await api.post("/games/slots/spin", { machine_id: id, bet });
      const startedAt = Date.now();
      const minDuration = 650;
      const elapsed = Date.now() - startedAt;
      setTimeout(() => {
        clearInterval(spinRef.current);
        // stop reels left to right
        data.grid.forEach((col, reel) => {
          setTimeout(() => {
            setGrid((prev) => prev.map((c, r) => (r === reel ? col : c)));
            setReelStop((prev) => prev.map((v, r) => (r === reel ? true : v)));
            if (reel === 4) finalize(data);
          }, reel * 160);
        });
      }, Math.max(0, minDuration - elapsed));
    } catch (e) {
      clearInterval(spinRef.current);
      setSpinning(false);
      toast.error(e.response?.data?.detail || "Spin failed");
    }
  };

  const finalize = (data) => {
    const cells = new Set();
    (data.line_wins || []).forEach((lw) => lw.positions.forEach(([r, c]) => cells.add(`${r}-${c}`)));
    (data.scatter_positions || []).forEach(([r, c]) => cells.add(`${r}-${c}`));
    setTimeout(() => {
      setWinCells(cells);
      setLastWin(data.total_win);
      setSpinning(false);
      refreshUser();
      if (data.free_spins_awarded > 0) {
        setFreeSpins(data.free_spins_awarded);
        toast.success(`SCATTER! ${data.free_spins_awarded} free-spin payout secured.`);
      }
      if (data.total_win > 0) {
        toast.success(`WIN +${fmt(data.total_win)} credits`);
      }
    }, 120);
  };

  const changeBet = (delta) => {
    setBet((b) => {
      let n = b + delta;
      if (n < MIN_BET) n = MIN_BET;
      if (n > MAX_BET) n = MAX_BET;
      return n;
    });
  };

  if (!machine) return <div className="max-w-6xl mx-auto p-16 font-mono text-nvg/70">// loading machine...</div>;

  return (
    <div data-testid={SLOT.root} className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
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
        <div className="hud p-4 sm:p-6" style={{ background: "#060906" }}>
          <div
            data-testid={SLOT.grid}
            className="grid grid-cols-5 gap-2 sm:gap-3"
            style={{ background: "linear-gradient(180deg, #0a120a, #060906)" }}
          >
            {grid.map((col, reel) => (
              <div key={reel} className="flex flex-col gap-2 sm:gap-3">
                {col.map((sym, row) => {
                  const hl = winCells.has(`${reel}-${row}`);
                  const isSpin = spinning && !reelStop[reel];
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

          {/* WIN BAR */}
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <div className="font-mono text-xs text-muted-foreground tracking-widest">
              {freeSpins > 0 && <span className="text-nvg mr-3 animate-flicker">★ {freeSpins} FREE SPINS AWARDED</span>}
              LAST PAYOUT
            </div>
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
              <button data-testid={SLOT.betDec} onClick={() => changeBet(-20)} className="w-10 h-10 border border-border hover:border-nvg text-nvg flex items-center justify-center">
                <Minus size={16} weight="bold" />
              </button>
              <input
                data-testid={SLOT.betInput}
                type="number"
                value={bet}
                onChange={(e) => setBet(Math.max(MIN_BET, Math.min(MAX_BET, Number(e.target.value) || MIN_BET)))}
                className="flex-1 bg-black/50 border border-border text-center font-mono text-lg text-gold py-2 outline-none focus:border-gold"
              />
              <button data-testid={SLOT.betInc} onClick={() => changeBet(20)} className="w-10 h-10 border border-border hover:border-nvg text-nvg flex items-center justify-center">
                <Plus size={16} weight="bold" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[100, 500, 2000].map((v) => (
                <button key={v} onClick={() => setBet(v)} className="font-mono text-xs border border-border py-1.5 hover:border-gold hover:text-gold text-muted-foreground">
                  {fmt(v)}
                </button>
              ))}
            </div>
          </div>

          <Button
            data-testid={SLOT.spin}
            onClick={doSpin}
            disabled={spinning}
            className="w-full h-16 bg-gold hover:bg-gold/90 text-black font-display text-2xl tracking-widest glow-gold gap-2 disabled:opacity-60"
          >
            <Lightning size={26} weight="fill" />
            {spinning ? "SPINNING..." : "SPIN"}
          </Button>

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
                <SymbolTile id={machine.scatter} size={24} />
                <span className="font-mono text-xs text-nvg">SCATTER · {machine.free_spins} free spins</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
