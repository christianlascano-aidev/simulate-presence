import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  SimulationSettings, PoseMetrics, FacialMetrics, GroomingMetrics,
  Message, PresenceSnapshot, FeedbackData, ReferencePhoto, InteractionFlow,
  SessionHistoryLog,
} from './types';
import { evaluatePose, evaluateFacial, buildFeedbackPrompt, computePresenceSummary, computeOverallScore, parseGeminiJsonResponse, derivePostureScore, deriveFacialScore } from './utils';
import { SetupScreen } from './components/SetupScreen';
import { PreCheckScreen } from './components/PreCheckScreen';
import { InteractionScreen } from './components/InteractionScreen';
import { FeedbackScreen } from './components/FeedbackScreen';
import { ReferenceHub } from './components/ReferenceHub';
import SessionHistory from './components/SessionHistory';
import { auth, loginWithGoogle, logoutUser, saveSessionData } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import './index.css';

declare const window: Window & {
  Pose: any; FaceMesh: any; Camera: any;
  drawConnectors: any; drawLandmarks: any;
  POSE_CONNECTIONS: any; FACEMESH_TESSELATION: any;
  FACEMESH_RIGHT_EYE: any; FACEMESH_LEFT_EYE: any; FACEMESH_LIPS: any;
};

type Screen = 'setup' | 'precheck' | 'interaction' | 'feedback' | 'loading-feedback' | 'reference-hub' | 'history';

export default function App() {
  const [screen, setScreen] = useState<Screen>('setup');
  const [settings, setSettings] = useState<SimulationSettings | null>(null);
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState('00:00:00');
  
  // Firebase Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Session history
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryLog[]>(() => {
    try {
      const saved = localStorage.getItem('sp_session_history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('sp_session_history', JSON.stringify(sessionHistory));
  }, [sessionHistory]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  // Reference Hub configurations
  const [referencePhotos, setReferencePhotos] = useState<ReferencePhoto[]>(() => {
    try {
      const saved = localStorage.getItem('sp_reference_photos');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [interactionFlows, setInteractionFlows] = useState<InteractionFlow[]>(() => {
    try {
      const saved = localStorage.getItem('sp_interaction_flows');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('sp_reference_photos', JSON.stringify(referencePhotos));
  }, [referencePhotos]);

  useEffect(() => {
    localStorage.setItem('sp_interaction_flows', JSON.stringify(interactionFlows));
  }, [interactionFlows]);

  // MediaPipe state
  const [mediaPipeLoaded, setMediaPipeLoaded] = useState(false);
  const [poseMetrics, setPoseMetrics] = useState<PoseMetrics | null>(null);
  const [facialMetrics, setFacialMetrics] = useState<FacialMetrics | null>(null);
  const [groomingMetrics, setGroomingMetrics] = useState<GroomingMetrics | null>(null);
  const [groomingLoading, setGroomingLoading] = useState(false);
  const [presenceSnapshots, setPresenceSnapshots] = useState<PresenceSnapshot[]>([]);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseInstanceRef = useRef<any>(null);
  const faceMeshInstanceRef = useRef<any>(null);
  const cameraInstanceRef = useRef<any>(null);
  const latestPoseRef = useRef<any>(null);
  const latestFaceRef = useRef<any>(null);
  const poseMetricsRef = useRef<PoseMetrics | null>(null);
  const facialMetricsRef = useRef<FacialMetrics | null>(null);
  const groomingMetricsRef = useRef<GroomingMetrics | null>(null);

  useEffect(() => { poseMetricsRef.current = poseMetrics; }, [poseMetrics]);
  useEffect(() => { facialMetricsRef.current = facialMetrics; }, [facialMetrics]);
  useEffect(() => { groomingMetricsRef.current = groomingMetrics; }, [groomingMetrics]);

  // Poll for MediaPipe CDN scripts
  useEffect(() => {
    const id = setInterval(() => {
      if (window.Pose && window.FaceMesh && window.Camera && window.drawConnectors) {
        setMediaPipeLoaded(true);
        clearInterval(id);
      }
    }, 500);
    return () => clearInterval(id);
  }, []);

  // Start MediaPipe when session is active (interaction or precheck with camera)
  const sessionActive = screen === 'interaction' || screen === 'precheck';

  useEffect(() => {
    if (!mediaPipeLoaded || !sessionActive) return;
    if (!videoRef.current || !canvasRef.current) return;

    const pose = new window.Pose({
      locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`,
    });
    pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    pose.onResults((results: any) => {
      latestPoseRef.current = results.poseLandmarks;
      if (results.poseLandmarks) setPoseMetrics(evaluatePose(results.poseLandmarks));
      triggerCompositeDraw();
    });
    poseInstanceRef.current = pose;

    const faceMesh = new window.FaceMesh({
      locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
    });
    faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    faceMesh.onResults((results: any) => {
      const lms = results.multiFaceLandmarks?.[0] ?? null;
      latestFaceRef.current = lms;
      if (lms) setFacialMetrics(evaluateFacial(lms));
      triggerCompositeDraw();
    });
    faceMeshInstanceRef.current = faceMesh;

    const camera = new window.Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
          try {
            await pose.send({ image: videoRef.current });
            await faceMesh.send({ image: videoRef.current });
          } catch (err) {
            console.error('MediaPipe send error:', err);
          }
        }
      },
      width: 640, height: 480,
    });
    camera.start();
    cameraInstanceRef.current = camera;

    return () => {
      camera.stop();
      pose.close();
      faceMesh.close();
      cameraInstanceRef.current = null;
      poseInstanceRef.current = null;
      faceMeshInstanceRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaPipeLoaded, sessionActive]);

  const triggerCompositeDraw = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0);
    ctx.restore();

    if (latestPoseRef.current && window.drawConnectors && window.POSE_CONNECTIONS) {
      const mirrored = latestPoseRef.current.map((lm: any) => ({ ...lm, x: 1 - lm.x }));
      window.drawConnectors(ctx, mirrored, window.POSE_CONNECTIONS, { color: '#D4AF37', lineWidth: 2 });
      window.drawLandmarks(ctx, mirrored.filter((_: any, i: number) => [7,8,11,12,13,14,15,16,19,20,23,24,25,26].includes(i)), { color: '#D4AF37', lineWidth: 1, radius: 4 });
    }

    if (latestFaceRef.current && window.drawConnectors) {
      const mirroredFace = latestFaceRef.current.map((lm: any) => ({ ...lm, x: 1 - lm.x }));
      if (window.FACEMESH_TESSELATION) window.drawConnectors(ctx, mirroredFace, window.FACEMESH_TESSELATION, { color: 'rgba(255,255,255,0.07)', lineWidth: 1 });
      if (window.FACEMESH_LEFT_EYE) window.drawConnectors(ctx, mirroredFace, window.FACEMESH_LEFT_EYE, { color: '#D4AF37', lineWidth: 1 });
      if (window.FACEMESH_RIGHT_EYE) window.drawConnectors(ctx, mirroredFace, window.FACEMESH_RIGHT_EYE, { color: '#D4AF37', lineWidth: 1 });
      if (window.FACEMESH_LIPS) window.drawConnectors(ctx, mirroredFace, window.FACEMESH_LIPS, { color: 'rgba(212,175,55,0.5)', lineWidth: 1 });
    }
  }, []);

  const groomingLoadingRef = useRef(false);
  useEffect(() => { groomingLoadingRef.current = groomingLoading; }, [groomingLoading]);

  // Grooming audit
  const triggerGroomingAudit = useCallback(async () => {
    const video = videoRef.current;
    if (!video || groomingLoadingRef.current) return;
    setGroomingLoading(true);
    try {
      const offscreen = document.createElement('canvas');
      offscreen.width = video.videoWidth || 640;
      offscreen.height = video.videoHeight || 480;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;
      ctx.save(); ctx.scale(-1, 1); ctx.drawImage(video, -offscreen.width, 0); ctx.restore();
      const imageData = offscreen.toDataURL('image/jpeg', 0.85);

      const selectedRef = referencePhotos.find(p => p.id === settings?.selectedReferenceId);
      const resp = await fetch('/api/analyze-grooming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: imageData, 
          profile: settings?.profile || 'airline',
          referenceDescription: selectedRef ? selectedRef.analysis : undefined
        }),
      });
      const data = await resp.json();
      setGroomingMetrics({ ...data, lastCapturedAt: new Date().toLocaleTimeString() });
    } catch (err) {
      console.error('Grooming audit error:', err);
    } finally {
      setGroomingLoading(false);
    }
  }, [settings, referencePhotos]);

  // Session end → generate feedback
  const handleSessionEnd = useCallback(async (messages: Message[], snapshots: PresenceSnapshot[], duration: string) => {
    setSessionDuration(duration);
    setScreen('loading-feedback');

    const transcript = messages
      .filter(m => m.speaker !== 'system')
      .map(m => `${m.speaker === 'customer' ? 'Customer' : `Agent (${settings!.agentName})`}: ${m.text}`)
      .join('\n');

    const presenceAvgs = computePresenceSummary(snapshots);
    const prompt = buildFeedbackPrompt(transcript, presenceAvgs, settings!, duration);

    try {
      const resp = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const raw = await resp.json();
      if (!resp.ok) {
        throw new Error(raw.error || 'Failed to generate feedback.');
      }
      const parsed = parseGeminiJsonResponse(JSON.stringify(raw)) ?? raw;

      const presenceSummary = { ...presenceAvgs, snapshots };
      const commScore = parsed.overall_communication_score ?? 75;
      const presScore = presenceSummary.presenceScore;

      const fullFeedback: FeedbackData = {
        ...parsed,
        presence_summary: presenceSummary,
        overall_score: computeOverallScore(commScore, presScore),
      };

      setFeedbackData(fullFeedback);

      // Save to session history
      const historyEntry: SessionHistoryLog = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString(),
        profile: settings!.profile,
        scenario: settings!.scenarioType,
        duration,
        communicationScore: commScore,
        postureScore: presenceSummary.postureAvg,
        facialScore: presenceSummary.facialAvg,
        groomingScore: presenceSummary.groomingAvg,
        presenceScore: presScore,
        overallScore: fullFeedback.overall_score,
        suggestions: Object.values(parsed.communication || {})
          .flatMap((c: any) => c.improvement || [])
          .slice(0, 3),
      };
      setSessionHistory(prev => [...prev, historyEntry]);

      // Save to Firebase using the user's name
      await saveSessionData(settings!.agentName, historyEntry);

      setScreen('feedback');
    } catch (err: any) {
      setFeedbackError(err.message);
      setScreen('feedback');
    }
  }, [settings]);

  const handleAddSnapshot = useCallback((snap: PresenceSnapshot) => {
    setPresenceSnapshots(prev => [...prev, snap]);
  }, []);

  const handleNewSession = useCallback(() => {
    setPresenceSnapshots([]);
    setFeedbackData(null);
    setFeedbackError(null);
    setScreen('setup');
  }, []);

  return (
    <div className="sp-app">
      {/* Global hidden video for MediaPipe Camera */}
      {sessionActive && <video ref={videoRef} style={{ display: 'none' }} playsInline autoPlay muted />}
      
      {screen === 'setup' && (
        <div className="sp-main">
          <SetupScreen 
            photos={referencePhotos}
            flows={interactionFlows}
            onStart={(s) => { setSettings(s); setScreen('precheck'); }} 
            onNavigateToHub={() => setScreen('reference-hub')}
            onNavigateToHistory={() => setScreen('history')}
          />
        </div>
      )}

      {screen === 'history' && (
        <div className="sp-main" style={{ overflow: 'auto' }}>
          <div className="sp-header">
            <div className="sp-header-logo">
              <span className="sp-header-logo-icon">📊</span>
              <div>
                <div className="sp-header-title">TRAINING HISTORY</div>
                <div className="sp-header-subtitle">{sessionHistory.length} sessions recorded</div>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setScreen('setup')}>← Back to Setup</button>
          </div>
          <div style={{ padding: 24 }}>
            <SessionHistory
              logs={sessionHistory}
              onClearHistory={() => setSessionHistory([])}
            />
          </div>
        </div>
      )}

      {screen === 'reference-hub' && (
        <div className="sp-main">
          <ReferenceHub
            profile={settings?.profile || 'airline'}
            photos={referencePhotos}
            flows={interactionFlows}
            onAddPhoto={(p) => setReferencePhotos(prev => [...prev, p])}
            onDeletePhoto={(id) => setReferencePhotos(prev => prev.filter(x => x.id !== id))}
            onAddFlow={(f) => setInteractionFlows(prev => [...prev, f])}
            onDeleteFlow={(id) => setInteractionFlows(prev => prev.filter(x => x.id !== id))}
            onBack={() => setScreen('setup')}
          />
        </div>
      )}

      {screen === 'precheck' && settings && (
        <div className="sp-main">
          <PreCheckScreen
            settings={settings}
            onBegin={() => setScreen('interaction')}
            onBack={() => setScreen('setup')}
            mediaPipeLoaded={mediaPipeLoaded}
            videoRef={videoRef}
            canvasRef={canvasRef}
          />
        </div>
      )}

      {screen === 'interaction' && settings && (
        <div className="sp-main" style={{ overflow: 'hidden' }}>
          <InteractionScreen
            settings={settings}
            activeFlow={interactionFlows.find(f => f.id === settings.selectedFlowId)}
            poseMetrics={poseMetrics}
            facialMetrics={facialMetrics}
            groomingMetrics={groomingMetrics}
            groomingLoading={groomingLoading}
            canvasRef={canvasRef}
            onTriggerGroomingAudit={triggerGroomingAudit}
            onSessionEnd={handleSessionEnd}
            onAddSnapshot={handleAddSnapshot}
          />
        </div>
      )}

      {screen === 'loading-feedback' && (
        <div className="sp-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 48 }}>🧠</div>
          <div style={{ fontFamily: 'Outfit', fontSize: 20, fontWeight: 700, color: 'var(--gold)' }}>Generating Your Report</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Gemini AI is analyzing your communication and presence...</div>
          <div style={{ width: 200, height: 4, background: 'var(--bg-card)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--gold)', borderRadius: 2, animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, var(--gold-dim) 25%, var(--gold-light) 50%, var(--gold-dim) 75%)' }} />
          </div>
        </div>
      )}

      {screen === 'feedback' && settings && (
        <div className="sp-main" style={{ overflow: 'hidden' }}>
          <div className="sp-header">
            <div className="sp-header-logo">
              <span className="sp-header-logo-icon">📊</span>
              <div>
                <div className="sp-header-title">SESSION REPORT</div>
                <div className="sp-header-subtitle">{settings.agentName} · {settings.scenarioType}</div>
              </div>
            </div>
            <button className="btn btn-gold btn-sm" onClick={handleNewSession}>🔄 New Session</button>
          </div>
          {feedbackError ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 16 }}>⚠️ Failed to generate feedback: {feedbackError}</div>
              <button className="btn btn-gold" onClick={handleNewSession}>Try Again</button>
            </div>
          ) : feedbackData ? (
            <FeedbackScreen
              feedback={feedbackData}
              settings={settings}
              duration={sessionDuration}
              onNewSession={handleNewSession}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
