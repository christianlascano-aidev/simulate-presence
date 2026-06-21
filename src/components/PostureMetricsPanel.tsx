import React from "react";
import { PoseMetrics } from "../types";
import { ShieldAlert, CheckCircle, HelpCircle, Activity } from "lucide-react";

interface Props {
  metrics: PoseMetrics | null;
}

export default function PostureMetricsPanel({ metrics }: Props) {
  if (!metrics) {
    return (
      <div className="bg-slate-900/80 border border-slate-850 rounded-2xl p-6 flex flex-col items-center justify-center h-[340px] text-center">
        <Activity className="w-8 h-8 text-airline-gold/40 animate-pulse mb-3" />
        <h3 className="font-display font-semibold text-slate-300">Awaiting Real-time Skeleton</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
          Please position yourself in front of the camera. Ensure your ears, shoulders, and hips are visible.
        </p>
      </div>
    );
  }

  const slouchingPercentage = Math.min(100, Math.max(0, (metrics.earShoulderHipAngle / 180) * 100));

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 glow-navy flex flex-col justify-between h-full relative overflow-hidden">
      {/* Visual Accent */}
      <div className="absolute top-0 left-0 w-1.5 h-full bg-airline-gold" />
      
      <div>
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-airline-gold/10 border border-airline-gold/30">
              <Activity className="w-4 h-4 text-airline-gold" />
            </span>
            <h2 className="font-display text-base font-bold text-white uppercase tracking-wider">
              Posture & Spine Alignment
            </h2>
          </div>
          {metrics.isSlouching || metrics.isUnevenStance ? (
            <span className="bg-red-500/20 text-red-400 font-mono text-xs px-2.5 py-1 rounded-full border border-red-500/30 flex items-center gap-1 animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5" />
              FLAGGED
            </span>
          ) : (
            <span className="bg-emerald-500/20 text-emerald-400 font-mono text-xs px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              OPTIMAL
            </span>
          )}
        </div>

        {/* Real-time Dials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          
          {/* Ear-Shoulder-Hip Angle Circular Gauge */}
          <div className="bg-slate-950/50 border border-slate-850/60 rounded-xl p-4 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">
              Spine Angle (Ear-Shoulder-Hip)
            </span>
            <div className="relative w-28 h-28 flex items-center justify-center">
              {/* Clean custom SVG polar progress bar */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r="45"
                  className="stroke-slate-800"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="56"
                  cy="56"
                  r="45"
                  className={metrics.isSlouching ? "stroke-red-500 transition-all duration-300" : "stroke-airline-gold transition-all duration-300"}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={282}
                  strokeDashoffset={282 - (282 * (Math.min(180, metrics.earShoulderHipAngle) / 180))}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="font-display text-2xl font-bold text-white tracking-tighter">
                  {metrics.earShoulderHipAngle}°
                </span>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Target: &gt;165°
                </span>
              </div>
            </div>

            <div className="mt-3">
              {metrics.isSlouching ? (
                <div className="bg-red-500/10 text-red-400 font-display text-xs font-semibold py-1 px-3 rounded-full border border-red-500/20">
                  ⚠️ Slouching Detected
                </div>
              ) : (
                <div className="bg-emerald-500/10 text-emerald-400 font-display text-xs font-semibold py-1 px-3 rounded-full border border-emerald-500/20 animate-pulse">
                  ✓ Excellent Spine Alignment
                </div>
              )}
            </div>
          </div>

          {/* Shoulder Leveling spirit-meter */}
          <div className="bg-slate-950/50 border border-slate-850/60 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  Shoulder Balance
                </span>
                <span className="text-[11px] font-mono text-slate-300 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5">
                  Tilt: {metrics.shoulderYDiffPercent}%
                </span>
              </div>
              
              {/* Clean Balance Indicator Bubble Level */}
              <div className="relative h-6 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center overflow-hidden my-3">
                {/* Center marker line */}
                <div className="absolute left-1/2 w-0.5 h-full bg-airline-gold/40 z-10" />
                <div className="absolute left-[calc(50%-10%)] w-[20%] h-full border-x border-dashed border-slate-700/60 z-0" />
                
                {/* Bubble representing left-to-right tilt */}
                {/* Center is left: 50%. Max offset will be +/- 40% */}
                {(() => {
                  const limitOffset = 40;
                  const delta = (metrics.leftShoulderY - metrics.rightShoulderY) * 300;
                  const offset = Math.min(limitOffset, Math.max(-limitOffset, delta));
                  return (
                    <div 
                      className={`absolute w-3.5 h-3.5 rounded-full transition-all duration-300 shadow-md ${
                        metrics.isUnevenStance 
                          ? "bg-red-500 shadow-red-500/30" 
                          : "bg-airline-gold shadow-airline-gold/30"
                      }`}
                      style={{ left: `calc(50% + ${offset}%)` }}
                    />
                  );
                })()}
              </div>
            </div>

            <div className="mt-2">
              {metrics.isUnevenStance ? (
                <div className="bg-red-500/10 text-red-500 border border-red-500/15 p-2 rounded-lg text-xs">
                  <p className="font-bold">⚠️ Uneven Stance</p>
                  <p className="text-[10px] text-red-400 mt-0.5 leading-relaxed">
                    Left/Right shoulders vertically misaligned. Keep shoulders level and parallel.
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 p-2 rounded-lg text-xs">
                  <p className="font-bold">✓ Shouldes Are Balanced</p>
                  <p className="text-[10px] text-emerald-300 mt-0.5 leading-relaxed">
                    Equal vertical shoulder distribution maintained. Professional posture active.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Trainee Tip */}
      <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg text-[11px] text-slate-400 leading-relaxed flex gap-2 items-start mt-2">
        <HelpCircle className="w-4 h-4 text-airline-gold shrink-0 mt-0.5" />
        <span>
          <strong>Pro-Aviation Standard:</strong> Stand tall as if a string is pulling the crown of your head upward. Lift your chest slightly and roll your shoulders back and down.
        </span>
      </div>
    </div>
  );
}
