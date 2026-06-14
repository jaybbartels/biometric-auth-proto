export interface BiometricPattern {
  mean: number;
  std_dev: number;
  min: number;
  max: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  sample_count: number;
  quality_score: number; // 0-100 based on sample count and variance
}

export function calculatePattern(samples: number[]): BiometricPattern {
  if (samples.length === 0) {
    return {
      mean: 0,
      std_dev: 0,
      min: 0,
      max: 0,
      p25: 0,
      p50: 0,
      p75: 0,
      p95: 0,
      sample_count: 0,
      quality_score: 0
    };
  }

  const sorted = [...samples].sort((a, b) => a - b);
  
  // Calculate mean
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  
  // Calculate std dev
  const variance = samples.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / samples.length;
  const std_dev = Math.sqrt(variance);
  
  // Calculate percentiles
  const p25 = sorted[Math.floor(sorted.length * 0.25)];
  const p50 = sorted[Math.floor(sorted.length * 0.50)];
  const p75 = sorted[Math.floor(sorted.length * 0.75)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  
  // Quality score: based on sample count (need >50) and variance (should be low)
  const sampleQuality = Math.min(100, (samples.length / 50) * 100);
  const varianceQuality = Math.max(0, 100 - (std_dev * 2)); // High variance = lower quality
  const quality_score = (sampleQuality + varianceQuality) / 2;
  
  return {
    mean,
    std_dev,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p25,
    p50,
    p75,
    p95,
    sample_count: samples.length,
    quality_score: Math.round(quality_score)
  };
}

export function comparePatterns(pattern1: BiometricPattern, pattern2: BiometricPattern): number {
  // Calculate similarity score (0-100)
  // Compare statistical signatures
  
  const meanDiff = Math.abs(pattern1.mean - pattern2.mean);
  const stdDiff = Math.abs(pattern1.std_dev - pattern2.std_dev);
  const p50Diff = Math.abs(pattern1.p50 - pattern2.p50);
  
  // Lower difference = higher match
  const maxDiff = 100; // Max expected difference
  const meanSimilarity = Math.max(0, 100 - (meanDiff / maxDiff) * 100);
  const stdSimilarity = Math.max(0, 100 - (stdDiff / maxDiff) * 100);
  const p50Similarity = Math.max(0, 100 - (p50Diff / maxDiff) * 100);
  
  // Weighted average (median is most important)
  const matchScore = (meanSimilarity * 0.3 + stdSimilarity * 0.2 + p50Similarity * 0.5);
  
  return Math.round(matchScore);
}

export function isGoodQualityProfile(pattern: BiometricPattern): boolean {
  // Only use if we have >50 samples AND quality score >60
  return pattern.sample_count >= 50 && pattern.quality_score >= 60;
}
