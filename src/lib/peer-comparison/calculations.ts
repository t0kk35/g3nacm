// Utility functions for peer comparison calculations

import {
  MetricComparison,
  StatisticalSummary,
} from '@/app/api/data/transaction/gl/peer_comparison/types';

/**
 * Calculate percentile rank using linear interpolation
 * @param value - Subject's value
 * @param percentiles - Peer percentile distribution {p10, p25, p50, p75, p90, p95, p99}
 * @returns Percentile rank 0-100
 */
export function calculatePercentileRank(
  value: number,
  percentiles: Record<string, number>
): number {
  const points = [
    { percentile: 10, value: percentiles.p10 },
    { percentile: 25, value: percentiles.p25 },
    { percentile: 50, value: percentiles.p50 },
    { percentile: 75, value: percentiles.p75 },
    { percentile: 90, value: percentiles.p90 },
    { percentile: 95, value: percentiles.p95 },
    { percentile: 99, value: percentiles.p99 },
  ];

  // Handle edge cases
  if (value <= percentiles.p10) {
    // Below p10: extrapolate downward
    return Math.max(0, (value / percentiles.p10) * 10);
  }
  if (value >= percentiles.p99) {
    // Above p99: extrapolate upward (cap at 100)
    const extrapolation = 99 + ((value - percentiles.p99) / percentiles.p99);
    return Math.min(100, extrapolation);
  }

  // Linear interpolation between points
  for (let i = 0; i < points.length - 1; i++) {
    if (value >= points[i].value && value <= points[i + 1].value) {
      const ratio =
        (value - points[i].value) / (points[i + 1].value - points[i].value);
      return (
        points[i].percentile +
        ratio * (points[i + 1].percentile - points[i].percentile)
      );
    }
  }

  return 50; // Fallback to median
}

/**
 * Calculate z-score (standard deviations from mean)
 * @param value - Subject's value
 * @param mean - Peer mean
 * @param stddev - Peer standard deviation
 * @returns Z-score
 */
export function calculateZScore(
  value: number,
  mean: number,
  stddev: number
): number {
  if (stddev === 0) return 0; // Avoid division by zero
  return (value - mean) / stddev;
}

/**
 * Get human-readable assessment from percentile rank
 * @param percentileRank - Percentile rank (0-100)
 * @returns Assessment category
 */
export function getAssessment(
  percentileRank: number
): 'well_below' | 'below' | 'typical' | 'above' | 'well_above' {
  if (percentileRank < 10) return 'well_below';
  if (percentileRank < 40) return 'below';
  if (percentileRank < 60) return 'typical';
  if (percentileRank < 90) return 'above';
  return 'well_above';
}

/**
 * Calculate ratio to median (subject value / peer median)
 * @param value - Subject's value
 * @param median - Peer median
 * @returns Ratio
 */
export function calculateRatioToMedian(
  value: number,
  median: number
): number {
  if (median === 0) return value === 0 ? 1 : Infinity;
  return value / median;
}

/**
 * Get quartile number (1-4) from percentile rank
 * @param percentileRank - Percentile rank (0-100)
 * @returns Quartile (1-4)
 */
export function getQuartile(percentileRank: number): 1 | 2 | 3 | 4 {
  if (percentileRank <= 25) return 1;
  if (percentileRank <= 50) return 2;
  if (percentileRank <= 75) return 3;
  return 4;
}

/**
 * Get outlier severity based on z-score
 * @param zScore - Z-score
 * @returns Outlier severity category
 */
export function getOutlierSeverity(
  zScore: number
): 'none' | 'mild' | 'moderate' | 'extreme' {
  const absZ = Math.abs(zScore);
  if (absZ > 3) return 'extreme'; // Beyond 3 sigma
  if (absZ > 2) return 'moderate'; // Beyond 2 sigma
  if (absZ > 1.5) return 'mild'; // Beyond 1.5 sigma
  return 'none';
}

/**
 * Check if value is beyond Tukey's fences (outlier detection)
 * @param value - Subject's value
 * @param p25 - 25th percentile
 * @param p75 - 75th percentile
 * @returns True if beyond whisker (outlier)
 */
export function isBeyondWhisker(
  value: number,
  p25: number,
  p75: number
): boolean {
  const iqr = p75 - p25;
  const lowerFence = p25 - 1.5 * iqr;
  const upperFence = p75 + 1.5 * iqr;
  return value < lowerFence || value > upperFence;
}

/**
 * Build comprehensive MetricComparison object
 * @param subjectValue - Subject's value for this metric
 * @param peerStats - Peer statistical summary
 * @param includeLog - Whether to include log-adjusted metrics
 * @param logSubjectValue - Log-transformed subject value
 * @param logPeerStats - Log-transformed peer stats
 * @returns Complete metric comparison
 */
export function buildMetricComparison(
  subjectValue: number,
  peerStats: {
    mean: number;
    stddev: number;
    median: number;
    min: number;
    max: number;
    percentiles: Record<string, number>;
  },
  includeLog: boolean = false,
  logSubjectValue?: number,
  logPeerStats?: {
    mean: number;
    stddev: number;
    percentiles: Record<string, number>;
  }
): MetricComparison {
  // Calculate IQR and CV
  const iqr = peerStats.percentiles.p75 - peerStats.percentiles.p25;
  const cv = peerStats.mean !== 0 ? peerStats.stddev / peerStats.mean : 0;

  // Positional metrics
  const percentileRank = calculatePercentileRank(
    subjectValue,
    peerStats.percentiles
  );
  const quartile = getQuartile(percentileRank);

  // Deviation metrics
  const zScore = calculateZScore(
    subjectValue,
    peerStats.mean,
    peerStats.stddev
  );
  const deviationFromMean = subjectValue - peerStats.mean;
  const deviationFromMedian = subjectValue - peerStats.median;

  // Ratio metrics
  const ratioToMean = peerStats.mean !== 0 ? subjectValue / peerStats.mean : 0;
  const ratioToMedian =
    peerStats.median !== 0 ? subjectValue / peerStats.median : 0;

  // Outlier detection
  const isOutlier = Math.abs(zScore) > 3;
  const isModerateOutlier = Math.abs(zScore) > 2;
  const beyondWhisker = isBeyondWhisker(
    subjectValue,
    peerStats.percentiles.p25,
    peerStats.percentiles.p75
  );

  // Assessment
  const assessment = getAssessment(percentileRank);
  const outlierSeverity = getOutlierSeverity(zScore);

  const result: MetricComparison = {
    subjectValue,
    peerMean: peerStats.mean,
    peerStddev: peerStats.stddev,
    peerMedian: peerStats.median,
    peerMin: peerStats.min,
    peerMax: peerStats.max,
    peerIQR: iqr,
    peerCV: cv,
    percentileRank,
    quartile,
    zScore,
    deviationFromMean,
    deviationFromMedian,
    ratioToMean,
    ratioToMedian,
    isOutlier,
    isModerateOutlier,
    isBeyondWhisker: beyondWhisker,
    assessment,
    outlierSeverity,
  };

  // Add log-adjusted metrics if requested
  if (includeLog && logSubjectValue !== undefined && logPeerStats) {
    result.logPercentileRank = calculatePercentileRank(
      logSubjectValue,
      logPeerStats.percentiles
    );
    result.logZScore = calculateZScore(
      logSubjectValue,
      logPeerStats.mean,
      logPeerStats.stddev
    );
  }

  return result;
}

/**
 * Build StatisticalSummary from peer benchmark data
 * @param mean - Mean value
 * @param stddev - Standard deviation
 * @param median - Median value
 * @param min - Minimum value
 * @param max - Maximum value
 * @param percentiles - Percentile object {p10, p25, p50, p75, p90, p95, p99}
 * @returns Statistical summary object
 */
export function buildStatisticalSummary(
  mean: number,
  stddev: number,
  median: number,
  min: number,
  max: number,
  percentiles: Record<string, number>
): StatisticalSummary {
  const range = max - min;
  const iqr = percentiles.p75 - percentiles.p25;
  const cv = mean !== 0 ? stddev / mean : 0;

  return {
    mean,
    stddev,
    median,
    min,
    max,
    range,
    iqr,
    cv,
    percentiles: {
      p10: percentiles.p10,
      p25: percentiles.p25,
      p50: percentiles.p50,
      p75: percentiles.p75,
      p90: percentiles.p90,
      p95: percentiles.p95,
      p99: percentiles.p99,
    },
  };
}

/**
 * Parse time range string (e.g., '30d', '4w', '6m') to days
 * @param timeRange - Time range string
 * @returns Number of days
 */
export function parseTimeRangeToDays(timeRange: string): number {
  const match = timeRange.match(/^(\d+)([dwmy])$/);
  if (!match) {
    throw new Error(
      `Invalid time range format: ${timeRange}. Expected format: 30d, 4w, 6m, 1y`
    );
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd':
      return value;
    case 'w':
      return value * 7;
    case 'm':
      return value * 30; // Approximate
    case 'y':
      return value * 365; // Approximate
    default:
      throw new Error(`Unknown time range unit: ${unit}`);
  }
}

/**
 * Calculate date range from time range string
 * @param timeRange - Time range string (e.g., '30d')
 * @param contextDate - Reference date (default: today)
 * @returns Object with startDate and endDate
 */
export function calculateDateRange(
  timeRange: string,
  contextDate?: string
): { startDate: Date; endDate: Date } {
  const days = parseTimeRangeToDays(timeRange);
  const endDate = contextDate ? new Date(contextDate) : new Date();

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);

  return { startDate, endDate };
}

/**
 * Format date to YYYY-MM-DD
 * @param date - Date object
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
