export interface PoseMetrics {
  earShoulderHipAngle: number;
  isSlouching: boolean;
  shoulderYDiffPercent: number;
  isUnevenStance: boolean;
  leftShoulderY: number;
  rightShoulderY: number;
}

export interface FacialMetrics {
  smileRate: number;      // 0 to 100
  eyeContactScore: number; // 0 to 100
  approachabilityScore: number; // 0 to 100
  mouthWidthNormalized: number;
  eyeOffsetLeftX: number;
  eyeOffsetRightX: number;
  eyebrowDistanceNormalized: number;
}

export interface GroomingMetrics {
  scarfTieStatus: string;
  nameBadgeStatus: string;
  hairStatus: string;
  overallScore: number;
  suggestions: string[];
  lastCapturedAt?: string;
  isFallback?: boolean;
}

export interface SessionHistoryLog {
  id: string;
  timestamp: string;
  poseScore: number;     // calculated from posture metrics
  facialScore: number;   // calculated from facial metrics
  groomingScore: number; // calculated from Gemini checks
  overallScore: number;  // average of the three
  suggestions: string[];
}
