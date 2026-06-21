import { PoseMetrics, FacialMetrics } from "./types";

// Standard 3D distance
export function distance(
  p1: { x: number; y: number; z?: number },
  p2: { x: number; y: number; z?: number }
): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z ?? 0) - (p2.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Coordinate plane 2D distance (often better for camera normalized metrics)
export function distance2D(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Angle ABC with B as vertex
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

  if (magBA === 0 || magBC === 0) return 180; // safety fallback

  const cosTheta = Math.max(-1, Math.min(1, dotProduct / (magBA * magBC)));
  const angleRad = Math.acos(cosTheta);
  return (angleRad * 180) / Math.PI;
}

export function evaluatePose(landmarks: any[] | null | undefined): PoseMetrics | null {
  if (!landmarks || landmarks.length < 24) return null;

  // Key joints
  // Left side: Landmark 7 (Left Ear), 11 (Left Shoulder), 23 (Left Hip)
  // Right side: Landmark 8 (Right Ear), 12 (Right Shoulder), 24 (Right Hip)
  const leftEar = landmarks[7];
  const rightEar = landmarks[8];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return null;

  // We determine left versus right side visibility or coordinates
  // Frequently, the user might face slightly profile, we prioritize the side that is more visible,
  // or take an average if both are visible.
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

  // Calculate Ear-Shoulder-Hip alignment (Angle at Shoulder)
  const earShoulderHipAngle = calculateAngle(chosenEar, chosenShoulder, chosenHip);

  // If angle formed is less than 165 degrees, user is slouching
  const isSlouching = earShoulderHipAngle < 165;

  // Calculate uneven shoulder tilt
  // Normalized height is 0 to 1, difference of 0.05 is 5% height difference
  const leftY = leftShoulder.y;
  const rightY = rightShoulder.y;
  
  // Stature scale: width represents depth/scale of shoulders
  const shoulderWidth = distance2D(leftShoulder, rightShoulder);
  
  // Use relative height diff for high precision
  const shoulderYDiffPercent = (Math.abs(leftY - rightY) / Math.max(0.01, shoulderWidth)) * 100;
  
  // Requirement: If Y-coordinate difference between left and right shoulders is > 5% of coordinate space, flag "Uneven Stance"
  const rawYDiffCoordinatePercent = Math.abs(leftY - rightY) * 100;
  const isUnevenStance = rawYDiffCoordinatePercent > 5.0;

  return {
    earShoulderHipAngle: Math.round(earShoulderHipAngle * 10) / 10,
    isSlouching,
    shoulderYDiffPercent: Math.round(rawYDiffCoordinatePercent * 10) / 10,
    isUnevenStance,
    leftShoulderY: leftY,
    rightShoulderY: rightY,
  };
}

export function evaluateFacial(landmarks: any[] | null | undefined): FacialMetrics | null {
  if (!landmarks || landmarks.length < 350) return null;

  // Facial Landmarks:
  // - Eye reference width: Outer corner Left Eye (33), Outer corner Right Eye (263)
  // - Outer corners: landmark 33 and 263
  // - Inner corners: 133 and 362
  const leftEyeOuter = landmarks[33];
  const rightEyeOuter = landmarks[263];
  const leftEyeInner = landmarks[133];
  const rightEyeInner = landmarks[362];

  if (!leftEyeOuter || !rightEyeOuter || !leftEyeInner || !rightEyeInner) return null;

  const faceScale = distance2D(leftEyeOuter, rightEyeOuter);
  if (faceScale === 0) return null;

  // 1. Smile Rate (corners of mouth: 61 and 291)
  const mouthLeft = landmarks[61];
  const mouthRight = landmarks[291];
  let smileRate = 0;
  let mouthWidthNormalized = 0;

  if (mouthLeft && mouthRight) {
    const mouthWidth = distance2D(mouthLeft, mouthRight);
    mouthWidthNormalized = mouthWidth / faceScale;

    // Resting is ~0.41, full smile can exceed 0.58.
    // Calibrate: 0.42 is 0%, 0.58 is 100%
    smileRate = Math.min(100, Math.max(0, ((mouthWidthNormalized - 0.42) / 0.16) * 100));
  }

  // 2. Eye Contact (Iris Tracking fallback)
  // Iris landmarks: LHS: 468, RHS: 473 (Center coordinates)
  let leftIris = landmarks[468] || null;
  let rightIris = landmarks[473] || null;

  // Fallback if iris calculations are missing
  if (!leftIris) {
    leftIris = {
      x: (landmarks[33].x + landmarks[133].x) / 2,
      y: (landmarks[159].y + landmarks[145].y) / 2,
    };
  }
  if (!rightIris) {
    rightIris = {
      x: (landmarks[362].x + landmarks[263].x) / 2,
      y: (landmarks[386].y + landmarks[374].y) / 2,
    };
  }

  // Measure center offsets
  const leftEyeWidth = distance2D(leftEyeOuter, leftEyeInner);
  const rightEyeWidth = distance2D(rightEyeOuter, rightEyeInner);

  let eyeOffsetLeftX = 0;
  let eyeOffsetRightX = 0;

  if (leftEyeWidth > 0 && rightEyeWidth > 0) {
    // Left eye horizontal range center position
    const leftEyeCenterX = (leftEyeOuter.x + leftEyeInner.x) / 2;
    eyeOffsetLeftX = (leftIris.x - leftEyeCenterX) / leftEyeWidth;

    const rightEyeCenterX = (rightEyeOuter.x + rightEyeInner.x) / 2;
    eyeOffsetRightX = (rightIris.x - rightEyeCenterX) / rightEyeWidth;
  }

  // Eye contact score is 100 scaled down by horizontal/vertical gaze deviations
  // Smaller offsets = looking directly at camera
  const totalOffset = Math.abs(eyeOffsetLeftX) + Math.abs(eyeOffsetRightX);
  const eyeContactScore = Math.min(100, Math.max(0, 100 - totalOffset * 220));

  // 3. Approachability (distance between inner eyebrows: landmark 107 and 336)
  const leftEyebrowInner = landmarks[107];
  const rightEyebrowInner = landmarks[336];
  let approachabilityScore = 80; // neutral starting fallback
  let eyebrowDistanceNormalized = 0.22;

  if (leftEyebrowInner && rightEyebrowInner) {
    const browDistance = distance2D(leftEyebrowInner, rightEyebrowInner);
    eyebrowDistanceNormalized = browDistance / faceScale;

    // Standard brow spacing: furrowed is <= 0.17, relaxed/confident is >= 0.23.
    // Calibrate: 0.17 is 0%, 0.23 is 100%
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
