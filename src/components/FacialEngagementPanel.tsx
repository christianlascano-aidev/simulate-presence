import React from "react";
import { FacialMetrics } from "../types";
import { Smile, Eye, MessageSquare, Sparkles } from "lucide-react";

interface Props {
  metrics: FacialMetrics | null;
}

export default function FacialEngagementPanel({ metrics }: Props) {
  if (!metrics) {
    return (
      <div className="bg-slate-900/80 border border-slate-850 rounded-2xl p-6 flex flex-col items-center justify-center h-[340px] text-center">
        <Smile className="w-8 h-8 text-airline-gold/40 animate-pulse mb-3" />
        <h3 className="font-display font-semibold text-slate-300">Awaiting Face Mesh</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
          Please align your face in the camera mirror. Ensure your eyes and mouth are completely unobstructed.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 glow-navy flex flex-col justify-between h-full relative overflow-hidden">
      {/* Visual Accent */}
      <div className="absolute top-0 left-0 w-1.5 h-full bg-airline-gold" />

      <div>
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-airline-gold/10 border border-airline-gold/30">
              <Smile className="w-4 h-4 text-airline-gold" />
            </span>
            <h2 className="font-display text-base font-bold text-white uppercase tracking-wider">
              Facial Engagement & Warmth
            </h2>
          </div>
          <span className="bg-airline-gold/15 text-airline-gold font-mono text-xs px-2.5 py-1 rounded-full border border-airline-gold/20 flex items-center gap-1">
            <Sparkles className="w-3" />
            LIVE FEED
          </span>
        </div>

        {/* Engagement Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          
          {/* Left Column: Smile & Approachability Progress Indicators */}
          <div className="space-y-4">
            
            {/* Smile Rate Progress */}
            <div className="bg-slate-950/40 border border-slate-850/60 rounded-xl p-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
                  <Smile className="w-4 h-4 text-pink-500" />
                  Smile Intensity
                </span>
                <span className="text-sm font-bold text-white font-mono">{metrics.smileRate}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-gradient-to-r from-pink-500 to-airline-gold transition-all duration-300 rounded-full"
                  style={{ width: `${metrics.smileRate}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-[10px] text-slate-500 font-mono">NEUTRAL</span>
                <span className="text-[10px] text-airline-gold font-bold font-mono">WARM WELCOME</span>
              </div>
              {metrics.smileRate < 25 ? (
                <p className="text-[10px] text-slate-400 mt-2 leading-tight">
                  💡 Trainees are encouraged to carry a cordial smile. Try lifting the corners of your mouth.
                </p>
              ) : (
                <p className="text-[10px] text-emerald-400 mt-2 leading-tight font-semibold flex items-center gap-1">
                  ✓ Warm expression, highly welcoming to passengers!
                </p>
              )}
            </div>

            {/* Approachability (Brow Status) */}
            <div className="bg-slate-950/40 border border-slate-850/60 rounded-xl p-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-airline-gold" />
                  Hostility Brow Defense
                </span>
                <span className="text-sm font-bold text-white font-mono">{metrics.approachabilityScore}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-400 transition-all duration-300 rounded-full"
                  style={{ width: `${metrics.approachabilityScore}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-[10px] text-[RGBA(239,68,68,1)] font-mono uppercase">Furrowed</span>
                <span className="text-[10px] text-emerald-400 font-mono uppercase font-bold">Relaxed</span>
              </div>
              {metrics.approachabilityScore < 40 ? (
                <p className="text-[10px] text-red-400 mt-2 leading-tight">
                  ⚠️ Tension detected in brow. Avoid frowning or scowling. Relax your eyebrows for an approachable look.
                </p>
              ) : (
                <p className="text-[10px] text-emerald-400 mt-2 leading-tight font-semibold">
                  ✓ Soft, relaxed eye stance. Inspires trust and security!
                </p>
              )}
            </div>

          </div>

          {/* Right Column: Eye Contact Gaze Vector Radar Crosshair */}
          <div className="bg-slate-950/40 border border-slate-850/60 rounded-xl p-4 flex flex-col items-center justify-between">
            <div className="w-full flex justify-between items-center border-b border-slate-900 pb-2 mb-2">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-airline-gold" />
                Gaze Vector Radar (Eye Contact)
              </span>
              <span className="text-xs font-mono font-bold text-[#FFF] bg-airline-gold/25 px-2 py-0.5 rounded border border-airline-gold/30">
                {metrics.eyeContactScore}% FIT
              </span>
            </div>

            {/* Radar layout */}
            <div className="relative w-28 h-28 border border-slate-800 rounded-full bg-slate-900 flex items-center justify-center my-1 shadow-inner overflow-hidden">
              {/* Concentric helper rings */}
              <div className="absolute w-[75%] h-[75%] border border-[#1E293B] rounded-full border-dashed" />
              <div className="absolute w-[50%] h-[50%] border border-[#334155] rounded-full" />
              <div className="absolute w-[25%] h-[25%] border border-[#D4AF37]/20 rounded-full" />
              
              {/* Horizontal and vertical radar crosshairs */}
              <div className="absolute w-full h-[1px] bg-slate-800/60" />
              <div className="absolute h-full w-[1px] bg-slate-800/60" />

              {/* Glowing Gaze dot representing offset */}
              {/* Center is at 50% left, 50% top. Offset calculations range from -0.5 to +0.5.
                 We multiply by 100 to map it cleanly to percentage inside container. */}
              {(() => {
                const limitSide = 40; // Max offset from center in percent
                // Offset is divided by normal scale
                const xVal = ((metrics.eyeOffsetLeftX + metrics.eyeOffsetRightX) / 2) * 500;
                // Since vertical offset tracking falls around 0.5 center, let's keep vertical coordinate clean
                // We map to center screen vertically
                const yOffsetScaled = (metrics.eyeOffsetLeftX - 0.1) * 300; 

                const leftPct = Math.min(limitSide, Math.max(-limitSide, xVal));
                const topPct = Math.min(limitSide, Math.max(-limitSide, yOffsetScaled));

                return (
                  <div 
                    className={`absolute w-3.5 h-3.5 rounded-full transition-all duration-3 gap-0 shadow-lg ${
                      metrics.eyeContactScore > 75 
                        ? "bg-emerald-400 shadow-emerald-400/50" 
                        : "bg-red-500 shadow-red-500/50"
                    }`}
                    style={{ 
                      transform: `translate(${leftPct}px, ${topPct}px)` 
                    }}
                  />
                );
              })()}
            </div>

            <div className="w-full text-center mt-1">
              {metrics.eyeContactScore > 75 ? (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 py-0.5 px-2.5 rounded border border-emerald-500/10 font-medium">
                  ✓ High-Quality Eye Contact
                </span>
              ) : (
                <span className="text-[10px] text-red-400 bg-red-500/10 py-0.5 px-2.5 rounded border border-red-500/10 font-medium">
                  ⚠️ Eyes Wandering - Look at Camera
                </span>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Flight Tip */}
      <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg text-[11px] text-slate-400 leading-relaxed flex gap-2 items-start mt-2">
        <Sparkles className="w-4 h-4 text-airline-gold shrink-0 mt-0.5 animate-bounce" />
        <span>
          <strong>Why it matters:</strong> Consistent eye contact establishes sincerity and trustworthiness. Smiling as you make eye contact creates the signature "SkyHigh Premium First-Class" welcome.
        </span>
      </div>
    </div>
  );
}
