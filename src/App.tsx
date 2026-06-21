/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import Header from "./components/Header";
import PostureMetricsPanel from "./components/PostureMetricsPanel";
import FacialEngagementPanel from "./components/FacialEngagementPanel";
import GroomingSection from "./components/GroomingSection";
import SessionHistory from "./components/SessionHistory";
import { PoseMetrics, FacialMetrics, GroomingMetrics, SessionHistoryLog } from "./types";
import { evaluatePose, evaluateFacial } from "./utils";
import { 
  Camera, AlertTriangle, Play, Pause, RefreshCw, RefreshCcw, Landmark, Sparkles, BookOpen, AlertCircle
} from "lucide-react";

declare global {
  interface Window {
    Pose: any;
    FaceMesh: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
    POSE_CONNECTIONS: any;
    FACEMESH_TESSELATION: any;
    FACEMESH_RIGHT_EYE: any;
    FACEMESH_LEFT_EYE: any;
    FACEMESH_LIPS: any;
  }
}

export default function App() {
  const [mediaPipeLoaded, setMediaPipeLoaded] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Real-time tracking states
  const [poseMetrics, setPoseMetrics] = useState<PoseMetrics | null>(null);
  const [facialMetrics, setFacialMetrics] = useState<FacialMetrics | null>(null);
  
  // Periodic grooming metrics (evaluated by Gemini)
  const [groomingMetrics, setGroomingMetrics] = useState<GroomingMetrics | null>(null);
  const [groomingLoading, setGroomingLoading] = useState(false);
  
  // Persistence History Logs
  const [sessionLogs, setSessionLogs] = useState<SessionHistoryLog[]>([]);

  // Automatic snapshot timer controls
  const [autoCaptureActive, setAutoCaptureActive] = useState(false);
  const [nextCaptureInSeconds, setNextCaptureInSeconds] = useState(10);

  // Active session controller
  const [sessionActive, setSessionActive] = useState(false);

  // Active status tracker
  const [mediaPipeRunning, setMediaPipeRunning] = useState(false);

  // Refs for video/canvas elements & pipelines
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const poseInstanceRef = useRef<any>(null);
  const faceMeshInstanceRef = useRef<any>(null);
  const cameraInstanceRef = useRef<any>(null);

  // Synchronized canvas frames
  const latestPoseRef = useRef<any>(null);
  const latestFaceRef = useRef<any>(null);

  // Refs to allow current metric lookup in background capture routines
  const poseMetricsRef = useRef<PoseMetrics | null>(null);
  const facialMetricsRef = useRef<FacialMetrics | null>(null);

  useEffect(() => {
    poseMetricsRef.current = poseMetrics;
  }, [poseMetrics]);

  useEffect(() => {
    facialMetricsRef.current = facialMetrics;
  }, [facialMetrics]);

  // Load local storage histories on startup
  useEffect(() => {
    const stored = localStorage.getItem("skyhigh_training_history");
    if (stored) {
      try {
        setSessionLogs(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse training history", e);
      }
    }
  }, []);

  // Poll for MediaPipe Global Scripts loading from the CDF tags
  useEffect(() => {
    const checkTimer = setInterval(() => {
      if (window.Pose && window.FaceMesh && window.Camera && window.drawConnectors) {
        setMediaPipeLoaded(true);
        clearInterval(checkTimer);
      }
    }, 500);
    return () => clearInterval(checkTimer);
  }, []);

  // Background Capturing timer loop for Grooming Audit
  useEffect(() => {
    if (!autoCaptureActive || groomingLoading || !mediaPipeRunning) return;

    const interval = setInterval(() => {
      setNextCaptureInSeconds((prev) => {
        if (prev <= 1) {
          triggerGroomingAudit();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoCaptureActive, groomingLoading, mediaPipeRunning]);

  // Handle core grooming pipeline audit
  const triggerGroomingAudit = async () => {
    const video = videoRef.current;
    if (!video || groomingLoading) return;

    setGroomingLoading(true);
    try {
      // Create clean, unmarked offscreen canvas frame
      const offscreenCanvas = document.createElement("canvas");
      offscreenCanvas.width = video.videoWidth || 640;
      offscreenCanvas.height = video.videoHeight || 480;
      const ctx = offscreenCanvas.getContext("2d");
      if (!ctx) throw new Error("Could not acquire offscreen 2D context");

      // Draw mirrored raw video
      ctx.translate(offscreenCanvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

      const base64Jpeg = offscreenCanvas.toDataURL("image/jpeg", 0.85);

      const response = await fetch("/api/analyze-grooming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Jpeg }),
      });

      if (!response.ok) {
        throw new Error("Grooming audit route failed.");
      }

      const result: GroomingMetrics = await response.json();
      result.lastCapturedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setGroomingMetrics(result);

      // Log Training Progress record
      // Translate Posture Metrics to score
      const poseVal = poseMetricsRef.current;
      const faceVal = facialMetricsRef.current;

      const postureScore = poseVal 
        ? Math.round(Math.max(40, 100 - (poseVal.isSlouching ? 30 : 0) - (poseVal.isUnevenStance ? 25 : 0)))
        : 85;

      const facialScore = faceVal
        ? Math.round((faceVal.smileRate + faceVal.eyeContactScore + faceVal.approachabilityScore) / 3)
        : 85;

      const averageOverall = Math.round((postureScore + facialScore + result.overallScore) / 3);

      const newHistoryLog: SessionHistoryLog = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        poseScore: postureScore,
        facialScore: facialScore,
        groomingScore: result.overallScore,
        overallScore: averageOverall,
        suggestions: result.suggestions && result.suggestions.length > 0 
          ? result.suggestions 
          : ["Excellent uniforms! Everything conforms with SkyHigh flight crew requirements."]
      };

      setSessionLogs((prev) => {
        const updated = [...prev, newHistoryLog];
        localStorage.setItem("skyhigh_training_history", JSON.stringify(updated));
        return updated;
      });

    } catch (err: any) {
      console.error("Grooming scan error:", err);
    } finally {
      setGroomingLoading(false);
      setNextCaptureInSeconds(10); // reset countdown timer
    }
  };

  // Setup actual MediaPipe Pipelines
  useEffect(() => {
    if (!mediaPipeLoaded) return;
    if (!sessionActive) return; // Only boot pipeline if user explicitly starts session
    
    const video = videoRef.current;
    if (!video) return;

    try {
      // 1. Initialise Pose model
      const pose = new window.Pose({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults((results: any) => {
        if (results.poseLandmarks) {
          latestPoseRef.current = results.poseLandmarks;
          const poseEval = evaluatePose(results.poseLandmarks);
          if (poseEval) setPoseMetrics(poseEval);
        }
        triggerCompositeDraw();
      });

      // 2. Initialise Face Mesh model
      const faceMesh = new window.FaceMesh({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true, // iris tracking enabled
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults((results: any) => {
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
          const lms = results.multiFaceLandmarks[0];
          latestFaceRef.current = lms;
          const facialEval = evaluateFacial(lms);
          if (facialEval) setFacialMetrics(facialEval);
        }
        triggerCompositeDraw();
      });

      poseInstanceRef.current = pose;
      faceMeshInstanceRef.current = faceMesh;

      // 3. Setup core Camera utility loop
      const camera = new window.Camera(video, {
        onFrame: async () => {
          if (video && video.readyState >= 2) {
            await pose.send({ image: video });
            await faceMesh.send({ image: video });
          }
        },
        width: 640,
        height: 480,
      });

      cameraInstanceRef.current = camera;
      camera.start()
        .then(() => {
          setMediaPipeRunning(true);
          setCameraError(null);
        })
        .catch((err: any) => {
          console.error("Camera startup fail:", err);
          setCameraError("Camera access has been disabled or is unavailable. Please grant frame permissions to use this virtual mirror trainer.");
        });

    } catch (err: any) {
      console.error("MediaPipe bootstrapping failure:", err);
      setCameraError("Fail to initialize on-device MediaPipe models.");
    }

    return () => {
      // Cleanup pipelines when component unmounts or sessionActive changes
      if (cameraInstanceRef.current) {
        try {
          cameraInstanceRef.current.stop();
        } catch (e) {
          console.warn("Error stopping camera:", e);
        }
      }
      if (poseInstanceRef.current) {
        try {
          poseInstanceRef.current.close();
        } catch (e) {
          console.warn("Error closing pose:", e);
        }
      }
      if (faceMeshInstanceRef.current) {
        try {
          faceMeshInstanceRef.current.close();
        } catch (e) {
          console.warn("Error closing faceMesh:", e);
        }
      }
      setMediaPipeRunning(false);
    };
  }, [mediaPipeLoaded, sessionActive]);

  // Integrated virtual mirror composite drawing loop
  const triggerCompositeDraw = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Direct dimension matching
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }

    ctx.save();
    
    // Virtual Mirror mirror coordinates flip
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    // Draw raw video background
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Overlays
    const poseLms = latestPoseRef.current;
    const faceLms = latestFaceRef.current;

    // Draw skeletal alignment connectors
    if (poseLms && window.drawConnectors && window.POSE_CONNECTIONS) {
      window.drawConnectors(ctx, poseLms, window.POSE_CONNECTIONS, {
        color: "#D4AF37", // Amber/Gold airline layout
        lineWidth: 2,
      });

      // Highlight primary joint circles
      const joints = [7, 8, 11, 12, 23, 24, 25, 26];
      joints.forEach((idx) => {
        const pt = poseLms[idx];
        if (pt && pt.visibility > 0.5) {
          ctx.beginPath();
          ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 5, 0, 2 * Math.PI);
          ctx.fillStyle = "#0B2046";
          ctx.strokeStyle = "#D4AF37";
          ctx.lineWidth = 1.5;
          ctx.fill();
          ctx.stroke();
        }
      });
    }

    // Draw facial micro grids
    if (faceLms && window.drawConnectors && window.FACEMESH_TESSELATION) {
      window.drawConnectors(ctx, faceLms, window.FACEMESH_TESSELATION, {
        color: "rgba(255, 255, 255, 0.12)",
        lineWidth: 0.8,
      });

      // Highlight Eyes & Iris
      if (window.FACEMESH_RIGHT_EYE) {
        window.drawConnectors(ctx, faceLms, window.FACEMESH_RIGHT_EYE, {
          color: "#D4AF37",
          lineWidth: 1.2,
        });
      }
      if (window.FACEMESH_LEFT_EYE) {
        window.drawConnectors(ctx, faceLms, window.FACEMESH_LEFT_EYE, {
          color: "#D4AF37",
          lineWidth: 1.2,
        });
      }
      if (window.FACEMESH_LIPS) {
        window.drawConnectors(ctx, faceLms, window.FACEMESH_LIPS, {
          color: "rgba(212, 175, 55, 0.6)",
          lineWidth: 1.2,
        });
      }
    }

    ctx.restore();
  };

  const handleClearHistory = () => {
    localStorage.removeItem("skyhigh_training_history");
    setSessionLogs([]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Intro Banner */}
        <div className="bg-gradient-to-r from-airline-navy via-slate-900 to-slate-900 border border-airline-gold/20 rounded-2xl p-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-airline-gold/5 rounded-full blur-3xl pointer-events-none" />
          <h2 className="font-display text-xl font-bold text-white mb-2 flex items-center gap-2">
            <Sparkles className="text-airline-gold w-5 h-5 animate-pulse" />
            Academy Virtual Flight Standards Evaluation
          </h2>
          <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
            Welcome to the SkyHigh Premium cabin coaching suite. Position yourself centered within the mirror dashboard.
            The on-device tracking checks your spine alignment and smiling frequency, while our integrated multimodal inspector auditors periodically evaluate uniform neckwear, tie alignment, and grooming standards.
          </p>
        </div>

        {cameraError && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3 text-red-300">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <div>
              <h4 className="font-bold">Webcam Required</h4>
              <p className="text-xs text-red-400 mt-0.5 leading-relaxed">{cameraError}</p>
            </div>
          </div>
        )}

        {/* Loading Scripts splash */}
        {!mediaPipeLoaded ? (
          <div className="bg-slate-900/60 border border-slate-850 p-12 text-center rounded-2xl flex flex-col items-center justify-center min-h-[400px]">
            <RefreshCcw className="w-12 h-12 text-airline-gold animate-spin mb-4" />
            <span className="font-display font-bold text-lg text-white">
              Securing Flight Satellite Systems...
            </span>
            <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
              Downloading high-performance machine learning models for real-time skeletal pose & eye mesh analysis.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Left Column: Virtual Mirror Video Feed (span 7) */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="bg-slate-900/80 border border-slate-850 rounded-2xl p-4 flex flex-col justify-between h-full shadow-2xl relative">
                
                {/* Control bar for Start/Stop tracking */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-3 pb-3 border-b border-slate-850">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${sessionActive ? 'bg-emerald-500 animate-pulse glow-emerald' : 'bg-slate-600'}`} />
                    <span className="text-slate-300 font-mono text-xs uppercase tracking-wider font-semibold">
                      {sessionActive ? "Evaluation Active" : "Session Paused / Inactive"}
                    </span>
                  </div>
                  
                  {/* Start/Stop primary control triggers */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {sessionActive ? (
                      <button
                        onClick={() => setSessionActive(false)}
                        className="flex items-center gap-1.5 py-1 px-3 border border-red-500/40 hover:bg-red-500/10 text-red-400 bg-red-950/10 font-mono text-[10px] uppercase font-bold rounded-lg transition-all"
                      >
                        <Pause className="w-3 h-3 fill-current" />
                        End Session
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSessionActive(true);
                          setCameraError(null);
                        }}
                        className="flex items-center gap-1.5 py-1 px-3 border border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-400 bg-emerald-950/10 font-mono text-[10px] uppercase font-bold rounded-lg transition-all shadow-sm"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Start Session
                      </button>
                    )}
                    
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-950 border border-slate-850 px-2 py-1 rounded uppercase">
                      Mirror Flipped
                    </span>
                  </div>
                </div>

                {/* Secret placeholder matching MediaPipe video input requirements */}
                <video
                  ref={videoRef}
                  className="hidden"
                  playsInline
                  muted
                  width="640"
                  height="480"
                />

                {/* Mirror Display Area */}
                <div className="relative aspect-video w-full rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Floating alignment outline references to help user center themselves */}
                  {!sessionActive ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center z-10">
                      <div className="w-16 h-16 rounded-full bg-airline-gold/15 border border-airline-gold/30 flex items-center justify-center text-airline-gold mb-4 animate-pulse">
                        <Play className="w-8 h-8 fill-airline-gold translate-x-0.5" />
                      </div>
                      <h4 className="font-display font-bold text-base text-white tracking-wide uppercase">
                        Virtual Mirror Ready
                      </h4>
                      <p className="text-xs text-slate-400 max-w-sm mt-1.5 mb-6 leading-relaxed">
                        Camera and on-device machine learning posture diagnostics are paused. Click below to begin your cabin standards evaluation.
                      </p>
                      <button
                        onClick={() => {
                          setSessionActive(true);
                          setCameraError(null);
                        }}
                        className="font-mono text-xs py-2.5 px-6 rounded-lg bg-airline-gold text-slate-950 hover:bg-white hover:text-slate-950 transition-all font-bold tracking-widest shadow-lg shadow-airline-gold/15 flex items-center gap-2 uppercase"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Start Training Session
                      </button>
                    </div>
                  ) : !mediaPipeRunning ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 p-6 text-center">
                      <Camera className="w-12 h-12 text-airline-gold/30 animate-pulse mb-3" />
                      <span className="font-display font-medium text-sm text-slate-400">
                        Initiating Flight Cam...
                      </span>
                    </div>
                  ) : null}

                  {/* Overlaid warning if slouching */}
                  {sessionActive && poseMetrics && poseMetrics.isSlouching && (
                    <div className="absolute top-4 left-4 bg-red-500 text-[#FFF] text-xs font-bold font-mono px-3 py-1.5 rounded-lg border border-red-400 shadow-lg flex items-center gap-1.5 animate-bounce">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      SLOUCHING DETECTED
                    </div>
                  )}

                  {/* Overlaid warning if uneven stance */}
                  {sessionActive && poseMetrics && poseMetrics.isUnevenStance && (
                    <div className="absolute top-4 right-4 bg-red-500 text-[#FFF] text-xs font-bold font-mono px-3 py-1.5 rounded-lg border border-red-400 shadow-lg flex items-center gap-1.5 animate-bounce">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      UNEVEN STANCE
                    </div>
                  )}
                </div>

                {/* Instructions panel */}
                <div className="mt-4 bg-slate-950/40 p-3.5 rounded-xl border border-slate-850 flex items-start gap-3 text-xs leading-relaxed text-slate-400">
                  <BookOpen className="w-5 h-5 text-airline-gold shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-white uppercase tracking-wider text-[11px] mb-0.5">
                      How to Train
                    </h5>
                    <span>
                      Maintain a straight back. Move yourself until your head fits the top center quadrant. Smiling naturally raises your <strong>Smile Intensity</strong>. Speak into the screen as if greeting a loyal SkyHigh premium traveler.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Uniform & Grooming Multimodal checks (span 5) */}
            <div className="lg:col-span-5">
              <GroomingSection 
                metrics={groomingMetrics}
                loading={groomingLoading}
                onManualCapture={triggerGroomingAudit}
                nextCaptureInSeconds={nextCaptureInSeconds}
                autoCaptureActive={autoCaptureActive}
                onToggleAutoCapture={setAutoCaptureActive}
              />
            </div>

            {/* Mid Section: Realtime dials (Pose & Face panels) */}
            <div className="lg:col-span-6">
              <PostureMetricsPanel metrics={poseMetrics} />
            </div>

            <div className="lg:col-span-6">
              <FacialEngagementPanel metrics={facialMetrics} />
            </div>

            {/* Bottom Section: Historical Session Trends */}
            <div className="lg:col-span-12">
              <SessionHistory logs={sessionLogs} onClearHistory={handleClearHistory} />
            </div>

          </div>
        )}
      </main>

      <footer className="bg-slate-950 border-t border-slate-900 py-6 text-center text-xs text-slate-500 font-mono">
        <span>© 2026 SkyHigh Flight Academy Training Suite. All rights reserved. Powered by Google AI (MediaPipe, Gemini).</span>
      </footer>
    </div>
  );
}

