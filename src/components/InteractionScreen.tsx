import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  SimulationSettings, Message, PoseMetrics, FacialMetrics,
  GroomingMetrics, PresenceSnapshot, InteractionFlow,
} from '../types';
import { useLiveSession } from '../hooks/useLiveSession';
import { generateSystemPrompt, deriveFacialScore, derivePostureScore, formatTime, resetPoseGlobals } from '../utils';
import PostureMetricsPanel from './PostureMetricsPanel';
import FacialEngagementPanel from './FacialEngagementPanel';
import { GroomingSection } from './GroomingSection';

interface Props {
  settings: SimulationSettings;
  activeFlow?: InteractionFlow;
  poseMetrics: PoseMetrics | null;
  facialMetrics: FacialMetrics | null;
  groomingMetrics: GroomingMetrics | null;
  groomingLoading: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onTriggerGroomingAudit: () => void;
  onSessionEnd: (messages: Message[], snapshots: PresenceSnapshot[], duration: string) => void;
  onAddSnapshot: (snap: PresenceSnapshot) => void;
}

const PROFILE_ICONS: Record<string, string> = { airline: '✈️', bank: '🏦', generic: '🏢' };

export const InteractionScreen: React.FC<Props> = ({
  settings, activeFlow, poseMetrics, facialMetrics, groomingMetrics, groomingLoading,
  canvasRef, onTriggerGroomingAudit, onSessionEnd, onAddSnapshot,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [autoCaptureActive, setAutoCaptureActive] = useState(true);
  const [nextCaptureIn, setNextCaptureIn] = useState(60);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const snapshotRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const captureCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const allSnapshotsRef = useRef<PresenceSnapshot[]>([]);
  const poseRef = useRef(poseMetrics);
  const faceRef = useRef(facialMetrics);
  const groomingRef = useRef(groomingMetrics);
  useEffect(() => { poseRef.current = poseMetrics; }, [poseMetrics]);
  useEffect(() => { faceRef.current = facialMetrics; }, [facialMetrics]);
  useEffect(() => { groomingRef.current = groomingMetrics; }, [groomingMetrics]);

  const [streamingMessage, setStreamingMessage] = useState<{ speaker: 'user' | 'customer'; text: string } | null>(null);

  const addMessage = useCallback((speaker: 'user' | 'customer' | 'system', text: string) => {
    setMessages(prev => [...prev, { id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, speaker, text, timestamp: new Date() }]);
  }, []);

  const { isActive, isMuted, status, startSession, stopSession, toggleMute } = useLiveSession({
    onMessage: (speaker, text, isStreaming) => {
      if (speaker === 'user' || speaker === 'customer') {
        if (isStreaming) {
          setStreamingMessage({ speaker, text });
        } else {
          setStreamingMessage(null);
          addMessage(speaker, text);
        }
      }
    },
    onTurnComplete: () => {},
    onError: (err) => addMessage('system', `⚠️ ${err}`),
    onDisconnect: () => addMessage('system', 'Session ended.'),
  });

  const handleStartSession = useCallback(async () => {
    const systemPrompt = generateSystemPrompt(settings, activeFlow);
    const gender = settings.voiceGender === 'Male' ? 'male' : 'female';
    resetPoseGlobals();
    setIsSessionStarted(true);
    addMessage('system', `Session started — ${settings.scenarioType}`);
    await startSession(systemPrompt, gender);

    // Timer
    const startTime = Date.now();
    timerRef.current = setInterval(() => setElapsedMs(Date.now() - startTime), 1000);

    // Presence snapshot every 5s
    snapshotRef.current = setInterval(() => {
      const postureScore = poseRef.current ? derivePostureScore(poseRef.current) : 75;
      const facialScore = faceRef.current ? deriveFacialScore(faceRef.current) : 75;
      const groomingScore = groomingRef.current?.overallScore ?? 80;
      const snap: PresenceSnapshot = { timestamp: Date.now(), postureScore, facialScore, groomingScore };
      allSnapshotsRef.current.push(snap);
      onAddSnapshot(snap);
    }, 5000);
  }, [settings, startSession, addMessage, onAddSnapshot]);

  // Grooming countdown
  useEffect(() => {
    if (!autoCaptureActive || !isSessionStarted) return;
    setNextCaptureIn(60);
    captureCountdownRef.current = setInterval(() => {
      setNextCaptureIn(prev => {
        if (prev <= 1) {
          setTimeout(() => onTriggerGroomingAudit(), 0);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (captureCountdownRef.current) clearInterval(captureCountdownRef.current); };
  }, [autoCaptureActive, isSessionStarted, onTriggerGroomingAudit]);

  const handleEndSession = useCallback(() => {
    stopSession();
    if (timerRef.current) clearInterval(timerRef.current);
    if (snapshotRef.current) clearInterval(snapshotRef.current);
    if (captureCountdownRef.current) clearInterval(captureCountdownRef.current);
    onSessionEnd(messages, allSnapshotsRef.current, formatTime(elapsedMs));
  }, [stopSession, messages, elapsedMs, onSessionEnd]);

  // Auto-scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Cleanup
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (snapshotRef.current) clearInterval(snapshotRef.current);
    if (captureCountdownRef.current) clearInterval(captureCountdownRef.current);
  }, []);

  const postureScore = poseMetrics ? derivePostureScore(poseMetrics) : null;
  const facialScore = facialMetrics ? deriveFacialScore(facialMetrics) : null;

  const scoreColor = (v: number | null) => {
    if (v === null) return 'var(--text-muted)';
    if (v >= 75) return 'var(--emerald)';
    if (v >= 50) return 'var(--amber)';
    return 'var(--red)';
  };

  return (
    <div className="interaction-screen">
      {/* Header bar */}
      <div className="sp-header">
        <div className="sp-header-logo">
          <span className="sp-header-logo-icon">{PROFILE_ICONS[settings.profile]}</span>
          <div>
            <div className="sp-header-title">SIMULATE-PRESENCE by Inspiro</div>
            <div className="sp-header-subtitle">{settings.scenarioType}</div>
          </div>
        </div>
        <div className="sp-header-right">
          <div className={`profile-badge ${settings.profile}`}>{settings.profile.toUpperCase()}</div>
          {isSessionStarted && <div className="sp-timer">{formatTime(elapsedMs)}</div>}
          {isSessionStarted && (
            <button
              className={`btn btn-sm ${isMuted ? 'btn-danger' : 'btn-ghost'}`}
              onClick={toggleMute}
              style={{ padding: '6px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              title={isMuted ? 'Click to Unmute Microphone' : 'Click to Mute Microphone'}
            >
              {isMuted ? '🔇 Unmute Mic' : '🎤 Mute Mic'}
            </button>
          )}
          {isSessionStarted ? (
            <button className="btn btn-danger btn-sm" onClick={handleEndSession}>⏹ End Session</button>
          ) : (
            <button className="btn btn-gold" onClick={handleStartSession}>▶ Start Session</button>
          )}
        </div>
      </div>

      {/* Body: camera + chat */}
      <div className="interaction-body">
        {/* Camera panel */}
        <div className="interaction-camera-panel">
          <div className="camera-mirror-wrap" style={{ flex: 1 }}>
            <canvas ref={canvasRef} className="camera-canvas" />
            {/* Live scores overlay */}
            {isSessionStarted && (
              <div className="live-scores-overlay">
                <div className="live-score-badge">
                  <span>👁</span>
                  <span style={{ color: 'var(--text-muted)' }}>Gaze</span>
                  <span className="live-score-val" style={{ color: scoreColor(facialMetrics?.eyeContactScore ?? null) }}>
                    {facialMetrics ? `${facialMetrics.eyeContactScore}%` : '--'}
                  </span>
                </div>
                <div className="live-score-badge">
                  <span>😊</span>
                  <span style={{ color: 'var(--text-muted)' }}>Smile</span>
                  <span className="live-score-val" style={{ color: scoreColor(facialMetrics?.smileRate ?? null) }}>
                    {facialMetrics ? `${facialMetrics.smileRate}%` : '--'}
                  </span>
                </div>
                <div className="live-score-badge">
                  <span>🧍</span>
                  <span style={{ color: 'var(--text-muted)' }}>Posture</span>
                  <span className="live-score-val" style={{ color: scoreColor(postureScore) }}>
                    {postureScore !== null ? `${postureScore}%` : '--'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat panel */}
        <div className="chat-panel">
          {/* Scenario bar */}
          <div className="chat-scenario-bar">
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Customer persona:</span>
            <strong style={{ fontSize: 12, color: 'var(--text-primary)' }}>{settings.customerPersona}</strong>
            <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{settings.language}</span>
            <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Agent: </span>
            <strong style={{ fontSize: 12, color: 'var(--gold-dim)' }}>{settings.agentName}</strong>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {!isSessionStarted && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-muted)', padding: 40 }}>
                <div style={{ fontSize: 48 }}>🎭</div>
                <p style={{ fontSize: 14, textAlign: 'center' }}>Click <strong style={{ color: 'var(--gold)' }}>Start Session</strong> to begin your face-to-face simulation</p>
                <p style={{ fontSize: 12, textAlign: 'center' }}>The AI customer will speak to you through your speakers. Respond naturally using your microphone.</p>
              </div>
            )}
            {messages.map(m => (
              <div key={m.id} className={`chat-bubble ${m.speaker}`}>
                {m.speaker !== 'system' && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, paddingLeft: 4 }}>
                    {m.speaker === 'customer' ? '🧑 Customer' : `👤 ${settings.agentName}`}
                  </div>
                )}
                <div className="bubble-content">
                  {m.text}
                </div>
                {m.speaker !== 'system' && (
                  <div className="bubble-meta">{m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                )}
              </div>
            ))}
            {streamingMessage && (
              <div className={`chat-bubble ${streamingMessage.speaker}`}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, paddingLeft: 4 }}>
                  {streamingMessage.speaker === 'customer' ? '🧑 Customer' : `👤 ${settings.agentName}`}
                </div>
                <div className="bubble-content">
                  <span>{streamingMessage.text} <span className="streaming-dots"><span></span><span></span><span></span></span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Voice control bar */}
          <div className="chat-voice-bar">
            <button
              className={`mic-btn ${!isSessionStarted ? 'idle' : isMuted ? 'muted' : 'active'}`}
              onClick={toggleMute}
              disabled={!isActive}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? '🔇' : '🎤'}
            </button>
            <div className="voice-status">
              {!isSessionStarted
                ? <span>Ready to start</span>
                : <span>Status: <strong>{status || 'Connecting...'}</strong></span>}
            </div>
            {isSessionStarted && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                <div className={`status-dot ${isActive ? 'active' : 'idle'}`} />
                {isActive ? 'LIVE' : 'IDLE'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom metrics bar */}
      <div className="interaction-metrics-bar">
        <PostureMetricsPanel metrics={poseMetrics} />
        <FacialEngagementPanel metrics={facialMetrics} />
        <GroomingSection
          metrics={groomingMetrics}
          loading={groomingLoading}
          onManualCapture={onTriggerGroomingAudit}
          nextCaptureInSeconds={nextCaptureIn}
          autoCaptureActive={autoCaptureActive}
          onToggleAutoCapture={setAutoCaptureActive}
          profile={settings.profile}
        />
      </div>
    </div>
  );
};
