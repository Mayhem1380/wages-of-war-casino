import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { SymbolTile } from "@/components/SymbolTile";
import { FLAGSHIP_ART, fmt } from "@/data/gameMeta";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sfx } from "@/lib/sounds";
import { BigWinOverlay } from "@/components/BigWinOverlay";
import {
  Lightning,
  Minus,
  Plus,
  ArrowLeft,
  Coins,
  Info,
} from "@phosphor-icons/react";

const MIN_BET = 20;
const MAX_BET = 100000;
const JP_ORDER = ["royal", "grand", "major", "midi", "minor", "mini"];
const JP_COLOR = {
  royal: "#F6C64A",
  grand: "#FF5A5A",
  major: "#C07BFF",
  midi: "#5AA6FF",
  minor: "#4EE44E",
  mini: "#57E6C6",
};

const key = (r, c) => `${r}-${c}`;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// A single reel cell — renders a painted symbol, or a fire-coin with its value.
function Cell({ sym, coin, highlighted, spinning }) {
  return (
    <div
      className={`relative aspect-square flex items-center justify-center border transition-all duration-150 ${
        highlighted ? "border-gold bg-gold/15" : "border-black/40 bg-black/35"
      } ${spinning ? "opacity-80 blur-[1px]" : ""}`}
      style={{
        boxShadow: highlighted
          ? "inset 0 0 20px rgba(246,198,74,0.4)"
          : "inset 0 0 18px rgba(0,0,0,0.6)",
      }}
    >
      {coin ? (
        <div className="relative flex items-center justify-center w-full h-full animate-pop">
          <img
            src="/slots/sym_firecoin.png"
            alt="coin"
            className="w-[86%] h-[86%] object-contain drop-shadow-[0_0_10px_rgba(255,140,40,0.7)]"
          />
          <span
            className="absolute font-display tracking-wide leading-none text-center"
            style={{
              fontSize: coin.jackpot ? "0.85rem" : "1.05rem",
              color: coin.jackpot ? JP_COLOR[coin.jackpot] : "#fff",
              textShadow: "0 1px 3px #000, 0 0 6px rgba(0,0,0,0.9)",
            }}
          >
            {coin.jackpot ? coin.jackpot.toUpperCase() : fmt(coin.value)}
          </span>
        </div>
      ) : (
        <div className={highlighted ? "animate-pop" : ""}>
          <SymbolTile id={sym} size={52} highlighted={highlighted} />
        </div>
      )}
    </div>
  );
}

export default function FlagshipSlot() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser, openAuth } = useAuth();
  const art = FLAGSHIP_ART[id] || {
    thumb: "/slots/thumb_gold.jpg",
    bg: "/slots/bg_gold.jpg",
    accent: "#F6C64A",
    frame: "#8a6a1e",
    panel: "#141008",
  };

  const [machine, setMachine] = useState(null);
  const [grid, setGrid] = useState([[], [], [], [], []]);
  const [coins, setCoins] = useState({}); // key -> coin (base spin coins)
  const [bet, setBet] = useState(100);
  const [spinning, setSpinning] = useState(false);
  const [reelStop, setReelStop] = useState([false, false, false, false, false]);
  const [winCells, setWinCells] = useState(new Set());
  const [lastWin, setLastWin] = useState(0);
  const [free, setFree] = useState(null);
  const [bigWin, setBigWin] = useState(null);
  const [intro, setIntro] = useState(true);
  const [hold, setHold] = useState(null); // {coins:{}, respins, total, jackpots, done, filled}
  const [wheel, setWheel] = useState(null); // {segments, index, result, award, angle, revealed}
  const spinRef = useRef();
  const machineRef = useRef(null);

  const randSym = useCallback(
    (syms) => syms[Math.floor(Math.random() * syms.length)],
    [],
  );

  useEffect(() => {
    let alive = true;
    api
      .get(`/games/slots/${id}`)
      .then(({ data }) => {
        if (!alive) return;
        if (!data.is_flagship) {
          navigate(`/slots/${id}`);
          return;
        }
        setMachine(data);
        machineRef.current = data;
        setGrid(
          Array.from({ length: 5 }, () =>
            Array.from(
              { length: 3 },
              () =>
                data.symbols[Math.floor(Math.random() * data.symbols.length)],
            ),
          ),
        );
      })
      .catch(() => navigate("/lobby"));
    return () => {
      alive = false;
      clearInterval(spinRef.current);
    };
  }, [id, navigate]);

  const highlight = (data) => {
    const cells = new Set();
    (data.line_wins || []).forEach((lw) =>
      lw.positions.forEach(([r, c]) => cells.add(key(r, c))),
    );
    setWinCells(cells);
  };

  const animateReels = (finalGrid, onDone) => {
    const m = machineRef.current;
    setWinCells(new Set());
    setCoins({});
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
          if (reel === 4) setTimeout(onDone, 160);
        }, reel * 150);
      });
    }, 500);
  };

  const doSpin = async () => {
    if (!user) {
      openAuth("register");
      return;
    }
    if (spinning || (free && free.active) || (hold && hold.active) || !machine)
      return;
    if (user.balance < bet) {
      toast.error("Insufficient credits — resupply at the wallet.");
      return;
    }
    sfx.prime();
    setSpinning(true);
    setLastWin(0);
    try {
      const { data } = await api.post("/games/slots/spin", {
        machine_id: id,
        bet,
      });
      animateReels(data.grid, () => finalize(data));
    } catch (e) {
      clearInterval(spinRef.current);
      setSpinning(false);
      toast.error(e.response?.data?.detail || "Spin failed");
    }
  };

  const finalize = (data) => {
    highlight(data);
    // place base fire-coins
    const cmap = {};
    (data.firecoins || []).forEach((c) => {
      cmap[key(c.pos[0], c.pos[1])] = c;
    });
    setCoins(cmap);
    setLastWin(data.total_win);
    setSpinning(false);
    refreshUser();
    if (data.total_win >= bet * 15) sfx.bigWin();
    else if (data.total_win > 0) sfx.win();
    if (data.total_win >= bet * 50)
      setBigWin({ win: data.total_win, multiplier: 1 });
    if (data.total_win > 0)
      toast.success(`WIN +${fmt(data.total_win)} credits`);

    if (data.holdwin_session) {
      sfx.scatter();
      startHoldWin(data.holdwin_session, cmap);
    } else if (data.free_session) {
      sfx.scatter();
      toast.success(`★ SCATTER! ${data.free_session.spins_left} FREE SPINS`);
      setFree({
        active: true,
        spinsLeft: data.free_session.spins_left,
        multiplier: 1,
        total: 0,
        done: false,
        sessionId: data.free_session.session_id,
      });
      setTimeout(() => runFree(data.free_session.session_id), 1400);
    }
  };

  // ---- HOLD & WIN BONUS ----
  const startHoldWin = async (session, initialCoinMap) => {
    const locked = { ...initialCoinMap };
    sfx.holdStart();
    setHold({
      active: true,
      coins: locked,
      respins: 3,
      total: 0,
      jackpots: [],
      done: false,
      filled: Object.keys(locked).length,
    });
    await sleep(1300);
    try {
      const { data } = await api.post("/games/slots/holdwin", {
        session_id: session.session_id,
      });
      await playSequence(locked, data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Bonus failed");
      setHold((h) => (h ? { ...h, active: false } : h));
    }
  };

  const runWheel = async (w) => {
    const seg = 360 / w.segments.length;
    setWheel({ ...w, angle: 0, revealed: false });
    await sleep(120);
    sfx.wheelSpin();
    const target = 360 * 5 + (360 - w.index * seg - seg / 2);
    setWheel((p) => ({ ...p, angle: target }));
    await sleep(1750);
    sfx.wheelStop();
    setWheel((p) => ({ ...p, revealed: true }));
    await sleep(1600);
    setWheel(null);
  };

  const playSequence = async (locked, data) => {
    let live = { ...locked };
    for (const step of data.sequence) {
      sfx.spin();
      await sleep(650);
      step.new_coins.forEach((c, i) => {
        live[key(c.pos[0], c.pos[1])] = c;
        sfx.coinLock(i);
      });
      const runningTotal = Object.values(live).reduce((s, c) => s + c.value, 0);
      setHold((h) => ({
        ...h,
        coins: { ...live },
        respins: step.respins_left,
        filled: step.filled,
        total: runningTotal,
      }));
      await sleep(300);
    }
    await sleep(400);
    if (data.wheel) await runWheel(data.wheel);
    if (data.full_grid || (data.jackpots_won || []).length) sfx.jackpot();
    else sfx.bigWin();
    if (data.total_win >= bet * 40)
      setBigWin({ win: data.total_win, multiplier: 1 });
    refreshUser();
    setHold((h) => ({
      ...h,
      total: data.total_win,
      jackpots: data.jackpots_won,
      done: true,
      fullGrid: data.full_grid,
    }));
  };

  const collectHold = () => {
    const total = hold?.total || 0;
    sfx.coin();
    setHold(null);
    setCoins({});
    setLastWin(total);
    refreshUser();
    toast.success(`HOLD & WIN COMPLETE — banked +${fmt(total)} credits`);
  };

  // ---- FREE SPINS (shared style) ----
  const runFree = async (sessionId) => {
    try {
      const { data } = await api.post("/games/slots/freespin", {
        session_id: sessionId,
      });
      animateReels(data.grid, () => {
        highlight(data);
        setLastWin(data.win);
        setFree((f) => ({
          ...f,
          spinsLeft: data.spins_left,
          multiplier: data.next_multiplier,
          total: data.total_session_win,
          done: !data.active,
        }));
        if (data.win >= bet * 15) sfx.bigWin();
        else if (data.win > 0) sfx.win();
        if (data.win >= bet * 50)
          setBigWin({ win: data.win, multiplier: data.multiplier });
        if (data.retrigger) {
          sfx.scatter();
          toast.success("★ RETRIGGER +5 SPINS");
        }
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

  const changeBet = (d) =>
    setBet((b) => Math.max(MIN_BET, Math.min(MAX_BET, b + d)));

  if (!machine)
    return (
      <div className="max-w-6xl mx-auto p-16 font-mono text-nvg/70">
        // loading flagship...
      </div>
    );

  const busy = spinning || (free && free.active) || (hold && hold.active);
  const jackpots = machine.jackpots || {};

  return (
    <div
      data-testid="flagship-slot-root"
      className="min-h-screen"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.82)), url(${art.bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {bigWin && (
        <BigWinOverlay
          win={bigWin.win}
          multiplier={bigWin.multiplier}
          onDone={() => setBigWin(null)}
        />
      )}

      {/* BONUS POWER WHEEL */}
      {wheel && (
        <div
          data-testid="flagship-wheel"
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm"
        >
          <p
            className="font-mono text-xs tracking-[0.5em] mb-2"
            style={{ color: art.accent }}
          >
            ★ POWER WHEEL
          </p>
          <h2 className="font-display text-4xl sm:text-5xl gold-gradient tracking-widest mb-6">
            SPIN THE POWER FEATURE
          </h2>
          <div className="relative w-[300px] h-[300px] sm:w-[380px] sm:h-[380px]">
            {/* pointer */}
            <div
              className="absolute left-1/2 -top-2 -translate-x-1/2 z-20"
              style={{
                width: 0,
                height: 0,
                borderLeft: "16px solid transparent",
                borderRight: "16px solid transparent",
                borderTop: `26px solid ${art.accent}`,
              }}
            />
            <motion.div
              className="w-full h-full rounded-full border-4"
              style={{
                borderColor: art.accent,
                boxShadow: `0 0 50px ${art.accent}77, inset 0 0 40px rgba(0,0,0,0.6)`,
                background: `conic-gradient(#F6C64A 0deg 45deg, #57E6C6 45deg 90deg, #FF5A5A 90deg 135deg, #4EE44E 135deg 180deg, #FF8A2E 180deg 225deg, #5AA6FF 225deg 270deg, #F6C64A 270deg 315deg, #C07BFF 315deg 360deg)`,
              }}
              animate={{ rotate: wheel.angle }}
              transition={{ duration: 1.7, ease: [0.15, 0.85, 0.2, 1] }}
            >
              {wheel.segments.map((s, i) => {
                const seg = 360 / wheel.segments.length;
                return (
                  <div
                    key={i}
                    className="absolute inset-0 flex justify-center"
                    style={{ transform: `rotate(${i * seg + seg / 2}deg)` }}
                  >
                    <span
                      className="mt-4 font-display text-lg sm:text-xl text-black/85 tracking-wide"
                      style={{ transformOrigin: "center" }}
                    >
                      {s}
                    </span>
                  </div>
                );
              })}
            </motion.div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="w-16 h-16 rounded-full bg-black/80 border-2 flex items-center justify-center"
                style={{ borderColor: art.accent }}
              >
                <img
                  src="/slots/sym_firecoin.png"
                  alt=""
                  className="w-12 h-12 object-contain"
                />
              </div>
            </div>
          </div>
          {wheel.revealed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-8 text-center"
            >
              <div className="font-display text-6xl gold-gradient tracking-widest animate-pop">
                {wheel.result}
              </div>
              <div className="font-mono text-sm text-nvg mt-1 tracking-widest">
                POWER AWARD +{fmt(wheel.award)}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* INTRO */}
      {intro && (
        <div
          data-testid="flagship-intro"
          onClick={() => {
            sfx.prime();
            setIntro(false);
          }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer overflow-y-auto p-4"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.85)), url(${art.bg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <img
            src={art.thumb}
            alt={machine.name}
            className="w-32 h-32 sm:w-52 sm:h-52 object-cover rounded-lg border-2 mb-4 sm:mb-6 animate-pop"
            style={{
              borderColor: art.accent,
              boxShadow: `0 0 50px ${art.accent}77`,
            }}
          />
          <p
            className="font-mono text-[10px] sm:text-xs tracking-[0.4em] sm:tracking-[0.5em] mb-2"
            style={{ color: art.accent }}
          >
            ★ AAA FLAGSHIP OPERATION
          </p>
          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl tracking-wide text-white text-center px-4 drop-shadow-[0_3px_12px_rgba(0,0,0,0.9)]">
            {machine.name}
          </h1>
          <div className="flex items-center gap-2 sm:gap-3 mt-3 mb-6 sm:mb-8">
            <span className="font-display text-xl sm:text-3xl gold-gradient">
              HOLD &amp; WIN
            </span>
            <span className="text-white/40">·</span>
            <span
              className="font-display text-xl sm:text-3xl"
              style={{ color: art.accent }}
            >
              ROYAL 10,000×
            </span>
          </div>
          <button
            data-testid="continue-to-play-btn"
            onClick={(e) => {
              e.stopPropagation();
              sfx.prime();
              setIntro(false);
            }}
            className="font-stencil tracking-[0.3em] text-black bg-gold hover:bg-gold/90 px-8 py-3 glow-gold animate-pulse text-base sm:text-lg"
          >
            CONTINUE TO PLAY
          </button>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-6 pb-28 lg:pb-6">
        <button
          onClick={() => navigate("/lobby")}
          className="flex items-center gap-2 text-white/60 hover:text-white font-mono text-sm mb-4"
        >
          <ArrowLeft size={16} /> RETURN TO LOBBY
        </button>

        {/* JACKPOT LADDER */}
        <div
          data-testid="flagship-jackpots"
          className="grid grid-cols-6 gap-1.5 sm:gap-2 mb-4"
        >
          {JP_ORDER.map((jp) => (
            <div
              key={jp}
              className="text-center py-1.5 sm:py-2 rounded-sm border bg-black/55"
              style={{ borderColor: `${JP_COLOR[jp]}66` }}
            >
              <div
                className="font-mono text-[8px] sm:text-[10px] tracking-widest"
                style={{ color: JP_COLOR[jp] }}
              >
                {jp.toUpperCase()}
              </div>
              <div className="font-display text-sm sm:text-xl text-white leading-none">
                {fmt((jackpots[jp] || 0) * bet)}
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_260px] gap-4">
          {/* REELS */}
          <div className="relative">
            <div
              className="relative p-2 sm:p-3 rounded-md border-2 overflow-hidden"
              style={{
                borderColor: art.frame,
                background: art.panel,
                boxShadow: `inset 0 0 60px rgba(0,0,0,0.7), 0 0 30px ${art.accent}22`,
              }}
            >
              <div
                data-testid="flagship-grid"
                className="grid grid-cols-5 gap-1.5 sm:gap-2"
              >
                {grid.map((col, reel) => (
                  <div key={reel} className="flex flex-col gap-1.5 sm:gap-2">
                    {col.map((sym, row) => (
                      <Cell
                        key={row}
                        sym={sym}
                        coin={coins[key(reel, row)]}
                        highlighted={winCells.has(key(reel, row))}
                        spinning={busy && !reelStop[reel]}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* HOLD & WIN OVERLAY */}
              {hold && (
                <div
                  data-testid="flagship-holdwin"
                  className="absolute inset-0 z-30 bg-[#0b0705] flex flex-col p-3 sm:p-4"
                >
                  <div className="text-center mb-2">
                    <div className="font-display text-3xl sm:text-4xl gold-gradient tracking-widest animate-flicker">
                      HOLD &amp; WIN
                    </div>
                    <div className="font-mono text-[10px] tracking-widest text-white/60">
                      FIRE COINS LOCK · RESPINS RESET ON EACH NEW COIN
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 flex-1">
                    {Array.from({ length: 5 }).map((_, reel) => (
                      <div key={reel} className="flex flex-col gap-1.5">
                        {Array.from({ length: 3 }).map((_, row) => {
                          const c = hold.coins[key(reel, row)];
                          return (
                            <div
                              key={row}
                              className={`aspect-square flex items-center justify-center border rounded-sm ${c ? "border-gold bg-gold/10" : "border-white/10 bg-black/50"}`}
                            >
                              {c && (
                                <div className="relative flex items-center justify-center w-full h-full">
                                  <img
                                    src="/slots/sym_firecoin.png"
                                    alt="coin"
                                    className="w-[85%] h-[85%] object-contain"
                                  />
                                  <span
                                    className="absolute font-display leading-none text-center"
                                    style={{
                                      fontSize: c.jackpot ? "0.7rem" : "0.9rem",
                                      color: c.jackpot
                                        ? JP_COLOR[c.jackpot]
                                        : "#fff",
                                      textShadow: "0 1px 3px #000",
                                    }}
                                  >
                                    {c.jackpot
                                      ? c.jackpot.toUpperCase()
                                      : fmt(c.value)}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-center">
                      <div className="font-display text-3xl text-nvg leading-none">
                        {hold.respins}
                      </div>
                      <div className="font-mono text-[9px] text-white/50 tracking-widest">
                        RESPINS
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-display text-3xl text-gold leading-none">
                        {hold.filled}/15
                      </div>
                      <div className="font-mono text-[9px] text-white/50 tracking-widest">
                        LOCKED
                      </div>
                    </div>
                    <div className="text-center">
                      <div
                        data-testid="flagship-holdwin-total"
                        className="font-display text-3xl gold-gradient leading-none"
                      >
                        +{fmt(hold.total)}
                      </div>
                      <div className="font-mono text-[9px] text-white/50 tracking-widest">
                        WON
                      </div>
                    </div>
                  </div>
                  {hold.done && (
                    <Button
                      data-testid="flagship-holdwin-collect"
                      onClick={collectHold}
                      className="w-full h-14 mt-3 bg-gold hover:bg-gold/90 text-black font-display text-2xl tracking-widest glow-gold animate-flicker gap-2"
                    >
                      <Coins size={24} weight="fill" /> COLLECT{" "}
                      {fmt(hold.total)}
                    </Button>
                  )}
                </div>
              )}

              {/* FREE SPINS BANNER */}
              {free && (
                <div className="absolute inset-x-0 top-0 z-20 bg-black/85 border-b-2 border-gold px-4 py-2 flex items-center justify-between">
                  <div className="font-display text-xl gold-gradient tracking-widest">
                    FREE FIRE
                  </div>
                  <div className="flex gap-4 font-mono text-sm text-white">
                    <span>
                      {free.spinsLeft}{" "}
                      <span className="text-white/40">SPINS</span>
                    </span>
                    <span className="gold-gradient font-display text-lg">
                      ×{free.multiplier}
                    </span>
                    <span className="text-gold">{fmt(free.total)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-3 px-1">
              <span className="font-mono text-xs text-white/50 tracking-widest">
                LAST PAYOUT
              </span>
              <span
                data-testid="flagship-win"
                className={`font-display text-3xl ${lastWin > 0 ? "gold-gradient animate-pop" : "text-white/40"}`}
              >
                {lastWin > 0 ? `+${fmt(lastWin)}` : "0"}
              </span>
            </div>
          </div>

          {/* CONTROLS */}
          <div className="space-y-3">
            <div
              className="rounded-md border p-4 bg-black/55"
              style={{ borderColor: `${art.frame}88` }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Coins size={18} weight="fill" className="text-gold" />
                <span
                  data-testid="flagship-balance"
                  className="font-mono text-lg text-gold"
                >
                  {fmt(user?.balance || 0)}
                </span>
              </div>
              <p className="font-mono text-[10px] tracking-widest text-white/50 mt-3 mb-2">
                STAKE / SPIN
              </p>
              <div className="flex items-center gap-2">
                <button
                  data-testid="flagship-bet-dec"
                  onClick={() => changeBet(-20)}
                  disabled={busy}
                  className="w-9 h-9 border border-white/20 hover:border-nvg text-white flex items-center justify-center disabled:opacity-40"
                >
                  <Minus size={14} weight="bold" />
                </button>
                <input
                  data-testid="flagship-bet-input"
                  type="number"
                  value={bet}
                  disabled={busy}
                  onChange={(e) =>
                    setBet(
                      Math.max(
                        MIN_BET,
                        Math.min(MAX_BET, Number(e.target.value) || MIN_BET),
                      ),
                    )
                  }
                  className="flex-1 bg-black/50 border border-white/20 text-center font-mono text-lg text-gold py-2 outline-none focus:border-gold disabled:opacity-50"
                />
                <button
                  data-testid="flagship-bet-inc"
                  onClick={() => changeBet(20)}
                  disabled={busy}
                  className="w-9 h-9 border border-white/20 hover:border-nvg text-white flex items-center justify-center disabled:opacity-40"
                >
                  <Plus size={14} weight="bold" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[100, 500, 2000].map((v) => (
                  <button
                    key={v}
                    onClick={() => setBet(v)}
                    disabled={busy}
                    className="font-mono text-xs border border-white/15 py-1.5 hover:border-gold hover:text-gold text-white/60 disabled:opacity-40"
                  >
                    {fmt(v)}
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden lg:block">
            {free && free.done ? (
              <Button
                data-testid="flagship-free-collect"
                onClick={collectFree}
                className="w-full h-16 bg-nvg hover:bg-nvg/90 text-black font-display text-2xl tracking-widest glow-nvg gap-2 animate-flicker"
              >
                <Coins size={26} weight="fill" /> COLLECT {fmt(free.total)}
              </Button>
            ) : (
              <Button
                data-testid="flagship-spin"
                onClick={doSpin}
                disabled={busy}
                className="w-full h-16 text-black font-display text-2xl tracking-widest glow-gold gap-2 disabled:opacity-60"
                style={{ background: art.accent }}
              >
                <Lightning size={26} weight="fill" /> {busy ? "..." : "SPIN"}
              </Button>
            )}
            </div>

            <div
              className="rounded-md border p-4 bg-black/55"
              style={{ borderColor: `${art.frame}88` }}
            >
              <p className="font-mono text-[10px] tracking-widest text-white/50 flex items-center gap-1 mb-2">
                <Info size={12} /> FIRE COINS
              </p>
              <p className="text-xs text-white/60 leading-relaxed">
                Land <span className="text-gold font-mono">6+</span> fire coins
                to launch <span className="text-gold">HOLD &amp; WIN</span>.
                Coins lock and respins reset with every new coin. Fill all 15 to
                seize the <span className="text-gold">GRAND</span> jackpot.
              </p>
            </div>

            <div
              className="rounded-md border p-4 bg-black/55"
              style={{ borderColor: `${art.frame}88` }}
            >
              <p className="font-mono text-[10px] tracking-widest text-white/50 flex items-center gap-1 mb-2">
                <Info size={12} /> PAYTABLE (×line bet)
              </p>
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {Object.entries(machine.paytable).map(([sym, pt]) => (
                  <div key={sym} className="flex items-center justify-between">
                    <SymbolTile id={sym} size={26} />
                    <span className="font-mono text-[11px] text-white/60">
                      3:<span className="text-white">{pt["3"]}</span> · 4:
                      <span className="text-white">{pt["4"]}</span> · 5:
                      <span className="text-gold">{pt["5"]}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky action bar */}
      {!intro && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-[60] flex items-center justify-center px-3 py-2.5 bg-black/92 backdrop-blur-md border-t-2 border-gold/40">
          <div className="absolute left-3 flex flex-col leading-none">
            <span className="font-mono text-[9px] text-white/50 tracking-widest">BALANCE</span>
            <span className="font-mono text-sm text-gold">{fmt(user?.balance || 0)}</span>
          </div>
          {free && free.done ? (
            <Button
              data-testid="flagship-spin-mobile"
              onClick={collectFree}
              className="w-full max-w-xs h-14 bg-nvg hover:bg-nvg/90 text-black font-display text-xl tracking-widest gap-2 animate-flicker"
            >
              <Coins size={22} weight="fill" /> COLLECT {fmt(free.total)}
            </Button>
          ) : (
            <Button
              data-testid="flagship-spin-mobile"
              onClick={doSpin}
              disabled={busy}
              className="w-full max-w-xs h-14 text-black font-display text-xl tracking-widest gap-2 disabled:opacity-60"
              style={{ background: art.accent }}
            >
              <Lightning size={22} weight="fill" /> {busy ? "..." : "SPIN"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
