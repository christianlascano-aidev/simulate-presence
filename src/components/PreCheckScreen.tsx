import React, { useEffect, useRef, useState } from 'react';
import { SimulationSettings } from '../types';

interface Props {
  settings: SimulationSettings;
  onBegin: () => void;
  onBack: () => void;
  /* MediaPipe state passed from App */
  mediaPipeLoaded: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

type CheckStatus = 'loading' | 'ok' | 'error';

const PROFILE_ICONS: Record<string, string> = { airline: '✈️', bank: '🏦', generic: '🏢' };
const PROFILE_LABELS: Record<string, string> = { airline: 'Airline', bank: 'Bank', generic: 'Generic' };

export const PreCheckScreen: React.FC<Props> = ({
  settings, onBegin, onBack, mediaPipeLoaded, videoRef, canvasRef,
}) => {
  const [cameraStatus, setCameraStatus] = useState<CheckStatus>('loading');
  const [apiStatus, setApiStatus] = useState<CheckStatus>('loading');
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera preview
  useEffect(() => {
    if (mediaPipeLoaded) {
      setCameraStatus('ok');
    }
  }, [mediaPipeLoaded]);

  // Check API connectivity
  useEffect(() => {
    fetch('/api/health')
      .then(res => {
        if (res.ok) setApiStatus('ok');
        else setApiStatus('error');
      })
      .catch(() => setApiStatus('error'));
  }, []);

  // Draw video to canvas for preview
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    let raf: number;
    const draw = () => {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        canvasRef.current!.width = videoRef.current.videoWidth || 640;
        canvasRef.current!.height = videoRef.current.videoHeight || 480;
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, -canvasRef.current!.width, 0);
        ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [videoRef, canvasRef]);

  const poseStatus: CheckStatus = mediaPipeLoaded ? 'ok' : 'loading';
  const allReady = cameraStatus === 'ok' && poseStatus === 'ok';

  const checks = [
    { icon: '📷', label: 'Camera Access', status: cameraStatus, okText: 'Camera active', loadText: 'Requesting...', errText: 'Permission denied' },
    { icon: '🧠', label: 'MediaPipe AI Models', status: poseStatus, okText: 'Models loaded', loadText: 'Loading models...', errText: 'Failed to load' },
    { icon: '🔑', label: 'Gemini API', status: apiStatus, okText: 'Connected', loadText: 'Checking...', errText: 'Check API key' },
  ];

  return (
    <div className="precheck-screen">
      <div className="precheck-card glass-strong slide-up">
        <div className="flex items-center gap-2 mb-4">
          <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
          <div className={`profile-badge ${settings.profile}`}>
            {PROFILE_ICONS[settings.profile]} {PROFILE_LABELS[settings.profile]}
          </div>
        </div>

        <h2 className="precheck-title">Pre-Session Check</h2>
        <p className="precheck-subtitle">Verifying your setup before the session begins</p>

        {/* Camera preview */}
        <div className="precheck-camera">
          <canvas ref={canvasRef} className="precheck-canvas" />
          <div className="precheck-overlay">
            {cameraStatus === 'loading' && <div className="text-sm">Initializing camera...</div>}
            {cameraStatus === 'error' && <div className="text-sm text-red-500">Camera access denied</div>}
          </div>
        </div>

        {/* Session summary */}
        <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{settings.scenarioType}</strong>
          <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>•</span>
          {settings.customerPersona} customer
          <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>•</span>
          {settings.language}
          <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>•</span>
          Agent: <strong style={{ color: 'var(--gold-dim)' }}>{settings.agentName}</strong>
        </div>

        {/* Checklist */}
        <div className="checklist">
          {checks.map(c => (
            <div key={c.label} className="check-item">
              <span className="check-icon">{c.icon}</span>
              <span className="check-label">{c.label}</span>
              <span className={`check-status ${c.status}`}>
                {c.status === 'ok' ? `✓ ${c.okText}` : c.status === 'loading' ? `⏳ ${c.loadText}` : `✗ ${c.errText}`}
              </span>
            </div>
          ))}
        </div>

        <button
          className="btn btn-gold btn-lg w-full"
          disabled={!allReady}
          onClick={onBegin}
        >
          {allReady ? '🚀 Begin Session' : '⏳ Waiting for checks...'}
        </button>
        {!allReady && (
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            Please resolve any ✗ issues above
          </p>
        )}
      </div>
    </div>
  );
};
