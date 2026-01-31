// Type definitions for peer comparison API

export interface PeerComparisonResponse {
  subjectId: string;
  subjectIdentifier: string;
  subjectType: 'IND' | 'CRP';
  segment: string;
  orgUnitCode: string;
  analysisDate: string;
  timeRange: string;

  peerGroup: PeerGroupInfo;
  subjectMetrics: SubjectMetricsSummary;
  peerBenchmarks: PeerBenchmarks;
  comparison: ComparisonMetrics;
}

export interface PeerGroupInfo {
  peerCount: number;
  totalPeerDays: number;
  lowConfidence: boolean; // true if peerCount < 10
  sampled: boolean; // true if peer group was sampled rather than using all peers
  sampleSize?: number; // maximum sample size used (if sampled)
  groupCriteria: {
    orgUnitCode: string;
    segment: string;
    subjectType: 'IND' | 'CRP';
  };
}

export interface SubjectMetricsSummary {
  totalTransactions: number;
  debitTransactions: number;
  creditTransactions: number;
  totalDebitAmount: number;
  totalCreditAmount: number;
  distinctCounterparties: number;
  distinctCountries: number;
  distinctProducts: number;
  highRiskCountryRatio: number;
  crossCurrencyRatio: number;
  unusualHoursRatio: number;
  weekendRatio: number;
}

export interface PeerBenchmarks {
  // Raw metrics for human investigators
  raw?: {
    totalTransactions: StatisticalSummary;
    debitTransactions: StatisticalSummary;
    creditTransactions: StatisticalSummary;
    totalDebitAmount: StatisticalSummary;
    totalCreditAmount: StatisticalSummary;
    distinctCounterparties: StatisticalSummary;
    distinctCountries: StatisticalSummary;
    distinctProducts: StatisticalSummary;
  };

  // Log-adjusted metrics for AI/scoring
  log?: {
    totalDebitAmount: StatisticalSummary;
    totalCreditAmount: StatisticalSummary;
  };
}

export interface StatisticalSummary {
  mean: number;
  stddev: number;
  median: number;

  // Additional distributional metrics
  min: number;         // Minimum value in peer group
  max: number;         // Maximum value in peer group
  range: number;       // max - min
  iqr: number;         // Interquartile range (p75 - p25)
  cv: number;          // Coefficient of variation (stddev / mean) - relative variability
  skewness?: number;   // Distribution skewness (optional, computationally expensive)

  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
}

export interface ComparisonMetrics {
  // Comparison for each metric
  totalTransactions: MetricComparison;
  debitTransactions: MetricComparison;
  creditTransactions: MetricComparison;
  totalDebitAmount: MetricComparison;
  totalCreditAmount: MetricComparison;
  distinctCounterparties: MetricComparison;
  distinctCountries: MetricComparison;
  distinctProducts: MetricComparison;
}

export interface MetricComparison {
  subjectValue: number;

  // Peer distribution summary (for context)
  peerMean: number;
  peerStddev: number;      // Standard deviation
  peerMedian: number;
  peerMin: number;
  peerMax: number;
  peerIQR: number;         // Interquartile range (p75-p25)
  peerCV: number;          // Coefficient of variation (shows relative spread)

  // Positional metrics (where subject falls in distribution)
  percentileRank: number;  // 0-100, where subject falls in peer distribution
  quartile: 1 | 2 | 3 | 4; // Which quartile (Q1: 0-25, Q2: 25-50, Q3: 50-75, Q4: 75-100)

  // Deviation metrics (how different is subject from peers)
  zScore: number;               // (subject - mean) / stddev, standardized deviation
  deviationFromMean: number;    // Absolute difference: subject - mean
  deviationFromMedian: number;  // Absolute difference: subject - median

  // Ratio metrics (relative comparison)
  ratioToMean: number;     // subject / mean (e.g., 1.5 = 50% above mean)
  ratioToMedian: number;   // subject / median

  // Outlier detection
  isOutlier: boolean;      // true if |z-score| > 3 (3 sigma rule)
  isModerateOutlier: boolean; // true if |z-score| > 2
  isBeyondWhisker: boolean;   // true if beyond IQR * 1.5 (Tukey's fences)

  // Log-adjusted comparison (for AI/scoring) - only for amount fields
  logPercentileRank?: number;
  logZScore?: number;

  // Human-readable assessment
  assessment: 'well_below' | 'below' | 'typical' | 'above' | 'well_above';
  outlierSeverity: 'none' | 'mild' | 'moderate' | 'extreme';
}

// Database query result types (internal use)

// For aggregated peer benchmark query results (from the aggregation query, not raw table)
export interface AggregatedPeerBenchmarkRow {
  peer_count: string;
  total_peer_days: string;

  // All the aggregated metric fields
  total_transactions_mean: string;
  total_transactions_stddev: string;
  total_transactions_median: string;
  total_transactions_min: string;
  total_transactions_max: string;

  debit_transactions_mean: string;
  debit_transactions_stddev: string;
  debit_transactions_median: string;
  debit_transactions_min: string;
  debit_transactions_max: string;

  credit_transactions_mean: string;
  credit_transactions_stddev: string;
  credit_transactions_median: string;
  credit_transactions_min: string;
  credit_transactions_max: string;

  total_debit_amount_mean: string;
  total_debit_amount_stddev: string;
  total_debit_amount_median: string;
  total_debit_amount_min: string;
  total_debit_amount_max: string;

  total_credit_amount_mean: string;
  total_credit_amount_stddev: string;
  total_credit_amount_median: string;
  total_credit_amount_min: string;
  total_credit_amount_max: string;

  log_total_debit_amount_mean: string;
  log_total_debit_amount_stddev: string;
  log_total_credit_amount_mean: string;
  log_total_credit_amount_stddev: string;

  distinct_counterparties_mean: string;
  distinct_counterparties_stddev: string;
  distinct_counterparties_median: string;
  distinct_counterparties_min: string;
  distinct_counterparties_max: string;

  distinct_countries_mean: string;
  distinct_countries_stddev: string;
  distinct_countries_median: string;
  distinct_countries_min: string;
  distinct_countries_max: string;

  distinct_products_mean: string;
  distinct_products_stddev: string;
  distinct_products_median: string;
  distinct_products_min: string;
  distinct_products_max: string;

  high_risk_country_ratio_mean: string;
  high_risk_country_ratio_stddev: string;
  cross_currency_ratio_mean: string;
  cross_currency_ratio_stddev: string;
  unusual_hours_ratio_mean: string;
  unusual_hours_ratio_stddev: string;
  weekend_ratio_mean: string;
  weekend_ratio_stddev: string;

  // JSONB fields
  total_transactions_percentiles: any;
  total_debit_amount_percentiles: any;
  total_credit_amount_percentiles: any;
  distinct_counterparties_percentiles: any;
  log_total_debit_amount_percentiles: any;
  log_total_credit_amount_percentiles: any;
}

export interface SubjectAggregateRow {
  days_with_data: number;
  sum_total_transactions: string;
  sum_debit_transactions: string;
  sum_credit_transactions: string;
  sum_total_debit_amount: string;
  sum_total_credit_amount: string;
  sum_distinct_counterparties: string;
  sum_distinct_countries: string;
  sum_distinct_products: string;
  sum_high_risk_country_transactions: string;
  sum_cross_currency_transactions: string;
  sum_unusual_hours_transactions: string;
  sum_weekend_transactions: string;
}
