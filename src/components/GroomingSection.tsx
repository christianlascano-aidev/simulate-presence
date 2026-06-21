import React, { useEffect, useState } from "react";
import { GroomingMetrics } from "../types";
import { 
  User, CheckCircle, ShieldAlert, Sparkles, Loader2, Camera, Clock 
} from "lucide-react";

interface Props {
  metrics: GroomingMetrics | null;
  loading: boolean;
  onManualCapture: () => void;
  nextCaptureInSeconds: number;
  autoCaptureActive: boolean;
  onToggleAutoCapture: (active: boolean) => void;
}

export default function GroomingSection({
  metrics,
  loading,
  onManualCapture,
  nextCaptureInSeconds,
  autoCaptureActive,
  onToggleAutoCapture,
}: Props) {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 glow-navy h-full flex flex-col justify-between relative overflow-hidden">
      {/* Brand Border Accent */}
      <div className="absolute top-0 left-0 w-1.5 h-full bg-airline-gold" />

      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-airline-gold/10 border border-airline-gold/30">
              <User className="w-4 h-4 text-airline-gold" />
            </span>
            <div>
              <h2 className="font-display text-base font-bold text-white uppercase tracking-wider">
                Uniform & Grooming Inspector
              </h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                Multimodal AI Auditing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Auto Capture */}
            <button
              onClick={() => onToggleAutoCapture(!autoCaptureActive)}
              className={`px-3 py-1 text-xs rounded-lg font-mono font-medium border transition-colors ${
                autoCaptureActive 
                  ? "bg-slate-800/80 text-emerald-400 border-emerald-500/30" 
                  : "bg-slate-950 text-slate-500 border-slate-800"
              }`}
            >
              {autoCaptureActive ? "● AUTO EVERY 10S" : "○ SCAN PAUSED"}
            </button>

            {/* Manual Snapshot */}
            <button
              onClick={onManualCapture}
              disabled={loading}
              className="flex items-center gap-1.5 bg-gradient-to-r from-airline-gold to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-airline-navy font-display font-semibold text-xs px-3 py-1.5 rounded-lg hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Camera className="w-3.5 h-3.5" />
              SNAP NOW
            </button>
          </div>
        </div>

        {/* Evaluation Dashboard */}
        {loading ? (
          <div className="min-h-[220px] flex flex-col items-center justify-center text-center p-4">
            <Loader2 className="w-10 h-10 text-airline-gold animate-spin mb-4" />
            <span className="text-sm font-semibold text-white uppercase tracking-wider font-mono animate-pulse">
              Gemini 3.5 Inspector evaluating...
            </span>
            <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
              Analyzing scarf knot alignment, name badge leveled coordinates, and hair standard compliance to professional aviation requirements.
            </p>
            
            {/* Airline cabin visual load bar */}
            <div className="w-40 h-1 bg-slate-950 rounded-full mt-4 overflow-hidden border border-slate-800">
              <div className="h-full bg-airline-gold animate-infinite-loading w-[30%] rounded-full" />
            </div>
          </div>
        ) : metrics ? (
          <div className="space-y-4">
            
            {/* Quick Scoring Summary */}
            <div className="flex items-center gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-850/60 font-sans">
              <div className="relative w-16 h-16 shrink-0 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="27"
                    className="stroke-slate-850"
                    strokeWidth="4"
                    fill="transparent"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="27"
                    className="stroke-airline-gold"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={170}
                    strokeDashoffset={170 - (170 * (metrics.overallScore / 100))}
                  />
                </svg>
                <div className="text-center">
                  <span className="font-display font-bold text-lg text-white font-mono block">
                    {metrics.overallScore}%
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400 block mb-0.5">
                  Grooming Pass Level
                </span>
                <span className="font-display font-bold text-sm text-[#FFF]">
                  {metrics.overallScore >= 85 
                    ? "PASSED: UNIFORM COMPLIANT 🟢" 
                    : "NEEDS ACTION: MINOR FIXES REQUIRED 🟡"}
                </span>
                {metrics.lastCapturedAt && (
                  <span className="text-[10px] text-slate-500 font-mono block mt-1">
                    Last audited at: {metrics.lastCapturedAt}
                  </span>
                )}
              </div>
            </div>

            {/* Offline AI Simulator Warning */}
            {metrics.isFallback && (
              <div className="bg-amber-500/15 border border-amber-500/20 text-amber-300 text-[11px] rounded-xl p-3 flex items-start gap-2.5 font-sans leading-relaxed">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <strong className="text-amber-200">TRAINING SIMULATOR RUNNING</strong>
                  <p className="mt-0.5 text-slate-300">
                    The external Gemini API key is at capacity or was temporarily rate-limited. Running high-fidelity offline standard simulation.
                  </p>
                </div>
              </div>
            )}

            {/* Assessment Categories details */}
            <div className="space-y-3">
              
              {/* Category 1: Scarf/Tie */}
              <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    1. Scarf / Tie Alignment
                  </span>
                  {metrics.scarfTieStatus.includes("✅") ? (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 uppercase font-bold font-mono">PASS</span>
                  ) : (
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/15 uppercase font-bold font-mono">ATTENTION</span>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed bg-slate-900/40 p-2 rounded border border-slate-900 border-slate-850/40">
                  {metrics.scarfTieStatus}
                </p>
              </div>

              {/* Category 2: Name Badge */}
              <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    2. Badge Coordinates & Level
                  </span>
                  {metrics.nameBadgeStatus.includes("✅") ? (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 uppercase font-bold font-mono">PASS</span>
                  ) : (
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/15 uppercase font-bold font-mono">ATTENTION</span>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed bg-slate-900/40 p-2 rounded border border-slate-900 border-slate-850/40">
                  {metrics.nameBadgeStatus}
                </p>
              </div>

              {/* Category 3: Hair */}
              <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    3. Hair & Cap Aviation Standards
                  </span>
                  {metrics.hairStatus.includes("✅") ? (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 uppercase font-bold font-mono">PASS</span>
                  ) : (
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/15 uppercase font-bold font-mono">ATTENTION</span>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed bg-slate-900/40 p-2 rounded border border-slate-900 border-slate-850/40">
                  {metrics.hairStatus}
                </p>
              </div>

            </div>

            {/* Suggestions ticker list */}
            {metrics.suggestions && metrics.suggestions.length > 0 && (
              <div className="mt-3 bg-red-500/10 border border-red-500/15 rounded-xl p-3.5">
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider block mb-1">
                  Required Adjustments:
                </span>
                <ul className="list-disc pl-4 text-xs text-red-300 space-y-1">
                  {metrics.suggestions.map((sug, index) => (
                    <li key={index}>{sug}</li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        ) : (
          <div className="min-h-[220px] flex flex-col items-center justify-center text-center p-4">
            <Camera className="w-10 h-10 text-slate-600 mb-3 animate-bounce" />
            <h3 className="font-display font-semibold text-slate-300">Initial Uniform Scan</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
              Take a snapshot or turn on auto-capture to evaluate your airline uniform, neckwear, name badge, and hair standards using Gemini.
            </p>
          </div>
        )}
      </div>

      {/* Countdown Progress indicator for automatic recapture */}
      {autoCaptureActive && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-airline-gold" />
            NEXT SCAN IN:
          </span>
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 bg-slate-900 border border-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-airline-gold transition-all duration-1000"
                style={{ width: `${(nextCaptureInSeconds / 10) * 100}%` }}
              />
            </div>
            <span className="font-bold text-white text-xs inline-block w-4 text-right">
              {nextCaptureInSeconds}s
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
