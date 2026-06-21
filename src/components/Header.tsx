import React, { useState, useEffect } from "react";
import { Plane, Compass, Clock, Award } from "lucide-react";

export default function Header() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-airline-navy border-b border-airline-gold/30 text-white shadow-xl px-6 py-4 px-10">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-airline-gold to-yellow-600 p-2.5 rounded-xl shadow-lg shadow-black/20">
            <Plane className="w-6 h-6 text-airline-navy rotate-45 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-medium tracking-widest text-[#FFF] text-xs uppercase text-airline-gold">
                SkyHigh Airways Academy
              </span>
              <span className="bg-airline-gold/20 text-airline-gold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-mono border border-airline-gold/20">
                PRO MODULE
              </span>
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Airline Agent Presence Trainer
            </h1>
          </div>
        </div>

        {/* Flight Telemetry Status */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm text-slate-300 font-mono">
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <Compass className="w-4 h-4 text-airline-gold animate-spin" style={{ animationDuration: '15s' }} />
            <span>TRAINING HUB: <span className="text-white font-semibold">GATE-3000</span></span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <Clock className="w-4 h-4 text-airline-gold" />
            <span>UTC TIME: <span className="text-white font-semibold">{time.toUTCString().slice(17, 25)}</span></span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <Award className="w-4 h-4 text-airline-gold" />
            <span>MIN SCORE: <span className="text-airline-gold font-semibold">85% PASS</span></span>
          </div>
        </div>
      </div>
    </header>
  );
}
