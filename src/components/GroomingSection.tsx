import React from 'react';
import { GroomingMetrics, IndustryProfile } from '../types';
import { Loader2, Camera, Clock } from 'lucide-react';

interface Props {
  metrics: GroomingMetrics | null;
  loading: boolean;
  onManualCapture: () => void;
  nextCaptureInSeconds: number;
  autoCaptureActive: boolean;
  onToggleAutoCapture: (active: boolean) => void;
  profile?: IndustryProfile;
}

// Which fields to show per profile
const PROFILE_FIELDS: Record<string, { key: string; label: string }[]> = {
  airline: [
    { key: 'scarfTieStatus', label: 'Scarf / Tie' },
    { key: 'nameBadgeStatus', label: 'Name Badge' },
    { key: 'hairStatus', label: 'Hair & Cap' },
  ],
  bank: [
    { key: 'professionalAttireStatus', label: 'Professional Attire' },
    { key: 'idBadgeStatus', label: 'Name Badge / ID' },
    { key: 'hairStatus', label: 'Hair Grooming' },
  ],
  generic: [
    { key: 'dresscodeStatus', label: 'Dress Code' },
    { key: 'idBadgeStatus', label: 'Name Tag / ID' },
    { key: 'groomingStatus', label: 'Grooming & Presentation' },
  ],
};

export const GroomingSection: React.FC<Props> = ({
  metrics, loading, onManualCapture, nextCaptureInSeconds,
  autoCaptureActive, onToggleAutoCapture, profile = 'airline',
}) => {
  const fields = PROFILE_FIELDS[profile] || PROFILE_FIELDS.airline;
  const score = metrics?.overallScore ?? null;
  const scoreColor = score !== null ? (score >= 85 ? 'var(--emerald)' : score >= 70 ? 'var(--amber)' : 'var(--red)') : 'var(--text-muted)';

  const isPass = (val: string | undefined) => val?.includes('✅');

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="panel-title" style={{ marginBottom: 0 }}>
          <span>👔</span> APPEARANCE AUDIT
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className={`btn btn-sm ${autoCaptureActive ? 'btn-emerald' : 'btn-ghost'}`}
            onClick={() => onToggleAutoCapture(!autoCaptureActive)}
            style={{ fontSize: 10, padding: '4px 8px' }}
          >
            {autoCaptureActive ? `AUTO ${nextCaptureInSeconds}s` : 'PAUSED'}
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={onManualCapture}
            disabled={loading}
            style={{ fontSize: 10, padding: '4px 8px' }}
          >
            {loading ? <Loader2 size={10} className="animate-spin" /> : <Camera size={10} />}
          </button>
        </div>
      </div>

      {/* Score */}
      {score !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontFamily: 'Outfit', fontSize: 32, fontWeight: 800, color: scoreColor }}>{score}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>APPEARANCE SCORE</div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${score}%`, background: scoreColor }} />
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-muted)' }}>
          <Loader2 size={12} className="animate-spin" /> Gemini AI evaluating...
        </div>
      )}

      {/* Fallback warning */}
      {metrics?.isFallback && (
        <div style={{ fontSize: 10, color: 'var(--amber)', padding: '4px 8px', background: 'rgba(245,158,11,0.1)', borderRadius: 6, border: '1px solid rgba(245,158,11,0.2)' }}>
          ⚠️ Simulation mode — API unavailable
        </div>
      )}

      {/* Category fields */}
      {metrics && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {fields.map(({ key, label }) => {
            const val = (metrics as any)[key] as string | undefined;
            if (!val) return null;
            const pass = isPass(val);
            return (
              <div key={key} style={{
                padding: '6px 10px', borderRadius: 6,
                background: pass ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                border: `1px solid ${pass ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                fontSize: 11,
              }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                <div style={{ color: pass ? 'var(--emerald)' : 'var(--red)' }}>{val}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Suggestions */}
      {metrics?.suggestions && metrics.suggestions.length > 0 && (
        <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
          {metrics.suggestions.map((s, i) => <div key={i} style={{ marginBottom: 2 }}>• {s}</div>)}
        </div>
      )}

      {/* Auto-capture countdown bar */}
      {autoCaptureActive && (
        <div style={{ marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
            <Clock size={10} /> Next scan in {nextCaptureInSeconds}s
          </div>
          <div className="progress-track" style={{ height: 3 }}>
            <div className="progress-fill" style={{ width: `${(nextCaptureInSeconds / 60) * 100}%`, background: 'var(--gold-dim)', transition: 'width 1s linear' }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default GroomingSection;
