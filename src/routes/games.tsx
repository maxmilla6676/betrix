import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Rocket,
  CheckCircle2, RefreshCw, Star, BarChart3,
  ChevronLeft, Search, Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/games")({
  head: () => ({
    meta: [
      { title: "BETRIX — Casino & Arcade Games" },
      { name: "description", content: "Instant casino games: AeroCash, Mines, Card Burst, Lucky Dice, Soccer Strike and more." },
    ],
  }),
  component: GamesPage,
});

// ─── Demo wallet ──────────────────────────────────────────────────────────────
// Games run on free play credits in the browser. They never touch the real GHS
// wallet: a real-money casino needs server-side outcomes and a separate licence.
const DEMO_KEY = "betrix.demoCredits";
const DEMO_START = 1000;
let demoCredits = DEMO_START;
const demoListeners = new Set<() => void>();
if (typeof window !== "undefined") {
  const saved = Number(window.localStorage.getItem(DEMO_KEY));
  if (Number.isFinite(saved) && saved > 0) demoCredits = saved;
}
function setDemoCredits(next: number) {
  demoCredits = Math.max(0, Math.round(next * 100) / 100);
  try {
    window.localStorage.setItem(DEMO_KEY, String(demoCredits));
  } catch {
    /* storage unavailable */
  }
  demoListeners.forEach((l) => l());
}
function useDemoWallet() {
  const balance = useSyncExternalStore(
    (cb) => {
      demoListeners.add(cb);
      return () => demoListeners.delete(cb);
    },
    () => demoCredits,
    () => DEMO_START,
  );
  return {
    balance,
    withdraw: (n: number) => setDemoCredits(demoCredits - n),
    deposit: (n: number) => setDemoCredits(demoCredits + n),
    reset: () => setDemoCredits(DEMO_START),
  };
}
const formatDemo = (n: number) => `${n.toFixed(2)} credits`;

function DemoBanner() {
  const { balance, reset } = useDemoWallet();
  return (
    <div role="note" className="flex items-center justify-between gap-2 border-b border-[#F5C400]/30 bg-[#F5C400]/10 px-4 py-2 text-[11px] font-bold text-[#F5C400]">
      <span>DEMO MODE — free play credits, no real money. Balance: {formatDemo(balance)}</span>
      {balance < 1 && (
        <button type="button" onClick={reset} className="rounded-md border border-[#F5C400]/40 px-2 py-0.5 text-[10px] hover:bg-[#F5C400]/20">
          Reset credits
        </button>
      )}
    </div>
  );
}

// ─── Game Catalogue ───────────────────────────────────────────────────────────
type GameId = "aerocash" | "mines" | "cardburst" | "spainbomb" | "soccerstrike" | "luckydice";

interface GameMeta {
  id: GameId;
  title: string;
  subtitle: string;
  rtp: string;
  badge?: "HOT" | "NEW" | "LIVE";
  emoji: string;
  bgGradient: string;
}

const GAMES: GameMeta[] = [
  { id: "aerocash",     title: "AeroCash",       subtitle: "PrimeStakers Origin", rtp: "97.0%", badge: "HOT",  emoji: "🚀", bgGradient: "from-[#0d1526] to-[#0f2040]" },
  { id: "mines",        title: "Mines",           subtitle: "PrimeStakers Origin", rtp: "97.0%", badge: "NEW",  emoji: "💎", bgGradient: "from-[#0d1526] to-[#12184a]" },
  { id: "cardburst",    title: "Card Burst",      subtitle: "PrimeStakers Origin", rtp: "97.0%", badge: "NEW",  emoji: "🃏", bgGradient: "from-[#0d1526] to-[#1a0d26]" },
  { id: "spainbomb",    title: "Spain da' Bo...", subtitle: "PrimeStakers Origin", rtp: "94.0%", badge: "NEW",  emoji: "🍾", bgGradient: "from-[#0d1526] to-[#1a1200]" },
  { id: "soccerstrike", title: "Soccer Strike",   subtitle: "PrimeStakers Origin", rtp: "95.0%", badge: "LIVE", emoji: "⚽", bgGradient: "from-[#0d1526] to-[#071a0d]" },
  { id: "luckydice",    title: "Lucky Dice",      subtitle: "PrimeStakers Origin", rtp: "96.5%", badge: "NEW",  emoji: "🎲", bgGradient: "from-[#0d1526] to-[#0a0a1a]" },
];

// ─── Badge ────────────────────────────────────────────────────────────────────
function GameBadge({ type }: { type: "HOT" | "NEW" | "LIVE" }) {
  if (type === "HOT") return (
    <span className="absolute top-2 left-2 z-10 bg-[#E41B23] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow">HOT</span>
  );
  if (type === "LIVE") return (
    <span className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-[#E41B23] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow">
      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse inline-block" />LIVE
    </span>
  );
  return (
    <span className="absolute top-2 right-2 z-10 bg-[#F5C400] text-black text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow">NEW</span>
  );
}

// ─── Game Card ────────────────────────────────────────────────────────────────
function GameCard({ game, onSelect }: { game: GameMeta; onSelect: (id: GameId) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      id={`game-card-${game.id}`}
      onClick={() => onSelect(game.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex flex-col bg-[#0e1520] border border-[#1e2d45] rounded-2xl overflow-hidden active:scale-95 transition-all shadow-lg hover:border-[#F5C400]/50 hover:shadow-[0_0_18px_rgba(245,196,0,0.15)] group text-left"
    >
      {game.badge && <GameBadge type={game.badge} />}

      {/* Icon area */}
      <div className={cn("relative flex items-center justify-center bg-gradient-to-b p-4 aspect-square w-full", game.bgGradient)}>
        <div
          className="relative flex items-center justify-center rounded-full w-[76px] h-[76px] md:w-24 md:h-24"
          style={{
            background: "radial-gradient(circle at 35% 35%, #1a2a4a, #090e18)",
            border: "2.5px solid #F5C400",
            boxShadow: "0 0 16px rgba(245,196,0,0.2), inset 0 0 12px rgba(0,0,0,0.4)",
          }}
        >
          <span className="text-[38px] md:text-5xl select-none">{game.emoji}</span>

          {/* PLAY overlay on hover */}
          <div className={cn(
            "absolute inset-0 rounded-full flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm transition-opacity duration-200",
            hovered ? "opacity-100" : "opacity-0 group-active:opacity-100"
          )}>
            <div className="flex items-center justify-center w-9 h-6 rounded bg-[#F5C400] text-black shadow">
              <Play className="h-3.5 w-3.5 fill-black" />
            </div>
            <span className="text-[8px] font-black text-[#F5C400] mt-1 uppercase tracking-widest">PLAY</span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="px-2.5 pb-3 pt-2">
        <p className="text-white font-black text-xs leading-tight truncate">{game.title}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <Star className="h-2.5 w-2.5 text-[#F5C400] fill-[#F5C400] shrink-0" />
          <span className="text-[9px] text-gray-400 font-semibold truncate">{game.subtitle}</span>
        </div>
        <p className="text-[9px] text-gray-500 font-bold mt-0.5">RTP {game.rtp}</p>
      </div>
    </button>
  );
}

// ─── Lobby ────────────────────────────────────────────────────────────────────
function CasinoLobby({ onSelect }: { onSelect: (id: GameId) => void }) {
  const [query, setQuery] = useState("");
  const filtered = GAMES.filter(g => g.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex flex-col min-h-screen bg-[#090e18]">
      {/* Search bar */}
      <div className="sticky top-0 z-20 bg-[#090e18] px-4 py-3 border-b border-[#1a2235]">
        <div className="flex items-center gap-2 bg-[#F5C400] rounded-xl px-3 py-2.5">
          <Search className="h-4 w-4 text-black shrink-0" />
          <input
            id="casino-search"
            type="text"
            placeholder="Search games..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-black placeholder-black/50 text-sm font-semibold outline-none"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 p-3">
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(game => (
            <GameCard key={game.id} game={game} onSelect={onSelect} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-2 py-16 text-center text-gray-500 font-bold text-sm">
              No games found for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Game Shell (header + content) ───────────────────────────────────────────
function GameShell({ gameId, onBack }: { gameId: GameId; onBack: () => void }) {
  const game = GAMES.find(g => g.id === gameId)!;
  return (
    <div className="flex flex-col min-h-screen bg-[#090e18] text-white">
      <div className="sticky top-0 z-20 flex items-center gap-3 bg-[#0c1220] border-b border-[#1a2235] px-4 py-3">
        <button
          id="game-back-btn"
          type="button"
          onClick={onBack}
          className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#161f30] border border-[#263047] hover:bg-[#1e2b42] transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-white" />
        </button>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="text-2xl">{game.emoji}</span>
          <div>
            <p className="text-white font-black text-sm">{game.title}</p>
            <p className="text-gray-500 text-[10px] font-semibold">RTP {game.rtp}</p>
          </div>
        </div>
        {game.badge && (
          <span className={cn(
            "text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wider",
            game.badge === "HOT" || game.badge === "LIVE" ? "bg-[#E41B23] text-white" : "bg-[#F5C400] text-black"
          )}>{game.badge}</span>
        )}
      </div>
      <div className="flex-1">
        {gameId === "aerocash"                                                             && <AeroCashGame />}
        {gameId === "mines"                                                                && <MinesGame />}
        {(gameId === "cardburst" || gameId === "spainbomb" || gameId === "soccerstrike" || gameId === "luckydice") && <DiceGame />}
      </div>
    </div>
  );
}

// ─── AeroCash ─────────────────────────────────────────────────────────────────
function AeroCashGame() {
  const { balance, withdraw, deposit } = useDemoWallet();
  const [multiplier, setMultiplier] = useState(1.0);
  const [gameState, setGameState] = useState<"IDLE" | "RUNNING" | "CRASHED">("IDLE");
  const [stake, setStake] = useState(50);
  const [hasBet, setHasBet] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [cashoutMult, setCashoutMult] = useState(0);
  const [winAmount, setWinAmount] = useState(0);
  const [history, setHistory] = useState<number[]>([1.42, 2.85, 1.12, 5.40, 1.05, 12.30]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === "RUNNING") {
      const crashPoint = Number((1.1 + Math.random() * 8.5).toFixed(2));
      let current = 1.0;
      interval = setInterval(() => {
        current += 0.03 + current * 0.015;
        if (current >= crashPoint) {
          setMultiplier(crashPoint);
          setGameState("CRASHED");
          setHistory(prev => [crashPoint, ...prev.slice(0, 9)]);
        } else setMultiplier(Number(current.toFixed(2)));
      }, 80);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    if (gameState === "IDLE") return;
    const progress = Math.min((multiplier - 1) / 8, 1);
    const endX = w * 0.85 * progress, endY = h - h * 0.75 * progress;
    ctx.beginPath(); ctx.moveTo(0, h);
    ctx.quadraticCurveTo(w * 0.4 * progress, h, endX, endY);
    ctx.strokeStyle = gameState === "CRASHED" ? "#E41B23" : "#F5C400";
    ctx.lineWidth = 3; ctx.stroke();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, gameState === "CRASHED" ? "rgba(228,27,35,0.1)" : "rgba(245,196,0,0.08)");
    grad.addColorStop(1, "transparent");
    ctx.lineTo(endX, h); ctx.lineTo(0, h); ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath(); ctx.arc(endX, endY, 6, 0, Math.PI * 2);
    ctx.fillStyle = gameState === "CRASHED" ? "#E41B23" : "#F5C400";
    ctx.shadowColor = gameState === "CRASHED" ? "#E41B23" : "#F5C400";
    ctx.shadowBlur = 14; ctx.fill(); ctx.shadowBlur = 0;
  }, [multiplier, gameState]);

  return (
    <div className="p-3 space-y-3 max-w-xl mx-auto w-full">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        <span className="text-[10px] font-bold text-gray-500 uppercase shrink-0 mr-1">History:</span>
        {history.map((m, i) => (
          <span key={i} className={cn("px-2 py-0.5 rounded-full font-mono text-[10px] font-black shrink-0 border",
            m >= 2.0 ? "bg-[#0a1f0a] text-green-400 border-green-800" :
            m < 1.5  ? "bg-[#1f0a0a] text-red-400   border-red-800"   :
                       "bg-[#141a26] text-gray-400   border-[#232f45]")}>
            {m.toFixed(2)}x
          </span>
        ))}
      </div>

      <div className="relative w-full h-52 bg-[#0a1020] border border-[#1a2840] rounded-2xl overflow-hidden">
        <canvas ref={canvasRef} width={600} height={208} className="absolute inset-0 w-full h-full" />
        <div className="relative z-10 flex items-center justify-center h-full">
          {gameState === "RUNNING" && (
            <div className="text-center">
              <div className="text-5xl font-black font-mono text-[#F5C400] animate-pulse">{multiplier.toFixed(2)}x</div>
              <div className="text-xs text-gray-400 font-bold mt-1">🚀 IN FLIGHT</div>
            </div>
          )}
          {gameState === "CRASHED" && (
            <div className="text-center">
              <div className="text-3xl font-black font-mono text-[#E41B23]">FLEW AWAY @ {multiplier.toFixed(2)}x</div>
              <p className="text-xs font-bold text-red-400 mt-1">Better luck next round!</p>
            </div>
          )}
          {gameState === "IDLE" && (
            <div className="text-center space-y-2">
              <Rocket className="h-10 w-10 text-[#F5C400] mx-auto animate-bounce" />
              <div className="text-base font-black text-white">NEXT ROUND STARTING...</div>
              <p className="text-xs text-gray-500">Place your bet to join the flight</p>
            </div>
          )}
          {cashedOut && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-green-600 text-white font-black px-4 py-2 rounded-full text-xs shadow-lg animate-bounce">
              <CheckCircle2 className="h-4 w-4" /> CASHED OUT {cashoutMult.toFixed(2)}x (+{winAmount} credits)
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#0e1520] border border-[#1a2840] rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-extrabold text-gray-500 uppercase">Stake (credits)</label>
            <input id="aerocash-stake" type="number" value={stake} onChange={e => setStake(Number(e.target.value))} disabled={gameState === "RUNNING"}
              className="w-full mt-1 bg-[#141c2e] border border-[#243248] rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-[#F5C400]" />
          </div>
          <div className="flex items-end gap-1">
            <button onClick={() => setStake(s => Math.max(10, Math.floor(s / 2)))} className="flex-1 py-2 rounded-xl bg-[#141c2e] border border-[#243248] text-xs font-bold text-gray-400 hover:text-white">½</button>
            <button onClick={() => setStake(s => s * 2)} className="flex-1 py-2 rounded-xl bg-[#141c2e] border border-[#243248] text-xs font-bold text-gray-400 hover:text-white">2×</button>
            <button onClick={() => setStake(balance)} className="flex-1 py-2 rounded-xl bg-[#F5C400]/10 border border-[#F5C400]/30 text-xs font-bold text-[#F5C400]">MAX</button>
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold">
          <span>Balance: <span className="text-white">{formatDemo(balance)}</span></span>
          {gameState === "RUNNING" && hasBet && !cashedOut && (
            <span className="text-[#F5C400]">Potential: {formatDemo(Math.round(stake * multiplier))}</span>
          )}
        </div>
        {gameState === "RUNNING" ? (
          <button id="aerocash-cashout" onClick={() => {
            if (!hasBet || cashedOut) return;
            const win = Math.round(stake * multiplier);
            setCashedOut(true); setCashoutMult(multiplier); setWinAmount(win); deposit(win);
          }} disabled={cashedOut}
            className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase shadow-md transition-all disabled:opacity-50">
            {cashedOut ? "Cashed Out!" : `CASH OUT (${Math.round(stake * multiplier)} credits)`}
          </button>
        ) : (
          <button id="aerocash-bet" onClick={() => {
            if (stake > balance) return;
            withdraw(stake); setHasBet(true); setCashedOut(false); setMultiplier(1.0); setGameState("RUNNING");
          }} disabled={stake > balance}
            className="w-full h-12 rounded-xl bg-[#F5C400] hover:bg-[#e0b300] text-black font-black text-sm uppercase shadow-md transition-all disabled:opacity-40">
            PLACE BET ({stake} credits)
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Mines ────────────────────────────────────────────────────────────────────
function MinesGame() {
  const { balance, withdraw, deposit } = useDemoWallet();
  const [minesStake, setMinesStake] = useState(50);
  const [minesCount, setMinesCount] = useState(5);
  const [grid, setGrid] = useState<Array<"hidden" | "safe" | "mine">>(Array(25).fill("hidden"));
  const [active, setActive] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [winAmt, setWinAmt] = useState(0);
  const [minePos, setMinePos] = useState<number[]>([]);
  const [safes, setSafes] = useState(0);

  const mult = 1 + safes * (0.15 + minesCount * 0.04);

  const start = () => {
    if (minesStake > balance) return;
    withdraw(minesStake);
    const pos: number[] = [];
    while (pos.length < minesCount) { const r = Math.floor(Math.random() * 25); if (!pos.includes(r)) pos.push(r); }
    setMinePos(pos); setGrid(Array(25).fill("hidden")); setActive(true); setCashedOut(false); setWinAmt(0); setSafes(0);
  };
  const clickCell = (idx: number) => {
    if (!active || grid[idx] !== "hidden" || cashedOut) return;
    const newGrid = [...grid];
    if (minePos.includes(idx)) { newGrid[idx] = "mine"; minePos.forEach(p => { newGrid[p] = "mine"; }); setGrid(newGrid); setActive(false); }
    else { newGrid[idx] = "safe"; setGrid(newGrid); setSafes(p => p + 1); }
  };
  const cashOut = () => {
    const win = Math.round(minesStake * mult);
    deposit(win); setWinAmt(win); setCashedOut(true); setActive(false);
    const g = [...grid]; minePos.forEach(p => { if (g[p] === "hidden") g[p] = "mine"; }); setGrid(g);
  };

  return (
    <div className="p-3 max-w-lg mx-auto w-full space-y-3">
      <div className="bg-[#0e1520] border border-[#1a2840] rounded-2xl p-4 flex items-center justify-between">
        {[{ label: "Mines", value: minesCount, color: "text-white" }, { label: "Safe Found", value: safes, color: "text-green-400" }, { label: "Multiplier", value: `${mult.toFixed(2)}x`, color: "text-[#F5C400]" }].map(s => (
          <div key={s.label} className="text-center">
            <p className="text-[10px] text-gray-500 font-bold uppercase">{s.label}</p>
            <p className={cn("text-2xl font-black font-mono", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {grid.map((cell, idx) => (
          <button key={idx} id={`mine-cell-${idx}`} onClick={() => clickCell(idx)} disabled={!active || cell !== "hidden"}
            className={cn("h-12 rounded-xl font-black text-lg transition-all border active:scale-95",
              cell === "hidden" &&  active && "bg-[#141c2e] border-[#243248] hover:border-[#F5C400]/50",
              cell === "hidden" && !active && "bg-[#0d1220] border-[#1a2235] opacity-40",
              cell === "safe"   && "bg-green-900/50 border-green-600 text-green-400",
              cell === "mine"   && "bg-red-900/50   border-red-600   text-red-400")}>
            {cell === "safe" && "💎"}{cell === "mine" && "💣"}
          </button>
        ))}
      </div>
      <div className="bg-[#0e1520] border border-[#1a2840] rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-extrabold text-gray-500 uppercase">Stake (credits)</label>
            <input id="mines-stake" type="number" value={minesStake} onChange={e => setMinesStake(Number(e.target.value))} disabled={active}
              className="w-full mt-1 bg-[#141c2e] border border-[#243248] rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-[#F5C400]" />
          </div>
          <div>
            <label className="text-[10px] font-extrabold text-gray-500 uppercase">Mines Count</label>
            <input id="mines-count" type="number" value={minesCount} onChange={e => setMinesCount(Math.min(24, Math.max(1, Number(e.target.value))))} disabled={active}
              className="w-full mt-1 bg-[#141c2e] border border-[#243248] rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-[#F5C400]" />
          </div>
        </div>
        {cashedOut && (
          <div className="text-center bg-green-900/30 border border-green-700/50 rounded-xl p-3">
            <p className="text-green-400 font-black text-lg">+{winAmt} credits</p>
            <p className="text-xs text-gray-400">Cashed out!</p>
          </div>
        )}
        {!active ? (
          <button id="mines-start" onClick={start} disabled={minesStake > balance}
            className="w-full h-12 rounded-xl bg-[#F5C400] hover:bg-[#e0b300] text-black font-black uppercase shadow-md transition-all disabled:opacity-40">
            Start Game ({minesStake} credits)
          </button>
        ) : (
          <button id="mines-cashout" onClick={cashOut} disabled={safes === 0}
            className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black uppercase shadow-md transition-all disabled:opacity-40">
            Cash Out ({Math.round(minesStake * mult)} credits)
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Dice/Slots (generic for other games) ────────────────────────────────────
function DiceGame() {
  const { balance, withdraw, deposit } = useDemoWallet();
  const SYMS = ["🍒", "🍋", "🍇", "⭐", "💎", "7️⃣", "🔔"];
  const [reels, setReels] = useState([SYMS[0], SYMS[1], SYMS[2]]);
  const [spinning, setSpinning] = useState(false);
  const [slotResult, setSlotResult] = useState<string | null>(null);
  const [slotStake, setSlotStake] = useState(20);
  const [diceStake, setDiceStake] = useState(50);
  const [target, setTarget] = useState(50);
  const [over, setOver] = useState(true);
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [diceWon, setDiceWon] = useState<boolean | null>(null);

  const winChance = over ? 100 - target : target;
  const diceMult = winChance > 0 ? (95 / winChance).toFixed(2) : "0.00";

  const spin = () => {
    if (slotStake > balance) return;
    withdraw(slotStake); setSpinning(true); setSlotResult(null);
    let n = 0;
    const iv = setInterval(() => {
      setReels([SYMS[Math.floor(Math.random() * 7)], SYMS[Math.floor(Math.random() * 7)], SYMS[Math.floor(Math.random() * 7)]]);
      n++;
      if (n >= 18) {
        clearInterval(iv);
        const f = [SYMS[Math.floor(Math.random() * 7)], SYMS[Math.floor(Math.random() * 7)], SYMS[Math.floor(Math.random() * 7)]];
        if (Math.random() < 0.20) f[1] = f[0] = f[2];
        setReels(f); setSpinning(false);
        if (f[0] === f[1] && f[1] === f[2]) { deposit(slotStake * 10); setSlotResult(`JACKPOT! +${slotStake * 10} credits`); }
        else if (f[0] === f[1] || f[1] === f[2] || f[0] === f[2]) { deposit(slotStake * 2); setSlotResult(`WIN! +${slotStake * 2} credits`); }
        else setSlotResult("No match. Try again!");
      }
    }, 80);
  };

  const roll = () => {
    if (diceStake > balance) return;
    withdraw(diceStake);
    const r = Math.floor(Math.random() * 100) + 1;
    const won = over ? r > target : r < target;
    setDiceResult(r); setDiceWon(won);
    if (won) deposit(Math.round(diceStake * Number(diceMult)));
  };

  return (
    <div className="p-3 max-w-lg mx-auto w-full space-y-4">
      {/* Slots */}
      <div className="bg-[#0e1520] border border-[#1a2840] rounded-2xl p-5 text-center space-y-4">
        <div className="flex justify-center gap-3">
          {reels.map((s, i) => (
            <div key={i} className={cn("w-20 h-20 rounded-2xl border-2 flex items-center justify-center text-4xl transition-all",
              spinning ? "border-[#F5C400] bg-[#1a1500] animate-pulse" : "border-[#243248] bg-[#141c2e]")}>{s}</div>
          ))}
        </div>
        {slotResult && (
          <div className={cn("text-sm font-black rounded-xl p-3 border",
            slotResult.includes("JACKPOT") ? "bg-amber-900/30 text-[#F5C400] border-amber-700/50" :
            slotResult.includes("WIN")     ? "bg-green-900/30 text-green-400 border-green-700/50"  :
                                             "bg-[#141c2e] text-gray-400 border-[#243248]")}>
            {slotResult.includes("JACKPOT") && <Star className="h-4 w-4 inline mr-1" />}{slotResult}
          </div>
        )}
        <div className="flex items-center gap-2 justify-center">
          <input id="slots-stake" type="number" value={slotStake} onChange={e => setSlotStake(Number(e.target.value))} disabled={spinning}
            className="w-28 bg-[#141c2e] border border-[#243248] rounded-xl px-3 py-2 text-white font-mono font-bold text-sm text-center focus:outline-none focus:border-[#F5C400]" />
          <button id="slots-spin" onClick={spin} disabled={spinning}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#F5C400] hover:bg-[#e0b300] text-black font-black text-sm uppercase shadow-md transition-all disabled:opacity-40">
            {spinning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
            {spinning ? "Spinning..." : "SPIN"}
          </button>
        </div>
      </div>

      {/* Dice */}
      <div className="bg-[#0e1520] border border-[#1a2840] rounded-2xl p-4 space-y-3">
        <p className="text-xs font-black text-gray-400 uppercase tracking-wider">🎲 Quick Dice</p>
        {diceResult !== null && (
          <div className={cn("rounded-xl p-3 text-center border", diceWon ? "bg-green-900/30 border-green-700/50" : "bg-red-900/30 border-red-800/50")}>
            <div className={cn("text-4xl font-black font-mono", diceWon ? "text-green-400" : "text-red-400")}>{diceResult}</div>
            <div className={cn("text-xs font-black uppercase mt-1", diceWon ? "text-green-400" : "text-red-400")}>
              {diceWon ? `WIN! +${Math.round(diceStake * Number(diceMult))} credits` : "LOST — Try again!"}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {[{ label: "Roll Over", val: true }, { label: "Roll Under", val: false }].map(o => (
            <button key={String(o.val)} id={`dice-${String(o.val)}`} onClick={() => setOver(o.val)}
              className={cn("py-2 rounded-xl text-xs font-black border transition-all",
                over === o.val ? "bg-[#F5C400] border-transparent text-black" : "bg-[#141c2e] border-[#243248] text-gray-400")}>
              {o.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[{ label: "Target", val: target, color: "text-white" }, { label: "Win Chance", val: `${winChance}%`, color: "text-green-400" }, { label: "Multiplier", val: `${diceMult}x`, color: "text-[#F5C400]" }].map(s => (
            <div key={s.label}><p className="text-[9px] text-gray-500 uppercase font-bold">{s.label}</p><p className={cn("text-base font-black font-mono", s.color)}>{s.val}</p></div>
          ))}
        </div>
        <input id="dice-target" type="range" min={5} max={95} value={target} onChange={e => setTarget(Number(e.target.value))} className="w-full accent-[#F5C400]" />
        <div className="flex gap-2">
          <input id="dice-stake" type="number" value={diceStake} onChange={e => setDiceStake(Number(e.target.value))}
            className="flex-1 bg-[#141c2e] border border-[#243248] rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-[#F5C400]" />
          <button id="dice-roll" onClick={roll} disabled={diceStake > balance}
            className="flex items-center gap-2 px-5 rounded-xl bg-[#F5C400] hover:bg-[#e0b300] text-black font-black text-sm uppercase transition-all disabled:opacity-40">
            <RefreshCw className="h-4 w-4" /> Roll
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
function GamesPage() {
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  return (
    <>
      <DemoBanner />
      {activeGame ? (
        <GameShell gameId={activeGame} onBack={() => setActiveGame(null)} />
      ) : (
        <CasinoLobby onSelect={(id) => setActiveGame(id)} />
      )}
    </>
  );
}
