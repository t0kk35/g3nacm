// Multi-frequency transaction overview for comprehensive AML behavioral analysis

export interface PeriodConfig {
  daily: string;   // e.g., "7d"
  weekly: string;  // e.g., "4w"
  monthly: string; // e.g., "6m"
}

export interface TransactionOverview {
  subjectId: string;
  subjectIdentifier: string;
  analysisDate: string;
  requestedPeriods: PeriodConfig;
  periods: {
    daily: TransactionSummary[];
    weekly: TransactionSummary[];
    monthly: TransactionSummary[];
  };
}

export interface TransactionSummary {
  periodStart: string;
  periodEnd: string;
  periodType: 'complete' | 'partial';
  periodLabel: string;
  
  // Volume metrics
  totalTransactions: number;
  debitTransactions: number;
  creditTransactions: number;
  totalDebitAmount: number;
  totalCreditAmount: number;
  netPosition: number;
  
  // Amount patterns
  minDebitAmount?: number;
  maxDebitAmount?: number;
  minCreditAmount?: number;
  maxCreditAmount?: number;
  avgDebitAmount: number;
  avgCreditAmount: number;
  
  // Diversity metrics
  distinctCounterparties: number;
  distinctCountries: number;
  distinctBookingTypes: number;
  distinctProducts: number;
  distinctChannels: number;
  
  // Risk indicators
  highRiskCountryTransactions: number;
  taxHavenTransactions: number;
  terroristHavenTransactions: number;
  fatfFlagTransactions: number;
  crossCurrencyTransactions: number;
  unusualHoursTransactions: number;
  weekendTransactions: number;
  
  // Top patterns
  topCountries?: Array<{country: string, count: number}>;
  topBookingTypes?: Array<{bookingType: string, count: number}>;
  topProducts?: Array<{productId: string, productIdentifier: string, count: number}>;
  topChannels?: Array<{channel: string, count: number}>;
  
  // Risk assessment
  riskScore?: number;
  riskIndicators?: {
    velocityAnomaly: boolean;
    amountAnomaly: boolean;
    diversityAnomaly: boolean;
    geographicRisk: boolean;
    temporalRisk: boolean;
  };
}

// Legacy interfaces - kept for backward compatibility
export interface SummaryMetrics {
  totalTransactions: number;
  debitTransactions: number;
  creditTransactions: number;
  totalDebitAmount: number;
  totalCreditAmount: number;
  netPosition: number;
  distinctCounterparties: number;
  distinctCountries: number;
  distinctProducts: number;
}

export interface RiskIndicators {
  velocityChanges: boolean;
  unusualGeography: boolean;
  amountAnomalies: boolean;
  imbalancedFlow: boolean;
  crossCurrencyActivity: boolean;
}

// Convert daily summary records to transaction summary format
export function convertDailySummaryToTransactionSummary(
  dailySummary: any, 
  periodStart: string, 
  periodEnd: string, 
  periodType: 'complete' | 'partial',
  periodLabel: string
): TransactionSummary {
  return {
    periodStart,
    periodEnd,
    periodType,
    periodLabel,
    
    // Volume metrics
    totalTransactions: dailySummary.total_transactions || 0,
    debitTransactions: dailySummary.debit_transactions || 0,
    creditTransactions: dailySummary.credit_transactions || 0,
    totalDebitAmount: parseFloat(dailySummary.total_debit_amount) || 0,
    totalCreditAmount: parseFloat(dailySummary.total_credit_amount) || 0,
    netPosition: (parseFloat(dailySummary.total_credit_amount) || 0) - (parseFloat(dailySummary.total_debit_amount) || 0),
    
    // Amount patterns
    minDebitAmount: dailySummary.min_debit_amount ? parseFloat(dailySummary.min_debit_amount) : undefined,
    maxDebitAmount: dailySummary.max_debit_amount ? parseFloat(dailySummary.max_debit_amount) : undefined,
    minCreditAmount: dailySummary.min_credit_amount ? parseFloat(dailySummary.min_credit_amount) : undefined,
    maxCreditAmount: dailySummary.max_credit_amount ? parseFloat(dailySummary.max_credit_amount) : undefined,
    avgDebitAmount: (dailySummary.debit_transactions || 0) > 0 ? 
      (parseFloat(dailySummary.total_debit_amount) || 0) / (dailySummary.debit_transactions || 1) : 0,
    avgCreditAmount: (dailySummary.credit_transactions || 0) > 0 ? 
      (parseFloat(dailySummary.total_credit_amount) || 0) / (dailySummary.credit_transactions || 1) : 0,
    
    // Diversity metrics
    distinctCounterparties: dailySummary.distinct_counterparties || 0,
    distinctCountries: dailySummary.distinct_countries || 0,
    distinctBookingTypes: dailySummary.distinct_booking_types || 0,
    distinctProducts: dailySummary.distinct_products || 0,
    distinctChannels: dailySummary.distinct_channels || 0,
    
    // Risk indicators
    highRiskCountryTransactions: dailySummary.high_risk_country_transactions || 0,
    taxHavenTransactions: dailySummary.tax_haven_transactions || 0,
    terroristHavenTransactions: dailySummary.terrorist_haven_transactions || 0,
    fatfFlagTransactions: dailySummary.fatf_flag_transactions || 0,
    crossCurrencyTransactions: dailySummary.cross_currency_transactions || 0,
    unusualHoursTransactions: dailySummary.unusual_hours_transactions || 0,
    weekendTransactions: dailySummary.weekend_transactions || 0,
    
    // Top patterns
    topCountries: dailySummary.top_countries || [],
    topBookingTypes: dailySummary.top_booking_types || [],
    topProducts: dailySummary.top_products || [],
    topChannels: dailySummary.top_channels || [],
  };
}

// Calculate risk indicators based on patterns
export function calculateRiskIndicators(summary: TransactionSummary): TransactionSummary {
  const riskIndicators = {
    velocityAnomaly: summary.totalTransactions > 100, // Simple threshold
    amountAnomaly: (summary.maxDebitAmount || 0) > 50000 || (summary.maxCreditAmount || 0) > 50000,
    diversityAnomaly: summary.distinctCountries > 10,
    geographicRisk: summary.highRiskCountryTransactions > 0,
    temporalRisk: summary.unusualHoursTransactions > 0 || summary.weekendTransactions > 0
  };
  
  // Simple risk score calculation (0-100)
  let riskScore = 0;
  if (riskIndicators.velocityAnomaly) riskScore += 20;
  if (riskIndicators.amountAnomaly) riskScore += 25;
  if (riskIndicators.diversityAnomaly) riskScore += 15;
  if (riskIndicators.geographicRisk) riskScore += 30;
  if (riskIndicators.temporalRisk) riskScore += 10;
  
  return {
    ...summary,
    riskScore,
    riskIndicators
  };
}

function calculateSummaryMetrics(transactions: any[]): SummaryMetrics {
  const debits = transactions.filter(t => t.credit_debit === 'D');
  const credits = transactions.filter(t => t.credit_debit === 'C');
  
  const totalDebitAmount = debits.reduce((sum, t) => sum + (t.amount_base || 0), 0);
  const totalCreditAmount = credits.reduce((sum, t) => sum + (t.amount_base || 0), 0);
  
  return {
    totalTransactions: transactions.length,
    debitTransactions: debits.length,
    creditTransactions: credits.length,
    totalDebitAmount,
    totalCreditAmount,
    netPosition: totalCreditAmount - totalDebitAmount,
    distinctCounterparties: new Set(transactions.map(t => t.counter_party_name).filter(Boolean)).size,
    distinctCountries: new Set(transactions.map(t => t.counter_party_country).filter(Boolean)).size,
    distinctProducts: new Set(transactions.map(t => t.product_id)).size
  };
}