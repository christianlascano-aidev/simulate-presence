// ─── Industry Profiles ────────────────────────────────────────────────────────
export type IndustryProfile = 'airline' | 'bank' | 'generic';

// ─── Simulation Setup ─────────────────────────────────────────────────────────
export interface SimulationSettings {
  agentName: string;
  profile: IndustryProfile;
  scenarioType: string;
  customerPersona: 'Easy' | 'Average' | 'Difficult';
  voiceGender: 'Random' | 'Male' | 'Female';
  language: 'English' | 'Taglish' | 'Bisaya';
  agentNotes?: string;
  selectedReferenceId?: string;
  selectedFlowId?: string;
}

export interface ReferencePhoto {
  id: string;
  name: string;
  category: 'appearance' | 'posture' | 'hands' | 'face';
  tag: string;
  imageSrc: string; // base64
  analysis: string;
  createdAt: string;
}

export interface InteractionFlow {
  id: string;
  name: string;
  mainIssue: string;
  customerName: string;
  transactionDetails: string;
  customInstructions: string;
  createdAt: string;
}

// ─── Conversation ─────────────────────────────────────────────────────────────
export interface Message {
  id: string;
  speaker: 'user' | 'customer' | 'system';
  text: string;
  timestamp: Date;
  isStreaming?: boolean;
}

// ─── Feedback / Scoring ───────────────────────────────────────────────────────
export interface CommunicationFeedbackDetail {
  score: number;
  max_score: number;
  positive: string[];
  improvement: string[];
  recommended_scripts: string[];
  explanation: string;
  not_applicable: boolean;
}

export interface PresenceSnapshot {
  timestamp: number;
  postureScore: number;
  facialScore: number;
  groomingScore: number;
}

export interface PresenceSummary {
  postureAvg: number;
  facialAvg: number;
  groomingAvg: number;
  presenceScore: number; // avg of the three pillars
  snapshots: PresenceSnapshot[];
}

export interface FeedbackData {
  overall_communication_score: number;
  overall_communication_summary: string;
  customer_name_detected?: string;
  communication: Record<string, CommunicationFeedbackDetail>;
  presence_summary: PresenceSummary;
  overall_score: number; // weighted: communication 60% + presence 40%
}

// ─── Session History ──────────────────────────────────────────────────────────
export interface SessionHistoryLog {
  id: string;
  timestamp: string;
  profile: IndustryProfile;
  scenario: string;
  duration: string;
  communicationScore: number;
  postureScore: number;
  facialScore: number;
  groomingScore: number;
  presenceScore: number;
  overallScore: number;
  suggestions: string[];
}

// ─── Presence / Camera Metrics (from original simulate-presence) ──────────────
export interface PoseMetrics {
  earShoulderHipAngle: number;
  isSlouching: boolean;
  shoulderYDiffPercent: number;
  isUnevenStance: boolean;
  leftShoulderY: number;
  rightShoulderY: number;
  // Hand tracking
  isHandsTouchFace: boolean;
  isHandsFolded: boolean;
  handGesticulationScore: number; // 0-100
  handActionStatus: string; // e.g. "Natural gesturing ✅"
}

export interface FacialMetrics {
  smileRate: number;
  eyeContactScore: number;
  approachabilityScore: number;
  mouthWidthNormalized: number;
  eyeOffsetLeftX: number;
  eyeOffsetRightX: number;
  eyebrowDistanceNormalized: number;
}

export interface GroomingMetrics {
  // Airline profile fields
  scarfTieStatus?: string;
  nameBadgeStatus?: string;
  hairStatus?: string;
  // Bank profile fields
  professionalAttireStatus?: string;
  collarTieStatus?: string;
  // Generic profile fields
  dresscodeStatus?: string;
  presentationStatus?: string;
  // Common fields
  groomingStatus?: string;   // hair grooming (bank/generic)
  idBadgeStatus?: string;    // name tag/id (bank/generic)
  overallScore: number;
  suggestions: string[];
  lastCapturedAt?: string;
  isFallback?: boolean;
}

// ─── Live Session (WebSocket) ─────────────────────────────────────────────────
export interface LiveSessionMessage {
  type: 'status' | 'transcript' | 'audio' | 'error' | 'turnComplete';
  speaker?: 'user' | 'customer';
  text?: string;
  data?: string; // base64 audio
  isFinal?: boolean;
  message?: string;
}
