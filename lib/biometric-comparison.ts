import { BiometricPattern } from './biometric-patterns';

export interface ComparisonResult {
  gait_match: number;
  touch_match: number;
  hand_match: number;
  behavioral_match: number;
  facial_match: number;
  overall_match: number;
  is_validated_user: boolean;
  person_confidence: number; // 0-100, high = confident it's the trained person
}

export function comparePatterns(
  livePattern: BiometricPattern,
  trainingPattern: BiometricPattern
): number {
  // Compare statistical signatures (0-100)
  
  const features = [
    { w: 0.20, score: compareStat(livePattern.mean, trainingPattern.mean, 50) },
    { w: 0.15, score: compareStat(livePattern.std_dev, trainingPattern.std_dev, 30) },
    { w: 0.15, score: compareStat(livePattern.p50, trainingPattern.p50, 50) },
    { w: 0.10, score: compareStat(livePattern.skewness, trainingPattern.skewness, 2) },
    { w: 0.10, score: compareStat(livePattern.kurtosis, trainingPattern.kurtosis, 5) },
    { w: 0.10, score: compareStat(livePattern.iqr, trainingPattern.iqr, 50) },
    { w: 0.05, score: compareStat(livePattern.entropy, trainingPattern.entropy, 1) },
    { w: 0.05, score: compareStat(livePattern.autocorrelation, trainingPattern.autocorrelation, 1) },
  ];
  
  const matchScore = features.reduce((sum, f) => sum + (f.w * f.score), 0);
  return Math.round(matchScore);
}

function compareStat(live: number, trained: number, maxDiff: number): number {
  const diff = Math.abs(live - trained);
  return Math.max(0, 100 - (diff / maxDiff) * 100);
}

export function calculatePersonConfidence(
  gaitMatch: number,
  touchMatch: number,
  handMatch: number,
  behavioralMatch: number,
  facialMatch: number,
  isValidated: boolean
): number {
  if (!isValidated) {
    return 0; // Not validated - immediate fail
  }

  // Weighted average of all biometric matches
  const overallMatch = (
    gaitMatch * 0.25 +
    touchMatch * 0.25 +
    handMatch * 0.20 +
    behavioralMatch * 0.20 +
    facialMatch * 0.10
  );

  // If overall match is very low, confidence is low even if validated
  if (overallMatch < 40) {
    return overallMatch * 0.5; // Imposter using validated account
  }

  // If match is good, high confidence
  return overallMatch;
}
