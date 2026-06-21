import React, { useMemo } from "react";
import { SessionHistoryLog } from "../types";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from "recharts";
import { TrendingUp, Award, Clock, Star, History } from "lucide-react";

interface Props {
  logs: SessionHistoryLog[];
  onClearHistory: () => void;
}

export default function SessionHistory({ logs, onClearHistory }: Props) {
  // Compute analytics
  const analytics = useMemo(() => {
    if (logs.length === 0) return { avg: 0, max: 0, streak: 0 };
    
    const sum = logs.reduce((acc, log) => acc + log.overallScore, 0);
    const avg = Math.round(sum / logs.length);
    const max = Math.max(...logs.map(l => l.overallScore));
    
    // Simple streak representation
    let streak = 0;
    for (let i = logs.length - 1; i >= 0; i--) {
      if (logs[i].overallScore >= 85) {
        streak++;
      } else {
        break;
      }
    }
    
    return { avg, max, streak };
  }, [logs]);

  // Seeding a beautiful, authentic sample path for the first-time trainee
  // so the chart does not start completely blank but shows realistic aviation flight test traces!
  const renderedChartData = useMemo(() => {
    if (logs.length > 0) {
      return logs.map((log, idx) => ({
        index: `Run #${idx + 1}`,
        "Overall Score": log.overallScore,
        "Posture": log.poseScore,
        "Expression": log.facialScore,
        "Grooming": log.groomingScore,
      }));
    }
    
    // Seed high-end flight academy demo data
    return [
      { index: "Test F1", "Overall Score": 68, "Posture": 60, "Expression": 70, "Grooming": 75 },
      { index: "Test F2", "Overall Score": 75, "Posture": 72, "Expression": 74, "Grooming": 80 },
      { index: "Test F3", "Overall Score": 84, "Posture": 81, "Expression": 85, "Grooming": 86 },
      { index: "Test F4", "Overall Score": 89, "Posture": 88, "Expression": 90, "Grooming": 90 },
      { index: "Test F5", "Overall Score": 96, "Posture": 94, "Expression": 96, "Grooming": 98 },
    ];
  }, [logs]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 glow-navy">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-airline-gold/10 border border-airline-gold/30">
            <History className="w-4 h-4 text-airline-gold" />
          </span>
          <div>
            <h2 className="font-display text-base font-bold text-white uppercase tracking-wider">
              Training Progression Tracker
            </h2>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
              Academy Performance Metrics
            </p>
          </div>
        </div>

        {logs.length > 0 && (
          <button
            onClick={onClearHistory}
            className="text-[10px] border border-red-500/30 hover:bg-red-500/10 text-red-400 font-mono py-1 px-3 rounded-lg transition-colors"
          >
            RESET FLIGHT RECORDS
          </button>
        )}
      </div>

      {/* Analytics stat summary boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        
        {/* Stat 1: Max Score */}
        <div className="bg-slate-950/50 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
              RECORD HIGH SCORE
            </span>
            <span className="font-display font-bold text-2xl text-white">
              {logs.length > 0 ? `${analytics.max}%` : "96% (Demo)"}
            </span>
          </div>
          <Award className="w-8 h-8 text-airline-gold/20 shrink-0" />
        </div>

        {/* Stat 2: Average Score */}
        <div className="bg-slate-950/50 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
              AVERAGE COMPLIANCE
            </span>
            <span className="font-display font-bold text-2xl text-white">
              {logs.length > 0 ? `${analytics.avg}%` : "82% (Demo)"}
            </span>
          </div>
          <TrendingUp className="w-8 h-8 text-airline-gold/20 shrink-0" />
        </div>

        {/* Stat 3: Pass Streak */}
        <div className="bg-slate-950/50 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
              COMPLIANT STREAK
            </span>
            <span className="font-display font-bold text-2xl text-airline-gold font-mono">
              {logs.length > 0 ? `${analytics.streak} RUNS` : "3 RUNS"}
            </span>
          </div>
          <Star className="w-8 h-8 text-airline-gold/30 shrink-0 animation-pulse" />
        </div>

      </div>

      {/* Recharts Area Performance Graph */}
      <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-4 mb-6">
        <span className="text-xs text-slate-400 font-mono uppercase tracking-wider block mb-4">
          Visual Flight Path: Professionalism Trend
        </span>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={renderedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis dataKey="index" stroke="#64748B" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={11} domain={[0, 100]} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155", borderRadius: "10px" }}
                labelStyle={{ fontWeight: "bold", color: "#F8FAFC" }}
              />
              <Area 
                type="monotone" 
                dataKey="Overall Score" 
                stroke="#D4AF37" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorScore)" 
              />
              <Line type="monotone" dataKey="Posture" stroke="#38BDF8" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="Expression" stroke="#EC4899" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center items-center gap-6 text-xs text-slate-500 font-mono mt-2">
          <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-[#D4AF37] block" /> OVERALL FITNESS</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#38BDF8] block" /> POSTURE</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#EC4899] block" /> FACE</span>
        </div>
      </div>

      {/* Trainee Logs table */}
      <div>
        <span className="text-xs text-slate-400 font-mono uppercase tracking-wider block mb-3">
          Detailed Academy Logs
        </span>
        {logs.length === 0 ? (
          <div className="text-center p-6 border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
            <span className="text-xs text-slate-500">
              No sessions logged yet. Your runs will be listed here chronologically once evaluated.
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">RECORD DATE</th>
                  <th className="py-2.5 px-3 text-center">POSTURE</th>
                  <th className="py-2.5 px-3 text-center">FACIAL</th>
                  <th className="py-2.5 px-3 text-center">GROOMING</th>
                  <th className="py-2.5 px-3 text-center">OVERALL</th>
                  <th className="py-2.5 px-3">PRIMARY FEEDBACK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 font-mono text-xs text-slate-300">
                {logs.map((log, idx) => (
                  <tr key={log.id} className="hover:bg-slate-950/30">
                    <td className="py-3 px-3 text-slate-400">{log.timestamp}</td>
                    <td className="py-3 px-3 text-center text-cyan-400 font-semibold">{log.poseScore}%</td>
                    <td className="py-3 px-3 text-center text-pink-400 font-semibold">{log.facialScore}%</td>
                    <td className="py-3 px-3 text-center text-amber-400 font-semibold">{log.groomingScore}%</td>
                    <td className="py-3 px-3 text-center font-bold">
                      <span className={log.overallScore >= 85 ? "text-emerald-400" : "text-amber-500"}>
                        {log.overallScore}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 truncate max-w-xs font-sans">
                      {log.suggestions && log.suggestions.length > 0 
                        ? log.suggestions[0] 
                        : "✓ Excellent attendance and uniform quality standards!"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
