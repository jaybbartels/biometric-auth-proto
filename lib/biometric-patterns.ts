export interface BiometricPattern {
  mean: number;
  median: number;
  std_dev: number;
  variance: number;
  range: number;
  iqr: number;
  skewness: number;
  kurtosis: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  autocorrelation: number;
  entropy: number;
  peak_count: number;
  peak_mean_height: number;
  coefficient_of_variation: number;
  sample_count: number;
  quality_score: number;
}

export function calculatePattern(samples: number[]): BiometricPattern {
  if (samples.length === 0) return getEmptyPattern();
  const sorted = [...samples].sort((a, b) => a - b);
  const n = samples.length;
  const mean = samples.reduce((a, b) => a + b, 0) / n;
  const median = sorted[Math.floor(n * 0.5)];
  const variance = samples.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / n;
  const std_dev = Math.sqrt(variance);
  const range = sorted[n - 1] - sorted[0];
  const p25 = sorted[Math.floor(n * 0.25)];
  const p75 = sorted[Math.floor(n * 0.75)];
  const iqr = p75 - p25;
  const m3 = samples.reduce((sum, x) => sum + Math.pow(x - mean, 3), 0) / n;
  const skewness = std_dev === 0 ? 0 : m3 / Math.pow(std_dev, 3);
  const m4 = samples.reduce((sum, x) => sum + Math.pow(x - mean, 4), 0) / n;
  const kurtosis = std_dev === 0 ? 0 : (m4 / Math.pow(std_dev, 4)) - 3;
  const autocorr = calculateAutocorrelation(samples, 1);
  const entropyVal = calculateEntropy(samples);
  const peaks = detectPeaks(samples);
  const peak_count = peaks.length;
  const peak_mean_height = peaks.length > 0 ? peaks.reduce((a, b) => a + b, 0) / peaks.length : 0;
  const cv = mean === 0 ? 0 : (std_dev / mean);
  const sampleQuality = Math.min(100, (n / 100) * 100);
  const stabilityQuality = Math.max(0, 100 - (std_dev * 2));
  const entropyQuality = entropyVal * 100;
  const quality_score = Math.round((sampleQuality * 0.4 + stabilityQuality * 0.3 + entropyQuality * 0.3));
  return {
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    std_dev: Math.round(std_dev * 100) / 100,
    variance: Math.round(variance * 100) / 100,
    range: Math.round(range * 100) / 100,
    iqr: Math.round(iqr * 100) / 100,
    skewness: Math.round(skewness * 100) / 100,
    kurtosis: Math.round(kurtosis * 100) / 100,
    p5: sorted[Math.floor(n * 0.05)],
    p25,
    p50: median,
    p75,
    p95: sorted[Math.floor(n * 0.95)],
    autocorrelation: Math.round(autocorr * 100) / 100,
    entropy: Math.round(entropyVal * 100) / 100,
    peak_count,
    peak_mean_height: Math.round(peak_mean_height * 100) / 100,
    coefficient_of_variation: Math.round(cv * 100) / 100,
    sample_count: n,
    quality_score
  };
}

function calculateAutocorrelation(samples: number[], lag: number): number {
  if (samples.length <= lag) return 0;
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  let c0 = 0, c_lag = 0;
  for (let i = 0; i < samples.length; i++) c0 += Math.pow(samples[i] - mean, 2);
  for (let i = lag; i < samples.length; i++) c_lag += (samples[i] - mean) * (samples[i - lag] - mean);
  return c0 === 0 ? 0 : c_lag / c0;
}

function calculateEntropy(samples: number[]): number {
  if (samples.length === 0) return 0;
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const range = max - min || 1;
  const bins = 10;
  const histogram = new Array(bins).fill(0);
  for (const sample of samples) {
    const binIndex = Math.floor(((sample - min) / range) * (bins - 1));
    histogram[binIndex]++;
  }
  let entropy = 0;
  for (const count of histogram) {
    if (count > 0) {
      const p = count / samples.length;
      entropy -= p * Math.log2(p);
    }
  }
  return Math.min(1, entropy / Math.log2(bins));
}

function detectPeaks(samples: number[]): number[] {
  const peaks: number[] = [];
  for (let i = 1; i < samples.length - 1; i++) {
    if (samples[i] > samples[i - 1] && samples[i] > samples[i + 1]) peaks.push(samples[i]);
  }
  return peaks;
}

function getEmptyPattern(): BiometricPattern {
  return {
    mean: 0, median: 0, std_dev: 0, variance: 0, range: 0, iqr: 0,
    skewness: 0, kurtosis: 0, p5: 0, p25: 0, p50: 0, p75: 0, p95: 0,
    autocorrelation: 0, entropy: 0, peak_count: 0, peak_mean_height: 0,
    coefficient_of_variation: 0, sample_count: 0, quality_score: 0
  };
}

export function isGoodQualityProfile(pattern: BiometricPattern): boolean {
  return pattern.sample_count >= 100 && pattern.quality_score >= 65 && pattern.entropy >= 0.4;
}
