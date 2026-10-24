import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, Share2, Sparkles, Trophy, CheckCircle2, ChevronRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { formatGHS, type Selection } from "@/store/betrix";
import { cn } from "@/lib/utils";

export interface WinningCupModalProps {
  isOpen: boolean;
  onClose: () => void;
  payout: number;
  code?: string | undefined;
  matchTitle?: string | undefined;
  selections?: Selection[] | undefined;
  stake?: number | undefined;
  onNextRound?: (() => void) | undefined;
}

/**
 * Plays a triumphant, crisp harmonic victory fanfare using the Web Audio API.
 * Synthesizes pure pleasant audio without external sound asset dependencies.
 */
function playVictorySound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => undefined);
    }

    // Melodic fanfare notes: C5, E5, G5, high C6
    const notes = [
      { f: 523.25, time: 0.0, dur: 0.25 },
      { f: 659.25, time: 0.14, dur: 0.25 },
      { f: 783.99, time: 0.28, dur: 0.35 },
      { f: 1046.5, time: 0.44, dur: 0.75 },
    ];

    notes.forEach(({ f, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, ctx.currentTime + time);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + dur + 0.05);
    });
  } catch {
    // Audio autoplay restrictions or unsupported browser; silent fallback
  }
}

/**
 * Lightweight, high-performance canvas confetti celebration.
 */
function launchConfetti(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
  const h = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

  const colors = [
    "#FFD700", // Gold
    "#FFA500", // Amber
    "#00E676", // Bright Green
    "#00C853", // Deep Green
    "#FFFFFF", // White
    "#FF5252", // Accent Red
  ];

  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    rotation: number;
    vRot: number;
    opacity: number;
  }

  const particles: Particle[] = [];
  const count = 100;

  for (let i = 0; i < count; i++) {
    const isLeft = Math.random() < 0.5;
    particles.push({
      x: isLeft ? w * 0.15 + (Math.random() * 50 - 25) : w * 0.85 + (Math.random() * 50 - 25),
      y: h * 0.85,
      vx: (isLeft ? 1 : -1) * (Math.random() * 7 + 2) + (Math.random() * 4 - 2),
      vy: -(Math.random() * 11 + 9),
      size: Math.random() * 8 + 5,
      color: colors[Math.floor(Math.random() * colors.length)]!,
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 12,
      opacity: 1,
    });
  }

  let animId: number;
  const startTime = Date.now();

  function render() {
    if (!ctx) return;
    const elapsed = Date.now() - startTime;
    ctx.clearRect(0, 0, w, h);

    let active = false;
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.32; // Gravity
      p.vx *= 0.985; // Air drag
      p.rotation += p.vRot;

      if (elapsed > 2000) {
        p.opacity = Math.max(0, p.opacity - 0.02);
      }

      if (p.opacity > 0 && p.y < h + 50) {
        active = true;
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
        ctx.restore();
      }
    }

    if (active && elapsed < 4500) {
      animId = requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, w, h);
    }
  }

  render();
  return () => cancelAnimationFrame(animId);
}

export function WinningCupCelebrationModal({
  isOpen,
  onClose,
  payout,
  code,
  matchTitle,
  selections,
  stake,
  onNextRound,
}: WinningCupModalProps) {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showMatchesList, setShowMatchesList] = useState(false);
  const [copied, setCopied] = useState(false);

  // Play sound and trigger confetti whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    playVictorySound();
    const timer = setTimeout(() => {
      launchConfetti(canvasRef.current);
    }, 150);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleShowOff = useCallback(() => {
    launchConfetti(canvasRef.current);
    const amountStr = formatGHS(payout);
    const codeStr = code ? ` Booking Code: ${code}` : "";
    const textToShare = `🏆 I JUST WON ${amountStr} on BETRIX! ⚡⚽ Check my winning bet!${codeStr} #BETRIX #Winner`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToShare).then(() => {
        setCopied(true);
        toast.success("🎉 Winning slip copied to clipboard!", {
          description: "Share your glory with friends or on social media!",
          duration: 4000,
        });
        setTimeout(() => setCopied(false), 3000);
      });
    } else {
      toast.success("🎉 YOU WON! Show off your trophy!", { duration: 3000 });
    }
  }, [payout, code]);

  const handleNextRound = useCallback(() => {
    onClose();
    if (onNextRound) {
      onNextRound();
    } else {
      navigate({ to: "/live" });
    }
  }, [onClose, onNextRound, navigate]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Winning Cup Celebration"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in-0 duration-300"
    >
      {/* Confetti canvas overlay */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-40 h-full w-full"
      />

      {/* Main Winning Card Container */}
      <div className="relative z-30 w-full max-w-[420px] mx-auto flex flex-col items-center text-center select-none py-2">
        {/* Top Close Button (✕) */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close celebration"
          className="absolute -top-1 sm:top-0 right-1 sm:right-2 z-50 p-2 text-white/80 hover:text-white rounded-full bg-black/40 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
        >
          <X className="h-6 w-6 stroke-[2.5]" />
        </button>

        {/* ── 1. HEADLINE: "YOU WON" ── */}
        <div className="space-y-1 pt-2 sm:pt-4">
          <h2
            className="text-4xl sm:text-5xl font-black tracking-wider text-[#FFDE00] uppercase drop-shadow-[0_2px_12px_rgba(255,222,0,0.6)]"
            style={{
              textShadow:
                "0 0 20px rgba(255, 222, 0, 0.75), 0 0 40px rgba(245, 196, 0, 0.45), 0 2px 4px rgba(0,0,0,0.9)",
              letterSpacing: "0.04em",
            }}
          >
            YOU WON
          </h2>

          {/* ── 2. WIN AMOUNT: "GHS 5,394.17" ── */}
          <div
            className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-md"
            style={{
              textShadow: "0 2px 8px rgba(0,0,0,0.8), 0 0 25px rgba(255,255,255,0.3)",
            }}
          >
            {formatGHS(payout)}
          </div>
        </div>

        {/* ── 3. GLOWING WINNING CUP GRAPHIC ── */}
        <div className="relative w-full max-w-[340px] sm:max-w-[370px] aspect-square flex items-center justify-center my-1 sm:my-2">
          {/* Layer A: Radial Sunburst Light Rays Beam (Rotating gently in background) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-70 animate-[spin_55s_linear_infinite]">
            <svg
              viewBox="0 0 400 400"
              className="w-full h-full"
              style={{ filter: "drop-shadow(0 0 15px rgba(255, 215, 0, 0.5))" }}
            >
              <defs>
                <radialGradient id="rayGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FFF275" stopOpacity="0.8" />
                  <stop offset="35%" stopColor="#FFD700" stopOpacity="0.45" />
                  <stop offset="70%" stopColor="#FFA000" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#FF8F00" stopOpacity="0" />
                </radialGradient>
              </defs>
              {Array.from({ length: 24 }).map((_, i) => {
                const angle = (i * 360) / 24;
                return (
                  <path
                    key={i}
                    d="M 200 200 L 192 10 L 208 10 Z"
                    fill="url(#rayGrad)"
                    transform={`rotate(${angle} 200 200)`}
                  />
                );
              })}
            </svg>
          </div>

          {/* Layer B: Glowing Inverted Geometric Double-Triangle Accent */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg
              viewBox="0 0 360 360"
              className="w-[85%] h-[85%]"
              style={{
                filter:
                  "drop-shadow(0 0 12px #FFD700) drop-shadow(0 0 28px rgba(255, 165, 0, 0.7))",
              }}
            >
              {/* Outer inverted neon golden triangle */}
              <polygon
                points="40,65 320,65 180,310"
                fill="none"
                stroke="#FFE57F"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.9"
              />
              {/* Inner subtle inverted triangle frame */}
              <polygon
                points="55,75 305,75 180,295"
                fill="none"
                stroke="#FFD54F"
                strokeWidth="1.5"
                opacity="0.5"
              />
            </svg>
          </div>

          {/* Layer C: Warm Golden Ambient Glow Core */}
          <div
            className="absolute w-[65%] h-[65%] rounded-full pointer-events-none blur-2xl animate-pulse"
            style={{
              background:
                "radial-gradient(circle, rgba(255, 215, 0, 0.5) 0%, rgba(255, 179, 0, 0.25) 45%, transparent 75%)",
            }}
          />

          {/* Layer D: Sparkles and Light Flairs */}
          <div className="absolute inset-0 pointer-events-none">
            <Sparkles className="absolute top-8 left-10 h-5 w-5 text-[#FFF59D] animate-ping duration-1000 opacity-75" />
            <Sparkles className="absolute top-12 right-12 h-6 w-6 text-[#FFD54F] animate-pulse duration-700 opacity-90" />
            <Sparkles className="absolute bottom-16 left-12 h-4 w-4 text-[#FFF9C4] animate-bounce duration-1000 opacity-80" />
            <Sparkles className="absolute bottom-14 right-14 h-5 w-5 text-[#FFE082] animate-pulse duration-500 opacity-75" />
          </div>

          {/* Layer E: The Golden Trophy Image */}
          <div className="relative z-10 w-[88%] h-[88%] flex items-center justify-center">
            <img
              src="/winning-cup.jpg"
              alt="Golden Winning Trophy Cup"
              className="w-full h-full object-contain rounded-2xl drop-shadow-[0_0_30px_rgba(255,215,0,0.65)] hover:scale-105 transition-transform duration-500"
              style={{
                maskImage: "radial-gradient(circle at 50% 50%, black 68%, transparent 100%)",
                WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 68%, transparent 100%)",
              }}
            />
          </div>
        </div>

        {/* ── 4. BRAND PILL BADGE: "From BETRIX Instant Virtuals" ── */}
        <div className="mt-[-8px] mb-4 sm:mb-5 z-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#16161c]/90 border border-[#2b2b36] shadow-[0_4px_16px_rgba(0,0,0,0.6)] backdrop-blur-sm">
            {/* Red circular badge with 'B' / Betrix icon */}
            <div className="h-4 w-4 rounded-full bg-[#E41B23] flex items-center justify-center text-white text-[10px] font-black shadow-[0_0_8px_rgba(228,27,35,0.7)]">
              B
            </div>
            <span className="text-xs font-bold text-gray-200 tracking-wide">
              From BETRIX Instant Virtuals
            </span>
          </div>
        </div>

        {/* ── 5. WINNING MATCH DETAILS ACCORDION (Matches underlying media context) ── */}
        {(selections && selections.length > 0) || matchTitle ? (
          <div className="w-full mb-4 px-1">
            <button
              type="button"
              onClick={() => setShowMatchesList((prev) => !prev)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#15171e]/80 border border-[#242733] text-xs text-gray-300 hover:text-white hover:border-[#333748] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-1.5 truncate">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#00E676] shrink-0" />
                <span className="font-semibold truncate">
                  {matchTitle || `${selections?.length || 1} Winning Selection${(selections?.length || 1) > 1 ? "s" : ""}`}
                </span>
                {code && (
                  <span className="text-[10px] font-mono font-bold text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-400/20">
                    {code}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-[#00E676] font-bold shrink-0 ml-2">
                {showMatchesList ? "Hide Legs" : "View Legs"}
              </span>
            </button>

            {/* Expanded selections list matching the background of user's media */}
            {showMatchesList && selections && (
              <div className="mt-1.5 p-2.5 rounded-lg bg-[#101217]/95 border border-[#232635] text-left space-y-2 max-h-48 overflow-y-auto no-scrollbar animate-in slide-in-from-top-2 duration-200">
                {selections.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs border-b border-[#1c1f2b] last:border-b-0 pb-1.5 last:pb-0"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1 text-[11px] text-gray-400">
                        <CheckCircle2 className="h-3 w-3 text-[#00E676] shrink-0" />
                        <span className="truncate font-semibold text-gray-200">{s.matchTitle}</span>
                      </div>
                      <div className="text-[10px] text-yellow-400/90 font-medium pl-4">
                        Pick: <strong className="text-white">{s.optionLabel}</strong> ({s.marketName})
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-mono font-black text-[#00E676] bg-[#00E676]/10 px-1.5 py-0.5 rounded border border-[#00E676]/20">
                        @{s.multiplier.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* ── 6. ACTION BUTTONS: "Show Off" & "Next Round" ── */}
        <div className="grid grid-cols-2 gap-3 w-full">
          {/* "Show Off" Button (Dark with Crisp Green Border) */}
          <button
            type="button"
            onClick={handleShowOff}
            className="w-full border-2 border-[#00C853] bg-[#00C853]/10 hover:bg-[#00C853]/20 active:scale-95 text-[#00E676] font-black text-sm sm:text-base py-3 sm:py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(0,200,83,0.2)] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Share2 className="h-4 w-4" />
            <span>{copied ? "Copied!" : "Show Off"}</span>
          </button>

          {/* "Next Round" Button (Solid Vibrant Green) */}
          <button
            type="button"
            onClick={handleNextRound}
            className="w-full bg-[#00C853] hover:bg-[#00E676] active:scale-95 text-black font-black text-sm sm:text-base py-3 sm:py-3.5 rounded-xl transition-all shadow-[0_4px_22px_rgba(0,200,83,0.45)] hover:shadow-[0_4px_28px_rgba(0,230,118,0.65)] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Next Round</span>
            <ChevronRight className="h-4 w-4 stroke-[3]" />
          </button>
        </div>

        {/* ── 7. FOOTER PEEK BAR (Matches screenshot bottom preview) ── */}
        <div className="w-full mt-4 pt-2.5 border-t border-[#1f222c] flex items-center justify-between text-xs text-gray-400 px-1">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate({ to: "/history" });
            }}
            className="hover:text-white transition-colors flex items-center gap-1 font-semibold cursor-pointer"
          >
            <span>View Details in My Bets</span>
            <ExternalLink className="h-3 w-3" />
          </button>

          <span className="font-mono text-xs text-gray-300">
            Total Won: <strong className="text-[#00E676] font-black">{formatGHS(payout)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
