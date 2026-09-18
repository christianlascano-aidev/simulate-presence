import React from "react";
import { PoseMetrics } from "../types";
import { ShieldAlert, CheckCircle, HelpCircle, Activity, Hand } from "lucide-react";

interface Props {
  metrics: PoseMetrics | null;
}

export default function PostureMetricsPanel({ metrics }: Props) {
  if (!metrics) {
    return (
      <div className="bg-slate-900/80 border border-slate-850 rounded-2xl p-4 flex flex-col items-center justify-center h-full text-center">
        <Activity className="w-8 h-8 text-airline-gold/40 animate-pulse mb-2" />
        <h3 className="font-display font-semibold text-slate-300">Awaiting Pose & Hand Tracking</h3>
        <p className="text-[11px] text-slate-500 mt-1 max-w-[240px]">
          Please position yourself in front of the camera. Ensure your upper body and hands are visible.
        </p>
      </div>
    );
  }

  const slouchingPercentage = Math.min(100, Math.max(0, (metrics.earShoulderHipAngle / 180) * 100));
  const hasPostureIssue = metrics.isSlouching || metrics.isUnevenStance || metrics.isHandsTouchFace || metrics.isHandsFolded;

  return (
    <div className="bg-slate-900/90 border border-slate-850 rounded-2xl p-4 flex flex-col justify-between h-full relative overflow-y-auto">
      {/* Visual Accent */}
      <div className="absolute top-0 left-0 w-1 h-full bg-airline-gold" />
      
      <div>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-airline-gold/10 border border-airline-gold/30">
              <Activity className="w-3.5 h-3.5 text-airline-gold" />
            </span>
            <h2 className="font-display text-xs font-bold text-white uppercase tracking-wider">
              Posture & Hand Alignment
            </h2>
          </div>
          {hasPostureIssue ? (
            <span className="bg-red-500/20 text-red-400 font-mono text-[10px] px-2 py-0.5 rounded-full border border-red-500/30 flex items-center gap-1 animate-pulse">
              <ShieldAlert className="w-3 h-3" />
              FLAGGED
            </span>
          ) : (
            <span className="bg-emerald-500/20 text-emerald-400 font-mono text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              OPTIMAL
            </span>
          )}
        </div>

        {/* Real-time Grid */}
        <div className="flex flex-col gap-3 my-2">
          {/* Row 1: Spine Angle & Shoulder Tilt */}
          <div className="grid grid-cols-2 gap-2">
            {/* Spine Angle */}
            <div className="bg-slate-950/50 border border-slate-850/50 rounded-lg p-2.5 flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Spine Angle</span>
                <span className={`text-xs font-mono font-bold ${metrics.isSlouching ? 'text-red-400' : 'text-emerald-400'}`}>
                  {metrics.earShoulderHipAngle}°
                </span>
              </div>
              <div className="progress-track h-1.5 mt-2">
                <div className="progress-fill" style={{ width: `${slouchingPercentage}%`, background: metrics.isSlouching ? 'var(--red)' : 'var(--emerald)' }} />
              </div>
              <span className="text-[9px] text-slate-500 mt-1 font-mono">Target: &gt;165°</span>
            </div>

            {/* Shoulder Balance */}
            <div className="bg-slate-950/50 border border-slate-850/50 rounded-lg p-2.5 flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Shoulder Tilt</span>
                <span className={`text-xs font-mono font-bold ${metrics.isUnevenStance ? 'text-red-400' : 'text-emerald-400'}`}>
                  {metrics.shoulderYDiffPercent}%
                </span>
              </div>
              
              {/* Bubble Level */}
              <div className="relative h-2 bg-slate-900 rounded-full border border-slate-800 flex items-center justify-center overflow-hidden mt-2">
                <div className="absolute left-1/2 w-0.5 h-full bg-airline-gold/30 z-10" />
                {(() => {
                  const limitOffset = 40;
                  const delta = (metrics.leftShoulderY - metrics.rightShoulderY) * 300;
                  const offset = Math.min(limitOffset, Math.max(-limitOffset, delta));
                  return (
                    <div 
                      className={`absolute w-2 h-2 rounded-full transition-all duration-300 ${
                        metrics.isUnevenStance ? "bg-red-500" : "bg-airline-gold"
                      }`}
                      style={{ left: `calc(50% + ${offset}%)` }}
                    />
                  );
                })()}
              </div>
              <span className="text-[9px] text-slate-500 mt-1 font-mono">Max allowable: 5%</span>
            </div>
          </div>

          {/* Row 2: Hand Gesticulations & Actions */}
          <div className="bg-slate-950/50 border border-slate-850/50 rounded-lg p-3 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1">
                <Hand className="w-3 h-3 text-airline-gold" />
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Hand Gestures</span>
              </div>
              <span className="text-xs font-mono font-bold text-airline-gold">{metrics.handGesticulationScore}%</span>
            </div>

            <div className="flex items-center justify-between text-xs mt-1">
              <span className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                metrics.isHandsTouchFace || metrics.isHandsFolded
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : metrics.handActionStatus.includes('✅')
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {metrics.handActionStatus}
              </span>
            </div>

            <div className="progress-track h-1.5">
              <div className="progress-fill" style={{ 
                width: `${metrics.handGesticulationScore}%`, 
                background: metrics.isHandsTouchFace || metrics.isHandsFolded ? 'var(--red)' : 'var(--gold)' 
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Trainee Tip */}
      <div className="bg-slate-950/40 border border-slate-850 p-2 rounded text-[10px] text-slate-400 leading-relaxed flex gap-1.5 items-start mt-1">
        <HelpCircle className="w-3.5 h-3.5 text-airline-gold shrink-0 mt-0.5" />
        <span>
          <strong>Pro-Aviation Standard:</strong> Use natural open-palm gestures. Avoid folding arms, crossed fingers, or fidgeting and touching your face/head.
        </span>
      </div>
    </div>
  );
}
