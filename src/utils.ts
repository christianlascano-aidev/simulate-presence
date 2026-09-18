import { PoseMetrics, FacialMetrics, IndustryProfile, SimulationSettings, PresenceSnapshot, InteractionFlow } from "./types";

// ─── Math helpers (original simulate-presence) ────────────────────────────────

export function distance(
  p1: { x: number; y: number; z?: number },
  p2: { x: number; y: number; z?: number }
): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z ?? 0) - (p2.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function distance2D(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function calculateAngle(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
): number {
  const baX = a.x - b.x;
  const baY = a.y - b.y;
  const bcX = c.x - b.x;
  const bcY = c.y - b.y;
  const dotProduct = baX * bcX + baY * bcY;
  const magBA = Math.sqrt(baX * baX + baY * baY);
  const magBC = Math.sqrt(bcX * bcX + bcY * bcY);
  if (magBA === 0 || magBC === 0) return 180;
  const cosTheta = Math.max(-1, Math.min(1, dotProduct / (magBA * magBC)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

let lastWristsState: { leftX: number; leftY: number; rightX: number; rightY: number; time: number } | null = null;
let smoothGesticulationScore = 80;

export function resetPoseGlobals() {
  lastWristsState = null;
  smoothGesticulationScore = 80;
}

export function evaluatePose(landmarks: any[] | null | undefined): PoseMetrics | null {
  if (!landmarks || landmarks.length < 24) return null;
  const leftEar = landmarks[7];
  const rightEar = landmarks[8];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const nose = landmarks[0];
  const leftElbow = landmarks[13];
  const rightElbow = landmarks[14];
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return null;
  const leftVisibility = (leftEar?.visibility ?? 1) + leftShoulder.visibility + leftHip.visibility;
  const rightVisibility = (rightEar?.visibility ?? 1) + rightShoulder.visibility + rightHip.visibility;
  let chosenEar = leftEar || rightEar;
  let chosenShoulder = leftShoulder;
  let chosenHip = leftHip;
  if (rightVisibility > leftVisibility && rightEar) {
    chosenEar = rightEar;
    chosenShoulder = rightShoulder;
    chosenHip = rightHip;
  }
  const earShoulderHipAngle = calculateAngle(chosenEar, chosenShoulder, chosenHip);
  const isSlouching = earShoulderHipAngle < 165;
  const leftY = leftShoulder.y;
  const rightY = rightShoulder.y;
  const rawYDiffCoordinatePercent = Math.abs(leftY - rightY) * 100;
  const shoulderWidth = distance2D(leftShoulder, rightShoulder);
  const shoulderYDiffPercent = (Math.abs(leftY - rightY) / Math.max(0.01, shoulderWidth)) * 100;
  const isUnevenStance = rawYDiffCoordinatePercent > 5.0;

  // 1. Hands touching face/head check
  let isHandsTouchFace = false;
  if (nose && leftWrist && rightWrist) {
    const leftDistToNose = distance2D(leftWrist, nose);
    const rightDistToNose = distance2D(rightWrist, nose);
    if (leftDistToNose < 0.16 || rightDistToNose < 0.16) {
      isHandsTouchFace = true;
    }
  }

  // 2. Folded arms check
  let isHandsFolded = false;
  if (leftWrist && rightWrist && leftElbow && rightElbow) {
    const leftWristToRightElbow = distance2D(leftWrist, rightElbow);
    const rightWristToLeftElbow = distance2D(rightWrist, leftElbow);
    if (leftWristToRightElbow < 0.15 && rightWristToLeftElbow < 0.15) {
      isHandsFolded = true;
    }
  }

  // 3. Hand movement/gesticulating dynamics
  const now = Date.now();
  let movementVelocity = 0;
  if (lastWristsState && leftWrist && rightWrist) {
    const dt = (now - lastWristsState.time) / 1000;
    if (dt > 0.01 && dt < 1) {
      const leftMove = distance2D({ x: leftWrist.x, y: leftWrist.y }, { x: lastWristsState.leftX, y: lastWristsState.leftY });
      const rightMove = distance2D({ x: rightWrist.x, y: rightWrist.y }, { x: lastWristsState.rightX, y: lastWristsState.rightY });
      movementVelocity = (leftMove + rightMove) / dt;
    }
  }
  if (leftWrist && rightWrist) {
    lastWristsState = { leftX: leftWrist.x, leftY: leftWrist.y, rightX: rightWrist.x, rightY: rightWrist.y, time: now };
  }

  let instantScore = 80;
  if (isHandsTouchFace) {
    instantScore = 50;
  } else if (isHandsFolded) {
    instantScore = 55;
  } else if (movementVelocity > 1.2) {
    instantScore = 65; // fidgeting
  } else if (movementVelocity > 0.12 && movementVelocity <= 1.2) {
    instantScore = 95; // natural gesturing
  } else {
    const hipsY = (leftHip.y + rightHip.y) / 2;
    const leftWristY = leftWrist?.y ?? 1;
    const rightWristY = rightWrist?.y ?? 1;
    if (leftWristY > hipsY && rightWristY > hipsY) {
      instantScore = 85;
    } else {
      instantScore = 75;
    }
  }
  smoothGesticulationScore = Math.round(smoothGesticulationScore * 0.95 + instantScore * 0.05);

  let handActionStatus = "Professional stance active ✅";
  if (isHandsTouchFace) {
    handActionStatus = "Hands touching face/hair ❌";
  } else if (isHandsFolded) {
    handActionStatus = "Arms crossed/folded ❌";
  } else if (movementVelocity > 1.2) {
    handActionStatus = "Excessive fidgeting ⚠️";
  } else if (movementVelocity > 0.12 && movementVelocity <= 1.2) {
    handActionStatus = "Natural gesturing active ✅";
  } else {
    const hipsY = (leftHip.y + rightHip.y) / 2;
    if (leftWrist && rightWrist && leftWrist.y > hipsY && rightWrist.y > hipsY) {
      handActionStatus = "Hands resting professionally ✅";
    } else {
      handActionStatus = "Hands static / resting ⚠️";
    }
  }

  return {
    earShoulderHipAngle: Math.round(earShoulderHipAngle * 10) / 10,
    isSlouching,
    shoulderYDiffPercent: Math.round(rawYDiffCoordinatePercent * 10) / 10,
    isUnevenStance,
    leftShoulderY: leftY,
    rightShoulderY: rightY,
    isHandsTouchFace,
    isHandsFolded,
    handGesticulationScore: smoothGesticulationScore,
    handActionStatus,
  };
}

export function evaluateFacial(landmarks: any[] | null | undefined): FacialMetrics | null {
  if (!landmarks || landmarks.length < 350) return null;
  const leftEyeOuter = landmarks[33];
  const rightEyeOuter = landmarks[263];
  const leftEyeInner = landmarks[133];
  const rightEyeInner = landmarks[362];
  if (!leftEyeOuter || !rightEyeOuter || !leftEyeInner || !rightEyeInner) return null;
  const faceScale = distance2D(leftEyeOuter, rightEyeOuter);
  if (faceScale === 0) return null;
  const mouthLeft = landmarks[61];
  const mouthRight = landmarks[291];
  let smileRate = 0;
  let mouthWidthNormalized = 0;
  if (mouthLeft && mouthRight) {
    const mouthWidth = distance2D(mouthLeft, mouthRight);
    mouthWidthNormalized = mouthWidth / faceScale;
    smileRate = Math.min(100, Math.max(0, ((mouthWidthNormalized - 0.42) / 0.16) * 100));
  }
  let leftIris = landmarks[468] || null;
  let rightIris = landmarks[473] || null;
  if (!leftIris) leftIris = { x: (landmarks[33].x + landmarks[133].x) / 2, y: (landmarks[159].y + landmarks[145].y) / 2 };
  if (!rightIris) rightIris = { x: (landmarks[362].x + landmarks[263].x) / 2, y: (landmarks[386].y + landmarks[374].y) / 2 };
  const leftEyeWidth = distance2D(leftEyeOuter, leftEyeInner);
  const rightEyeWidth = distance2D(rightEyeOuter, rightEyeInner);
  let eyeOffsetLeftX = 0;
  let eyeOffsetRightX = 0;
  if (leftEyeWidth > 0 && rightEyeWidth > 0) {
    eyeOffsetLeftX = (leftIris.x - (leftEyeOuter.x + leftEyeInner.x) / 2) / leftEyeWidth;
    eyeOffsetRightX = (rightIris.x - (rightEyeOuter.x + rightEyeInner.x) / 2) / rightEyeWidth;
  }
  const totalOffset = Math.abs(eyeOffsetLeftX) + Math.abs(eyeOffsetRightX);
  const eyeContactScore = Math.min(100, Math.max(0, 100 - totalOffset * 220));
  const leftEyebrowInner = landmarks[107];
  const rightEyebrowInner = landmarks[336];
  let approachabilityScore = 80;
  let eyebrowDistanceNormalized = 0.22;
  if (leftEyebrowInner && rightEyebrowInner) {
    eyebrowDistanceNormalized = distance2D(leftEyebrowInner, rightEyebrowInner) / faceScale;
    approachabilityScore = Math.min(100, Math.max(0, ((eyebrowDistanceNormalized - 0.17) / 0.06) * 100));
  }
  return {
    smileRate: Math.round(smileRate),
    eyeContactScore: Math.round(eyeContactScore),
    approachabilityScore: Math.round(approachabilityScore),
    mouthWidthNormalized,
    eyeOffsetLeftX,
    eyeOffsetRightX,
    eyebrowDistanceNormalized,
  };
}

// ─── Score derivation ──────────────────────────────────────────────────────────

export function derivePostureScore(metrics: PoseMetrics): number {
  let score = 100;
  if (metrics.isSlouching) score -= 30;
  if (metrics.isUnevenStance) score -= 25;
  if (metrics.isHandsTouchFace) score -= 15;
  if (metrics.isHandsFolded) score -= 15;
  return Math.max(30, score);
}

export function deriveFacialScore(metrics: FacialMetrics): number {
  return Math.round((metrics.smileRate + metrics.eyeContactScore + metrics.approachabilityScore) / 3);
}

// ─── Time formatting ───────────────────────────────────────────────────────────

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

// ─── AI prompt builders ────────────────────────────────────────────────────────

const PROFILE_LABELS: Record<IndustryProfile, string> = {
  airline: 'Airline Counter Agent',
  bank: 'Bank Teller / Service Officer',
  generic: 'Customer Service Representative',
};

const PROFILE_CONTEXTS: Record<IndustryProfile, string> = {
  airline: 'an airline check-in/service counter',
  bank: 'a bank branch service counter',
  generic: 'a customer service helpdesk',
};

const PERSONA_INSTRUCTIONS: Record<string, string> = {
  Easy: 'You are cooperative, polite, and reasonable. You accept solutions gracefully and express gratitude.',
  Average: 'You are mildly frustrated about your issue but remain civil. You have some follow-up questions.',
  Difficult: 'You are visibly upset and impatient. You push back on solutions, demand escalation, and express strong dissatisfaction. Do not be unreasonably rude, but be firm and emotional.',
};

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  English: 'Speak entirely in English.',
  Taglish: 'Mix Tagalog and English naturally in every sentence (code-switching). E.g. "Sabi nila cancelled na yung flight ko, what am I supposed to do?"',
  Bisaya: 'Mix Bisaya/Cebuano and English naturally. E.g. "Gi-cancel man ang akong flight, unsa man ning himuon ko?"',
};

export function generateSystemPrompt(settings: SimulationSettings, customFlow?: InteractionFlow): string {
  const role = PROFILE_LABELS[settings.profile];
  const context = PROFILE_CONTEXTS[settings.profile];
  const persona = PERSONA_INSTRUCTIONS[settings.customerPersona];
  const language = LANGUAGE_INSTRUCTIONS[settings.language];

  if (customFlow) {
    return `You are an AI customer roleplaying a customer visiting ${context}. 
You are interacting with ${settings.agentName}, a ${role} in training.

## Your Role
- CRITICAL: You are the CUSTOMER / PASSENGER. You are NOT the agent or employee. You must NEVER break character, switch to an agent/representative role, welcome the user, or provide training advice/feedback during the call under any circumstances.
- Do NOT offer solutions or resolve the issue yourself — you are the customer seeking help, not the agent.
- Keep your responses natural, realistic, and conversational (2-4 sentences max per turn).
- React authentically as a customer/passenger to how the agent handles your concern.

## Your Personality
- Character Name: ${customFlow.customerName || 'the customer'}
- Behavior: ${persona}

## Language
${language}

## CUSTOM SCENARIO FLOW
- Main Issue / Concern: ${customFlow.mainIssue}
- Transaction / Booking details: ${customFlow.transactionDetails || 'None'}

## Customer Specific Behavior Rules
${customFlow.customInstructions ? customFlow.customInstructions : "Speak with the agent and attempt to resolve the issue according to your personality."}

## Important Rules
- You are at a physical counter, speaking face-to-face with the agent.
- Start by stating your issue clearly when the session begins.
- Escalate or de-escalate your emotional state based on the agent's responses.
- Do NOT use markdown formatting. Speak in plain, natural conversational language.
- Keep responses short and realistic — this is a live spoken conversation.`;
  }

  return `You are an AI customer roleplaying a real customer visiting ${context}. 
You are interacting with ${settings.agentName}, a ${role} in training.

## Your Role
- CRITICAL: You are the CUSTOMER / PASSENGER. You are NOT the agent or employee. You must NEVER break character, switch to an agent/representative role, welcome the user, or provide training advice/feedback during the call under any circumstances.
- Do NOT offer solutions or resolve the issue yourself — you are the customer seeking help, not the agent.
- Keep your responses natural, realistic, and conversational (2-4 sentences max per turn).
- React authentically as a customer/passenger to how the agent handles your concern.

## Your Personality
- Behavior: ${persona}

## Language
${language}

## Scenario
${settings.scenarioType}

## Agent Notes (Context)
${settings.agentNotes ? settings.agentNotes : 'No additional context provided.'}

## Important Rules
- You are at a physical counter, speaking face-to-face with the agent.
- Start by stating your issue clearly when the session begins.
- Escalate or de-escalate your emotional state based on the agent's responses.
- Do NOT use markdown formatting. Speak in plain, natural conversational language.
- Keep responses short and realistic — this is a live spoken conversation.`;
}

export function buildFeedbackPrompt(
  transcript: string,
  presenceAverages: { postureAvg: number; facialAvg: number; groomingAvg: number },
  settings: SimulationSettings,
  duration: string
): string {
  const role = PROFILE_LABELS[settings.profile];
  return `You are an expert customer service training evaluator. Analyze the following interaction transcript between a ${role} and a simulated customer.

## Session Details
- Agent: ${settings.agentName}
- Profile: ${settings.profile}
- Scenario: ${settings.scenarioType}
- Customer Persona: ${settings.customerPersona}
- Language: ${settings.language}
- Duration: ${duration}

## Presence Scores (already computed from camera tracking)
- Posture Score: ${presenceAverages.postureAvg}/100
- Facial Engagement Score: ${presenceAverages.facialAvg}/100
- Appearance/Grooming Score: ${presenceAverages.groomingAvg}/100

## Transcript
${transcript}

## Instructions
Evaluate the agent's COMMUNICATION performance across exactly these 8 categories. Score each out of 10.
For each category, provide: score, max_score (10), positive points, improvement points, recommended scripts, explanation, and not_applicable (true only if truly not possible to assess).

Return a JSON object with this EXACT structure:
{
  "overall_communication_score": <number 0-100>,
  "overall_communication_summary": "<2-3 sentence summary>",
  "customer_name_detected": "<name if detected or null>",
  "communication": {
    "greeting_and_opening": { "score": <0-10>, "max_score": 10, "positive": [...], "improvement": [...], "recommended_scripts": [...], "explanation": "...", "not_applicable": false },
    "active_listening_and_understanding": { ... },
    "empathy_and_tone": { ... },
    "problem_solving_and_resolution": { ... },
    "communication_clarity": { ... },
    "compliance_and_accuracy": { ... },
    "documentation_and_note_taking": { ... },
    "closing": { ... }
  }
}

Note: overall_communication_score = average of all applicable category scores scaled to 100.
Be honest, constructive, and specific. Reference actual things said in the transcript.`;
}

// ─── JSON parsing ──────────────────────────────────────────────────────────────

export function parseGeminiJsonResponse(text: string): any | null {
  try {
    // Strip markdown code fences
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    // Sanitize control characters
    const sanitized = cleaned.replace(/[\x00-\x1F\x7F]/g, (ch) => {
      if (ch === '\n' || ch === '\r' || ch === '\t') return ch;
      return '';
    });
    return JSON.parse(sanitized);
  } catch {
    return null;
  }
}

// ─── Presence snapshot helpers ────────────────────────────────────────────────

export function computePresenceSummary(snapshots: PresenceSnapshot[]) {
  if (snapshots.length === 0) return { postureAvg: 75, facialAvg: 75, groomingAvg: 75, presenceScore: 75 };
  const postureAvg = Math.round(snapshots.reduce((s, p) => s + p.postureScore, 0) / snapshots.length);
  const facialAvg = Math.round(snapshots.reduce((s, p) => s + p.facialScore, 0) / snapshots.length);
  const groomingAvg = Math.round(snapshots.reduce((s, p) => s + p.groomingScore, 0) / snapshots.length);
  const presenceScore = Math.round((postureAvg + facialAvg + groomingAvg) / 3);
  return { postureAvg, facialAvg, groomingAvg, presenceScore };
}

export function computeOverallScore(communicationScore: number, presenceScore: number): number {
  return Math.round(communicationScore * 0.6 + presenceScore * 0.4);
}

// ─── Audio codec helpers (from simulate-2.0-nl3) ─────────────────────────────

export function encode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decode(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number
): AudioBuffer {
  const int16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
  const buffer = ctx.createBuffer(numChannels, float32.length / numChannels, sampleRate);
  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = buffer.getChannelData(ch);
    for (let i = 0; i < channelData.length; i++) channelData[i] = float32[i * numChannels + ch];
  }
  return buffer;
}

export function createBlob(float32Array: Float32Array): { data: string; mimeType: string } {
  const int16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    int16[i] = Math.max(-32768, Math.min(32767, Math.round(float32Array[i] * 32767)));
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}
