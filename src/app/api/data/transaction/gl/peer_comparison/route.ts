'use server';

import { auth } from '@/auth';
import { pool } from '@/db';
import { ErrorCreators } from '@/lib/api-error-handling';
import { NextRequest, NextResponse } from 'next/server';
import { PeerComparisonResponse, AggregatedPeerBenchmarkRow, SubjectAggregateRow, SubjectMetricsSummary, PeerBenchmarks, ComparisonMetrics, PeerGroupInfo } from './types';
import { calculateDateRange, formatDate, buildMetricComparison, buildStatisticalSummary } from '@/lib/peer-comparison/calculations';

const origin = 'api/data/transaction/gl/peer-comparison';

export async function GET(request: NextRequest) {
  // Authentication check
  const session = await auth();
  if (!session) return ErrorCreators.auth.missingSession(origin);
  const user = session.user;
  if (!user?.name) return ErrorCreators.auth.missingUser(origin);

  const searchParams = request.nextUrl.searchParams;
  const subjectId = searchParams.get('subject_id');
  const timeRange = searchParams.get('time_range') || '3m';
  const contextDate = searchParams.get('context_date');
  const includeRaw = searchParams.get('include_raw') !== 'false'; // default true
  const includeLog = searchParams.get('include_log') !== 'false'; // default true

  if (!subjectId) return ErrorCreators.param.urlMissing(origin, 'subject_id');

  try {
    const comparison = await generatePeerComparison(
      user.name,
      subjectId,
      timeRange,
      contextDate,
      includeRaw,
      includeLog
    );
    return NextResponse.json(comparison);
  } catch (error) {
    console.error('Error generating peer comparison:', error);
    return ErrorCreators.db.queryFailed(origin, 'Generate peer comparison', error as Error);
  }
}

async function generatePeerComparison(
  username: string,
  subjectId: string,
  timeRange: string,
  contextDate: string | null,
  includeRaw: boolean,
  includeLog: boolean
): Promise<PeerComparisonResponse> {
  // Calculate date range
  const { startDate, endDate } = calculateDateRange(timeRange, contextDate || undefined);
  const startDateStr = formatDate(startDate);
  const endDateStr = formatDate(endDate);
  const analysisDate = contextDate || formatDate(new Date());

  // Step 1: Get subject details (with org unit access control)
  const subjectQuery = {
    name: 'get_subject_for_peer_comparison',
    text: `
      SELECT sb.id, sb.identifier, sb.subject_type, sb.segment, sb.org_unit_code
      FROM subject_base sb
      JOIN org_unit ou ON sb.org_unit_code = ou.code
      JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
      JOIN users u ON ouap.user_id = u.id
      WHERE sb.id = $1 AND u.name = $2
    `,
    values: [subjectId, username],
  };

  const subjectResult = await pool.query(subjectQuery);

  if (subjectResult.rows.length === 0) {
    throw new Error('Subject not found or access denied');
  }

  const subject = subjectResult.rows[0];
  if (!subject.segment) {
    throw new Error(
      'Subject does not have a segment classification required for peer comparison'
    );
  }

  // Step 2: Get subject's aggregated metrics over time range
  const subjectMetricsQuery = {
    name: 'get_subject_aggregated_metrics',
    text: `
      SELECT
        COUNT(*) as days_with_data,
        COALESCE(SUM(total_transactions), 0) as sum_total_transactions,
        COALESCE(SUM(debit_transactions), 0) as sum_debit_transactions,
        COALESCE(SUM(credit_transactions), 0) as sum_credit_transactions,
        COALESCE(SUM(total_debit_amount), 0) as sum_total_debit_amount,
        COALESCE(SUM(total_credit_amount), 0) as sum_total_credit_amount,
        COALESCE(SUM(distinct_counterparties), 0) as sum_distinct_counterparties,
        COALESCE(SUM(distinct_countries), 0) as sum_distinct_countries,
        COALESCE(SUM(distinct_products), 0) as sum_distinct_products,
        COALESCE(SUM(high_risk_country_transactions), 0) as sum_high_risk_country_transactions,
        COALESCE(SUM(cross_currency_transactions), 0) as sum_cross_currency_transactions,
        COALESCE(SUM(unusual_hours_transactions), 0) as sum_unusual_hours_transactions,
        COALESCE(SUM(weekend_transactions), 0) as sum_weekend_transactions
      FROM trx_daily_summary
      WHERE subject_id = $1
        AND transaction_date >= $2
        AND transaction_date <= $3
    `,
    values: [subjectId, startDateStr, endDateStr],
  };

  const subjectMetricsResult = await pool.query<SubjectAggregateRow>(
    subjectMetricsQuery
  );
  const subjectAgg = subjectMetricsResult.rows[0];

  // Calculate subject metrics summary
  const totalTxn = Number(subjectAgg.sum_total_transactions);
  const subjectMetrics: SubjectMetricsSummary = {
    totalTransactions: totalTxn,
    debitTransactions: Number(subjectAgg.sum_debit_transactions),
    creditTransactions: Number(subjectAgg.sum_credit_transactions),
    totalDebitAmount: Number(subjectAgg.sum_total_debit_amount),
    totalCreditAmount: Number(subjectAgg.sum_total_credit_amount),
    distinctCounterparties: Number(subjectAgg.sum_distinct_counterparties),
    distinctCountries: Number(subjectAgg.sum_distinct_countries),
    distinctProducts: Number(subjectAgg.sum_distinct_products),
    highRiskCountryRatio: totalTxn > 0 ? Number(subjectAgg.sum_high_risk_country_transactions) / totalTxn : 0,
    crossCurrencyRatio: totalTxn > 0 ? Number(subjectAgg.sum_cross_currency_transactions) / totalTxn : 0,
    unusualHoursRatio: totalTxn > 0 ? Number(subjectAgg.sum_unusual_hours_transactions) / totalTxn : 0,
    weekendRatio: totalTxn > 0 ? Number(subjectAgg.sum_weekend_transactions) / totalTxn : 0,
  };

  // Step 3: Get total peer count (before sampling)
  const totalPeerCountQuery = {
    name: 'get_total_peer_count',
    text: `
      SELECT COUNT(*) as total_peer_count
      FROM subject_base sb
      WHERE sb.org_unit_code = $1
        AND sb.segment = $2
        AND sb.subject_type = $3
        AND sb.id != $4
    `,
    values: [subject.org_unit_code, subject.segment, subject.subject_type, subjectId],
  };

  const totalPeerCountResult = await pool.query<{ total_peer_count: string }>(totalPeerCountQuery);
  const totalPeerCount = Number(totalPeerCountResult.rows[0]?.total_peer_count || 0);

  // Step 4: Get peer benchmarks using statistical sampling
  // This approach uses subject_base to identify peers and samples up to PEER_SAMPLE_SIZE for statistics
  // This ensures consistent performance regardless of peer group size (even with millions of subjects)
  const PEER_SAMPLE_SIZE = 5000;
  const useSampling = totalPeerCount > PEER_SAMPLE_SIZE;

  const peerBenchmarksQuery = {
    name: 'get_calculate_txn_peer_comparison_aggregated',
    text: `
      WITH peer_subjects AS (
        -- Identify peer subjects from subject_base (fast lookup with indexed columns)
        ${useSampling ? `-- Sampling ${PEER_SAMPLE_SIZE} peers from ${totalPeerCount} total for performance` : '-- Using all peers (no sampling needed)'}
        SELECT sb.id as subject_id
        FROM subject_base sb
        WHERE sb.org_unit_code = $1
          AND sb.segment = $2
          AND sb.subject_type = $3
          AND sb.id != $6  -- Exclude the subject being compared
          ${useSampling ? `ORDER BY RANDOM()  -- Random sampling for statistical validity
          LIMIT ${PEER_SAMPLE_SIZE}` : ''}
      ),
      peer_totals AS (
        -- Aggregate each sampled peer's totals over the time period
        SELECT
          tds.subject_id,
          SUM(tds.total_transactions) as subject_total_transactions,
          SUM(tds.debit_transactions) as subject_debit_transactions,
          SUM(tds.credit_transactions) as subject_credit_transactions,
          SUM(tds.total_debit_amount) as subject_total_debit_amount,
          SUM(tds.total_credit_amount) as subject_total_credit_amount,
          SUM(tds.distinct_counterparties) as subject_distinct_counterparties,
          SUM(tds.distinct_countries) as subject_distinct_countries,
          SUM(tds.distinct_products) as subject_distinct_products,
          COUNT(*) as days_with_data
        FROM trx_daily_summary tds
        WHERE tds.subject_id IN (SELECT subject_id FROM peer_subjects)
          AND tds.transaction_date >= $4
          AND tds.transaction_date <= $5
        GROUP BY tds.subject_id
      )
      SELECT
        -- Sample size metrics
        COUNT(*) as peer_count,
        COALESCE(SUM(days_with_data), 0) as total_peer_days,

        -- Volume metrics - total_transactions
        COALESCE(AVG(subject_total_transactions), 0) as total_transactions_mean,
        COALESCE(STDDEV(subject_total_transactions), 0) as total_transactions_stddev,
        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY subject_total_transactions), 0) as total_transactions_median,
        COALESCE(MIN(subject_total_transactions), 0) as total_transactions_min,
        COALESCE(MAX(subject_total_transactions), 0) as total_transactions_max,

        -- Volume metrics - debit_transactions
        COALESCE(AVG(subject_debit_transactions), 0) as debit_transactions_mean,
        COALESCE(STDDEV(subject_debit_transactions), 0) as debit_transactions_stddev,
        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY subject_debit_transactions), 0) as debit_transactions_median,
        COALESCE(MIN(subject_debit_transactions), 0) as debit_transactions_min,
        COALESCE(MAX(subject_debit_transactions), 0) as debit_transactions_max,

        -- Volume metrics - credit_transactions
        COALESCE(AVG(subject_credit_transactions), 0) as credit_transactions_mean,
        COALESCE(STDDEV(subject_credit_transactions), 0) as credit_transactions_stddev,
        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY subject_credit_transactions), 0) as credit_transactions_median,
        COALESCE(MIN(subject_credit_transactions), 0) as credit_transactions_min,
        COALESCE(MAX(subject_credit_transactions), 0) as credit_transactions_max,

        -- Amount metrics - total_debit_amount
        COALESCE(AVG(subject_total_debit_amount), 0) as total_debit_amount_mean,
        COALESCE(STDDEV(subject_total_debit_amount), 0) as total_debit_amount_stddev,
        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY subject_total_debit_amount), 0) as total_debit_amount_median,
        COALESCE(MIN(subject_total_debit_amount), 0) as total_debit_amount_min,
        COALESCE(MAX(subject_total_debit_amount), 0) as total_debit_amount_max,

        -- Amount metrics - total_credit_amount
        COALESCE(AVG(subject_total_credit_amount), 0) as total_credit_amount_mean,
        COALESCE(STDDEV(subject_total_credit_amount), 0) as total_credit_amount_stddev,
        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY subject_total_credit_amount), 0) as total_credit_amount_median,
        COALESCE(MIN(subject_total_credit_amount), 0) as total_credit_amount_min,
        COALESCE(MAX(subject_total_credit_amount), 0) as total_credit_amount_max,

        -- Log-transformed amount metrics
        COALESCE(AVG(LN(subject_total_debit_amount + 1)), 0) as log_total_debit_amount_mean,
        COALESCE(STDDEV(LN(subject_total_debit_amount + 1)), 0) as log_total_debit_amount_stddev,
        COALESCE(AVG(LN(subject_total_credit_amount + 1)), 0) as log_total_credit_amount_mean,
        COALESCE(STDDEV(LN(subject_total_credit_amount + 1)), 0) as log_total_credit_amount_stddev,

        -- Diversity metrics - distinct_counterparties
        COALESCE(AVG(subject_distinct_counterparties), 0) as distinct_counterparties_mean,
        COALESCE(STDDEV(subject_distinct_counterparties), 0) as distinct_counterparties_stddev,
        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY subject_distinct_counterparties), 0) as distinct_counterparties_median,
        COALESCE(MIN(subject_distinct_counterparties), 0) as distinct_counterparties_min,
        COALESCE(MAX(subject_distinct_counterparties), 0) as distinct_counterparties_max,

        -- Diversity metrics - distinct_countries
        COALESCE(AVG(subject_distinct_countries), 0) as distinct_countries_mean,
        COALESCE(STDDEV(subject_distinct_countries), 0) as distinct_countries_stddev,
        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY subject_distinct_countries), 0) as distinct_countries_median,
        COALESCE(MIN(subject_distinct_countries), 0) as distinct_countries_min,
        COALESCE(MAX(subject_distinct_countries), 0) as distinct_countries_max,

        -- Diversity metrics - distinct_products
        COALESCE(AVG(subject_distinct_products), 0) as distinct_products_mean,
        COALESCE(STDDEV(subject_distinct_products), 0) as distinct_products_stddev,
        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY subject_distinct_products), 0) as distinct_products_median,
        COALESCE(MIN(subject_distinct_products), 0) as distinct_products_min,
        COALESCE(MAX(subject_distinct_products), 0) as distinct_products_max,

        -- Percentiles for key metrics
        json_build_object(
          'p10', PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY subject_total_transactions),
          'p25', PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY subject_total_transactions),
          'p50', PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY subject_total_transactions),
          'p75', PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY subject_total_transactions),
          'p90', PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY subject_total_transactions),
          'p95', PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY subject_total_transactions),
          'p99', PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY subject_total_transactions)
        ) as total_transactions_percentiles,

        json_build_object(
          'p10', PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY subject_total_debit_amount),
          'p25', PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY subject_total_debit_amount),
          'p50', PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY subject_total_debit_amount),
          'p75', PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY subject_total_debit_amount),
          'p90', PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY subject_total_debit_amount),
          'p95', PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY subject_total_debit_amount),
          'p99', PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY subject_total_debit_amount)
        ) as total_debit_amount_percentiles,

        json_build_object(
          'p10', PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY subject_total_credit_amount),
          'p25', PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY subject_total_credit_amount),
          'p50', PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY subject_total_credit_amount),
          'p75', PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY subject_total_credit_amount),
          'p90', PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY subject_total_credit_amount),
          'p95', PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY subject_total_credit_amount),
          'p99', PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY subject_total_credit_amount)
        ) as total_credit_amount_percentiles,

        json_build_object(
          'p10', PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY subject_distinct_counterparties),
          'p25', PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY subject_distinct_counterparties),
          'p50', PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY subject_distinct_counterparties),
          'p75', PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY subject_distinct_counterparties),
          'p90', PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY subject_distinct_counterparties),
          'p95', PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY subject_distinct_counterparties),
          'p99', PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY subject_distinct_counterparties)
        ) as distinct_counterparties_percentiles,

        json_build_object(
          'p10', PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY LN(subject_total_debit_amount + 1)),
          'p25', PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY LN(subject_total_debit_amount + 1)),
          'p50', PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY LN(subject_total_debit_amount + 1)),
          'p75', PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY LN(subject_total_debit_amount + 1)),
          'p90', PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY LN(subject_total_debit_amount + 1)),
          'p95', PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY LN(subject_total_debit_amount + 1)),
          'p99', PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY LN(subject_total_debit_amount + 1))
        ) as log_total_debit_amount_percentiles,

        json_build_object(
          'p10', PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY LN(subject_total_credit_amount + 1)),
          'p25', PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY LN(subject_total_credit_amount + 1)),
          'p50', PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY LN(subject_total_credit_amount + 1)),
          'p75', PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY LN(subject_total_credit_amount + 1)),
          'p90', PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY LN(subject_total_credit_amount + 1)),
          'p95', PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY LN(subject_total_credit_amount + 1)),
          'p99', PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY LN(subject_total_credit_amount + 1))
        ) as log_total_credit_amount_percentiles

      FROM peer_totals
    `,
    values: [
      subject.org_unit_code,
      subject.segment,
      subject.subject_type,
      startDateStr,
      endDateStr,
      subjectId,
    ],
  };

  const peerBenchmarksResult = await pool.query<AggregatedPeerBenchmarkRow>(
    peerBenchmarksQuery
  );

  if (peerBenchmarksResult.rows.length === 0 || totalPeerCount === 0) {
    throw new Error(
      `No peer subjects found for org_unit=${subject.org_unit_code}, segment=${subject.segment}, subject_type=${subject.subject_type}. Peer comparison requires at least one other subject in the same segment.`
    );
  }

  const peerData = peerBenchmarksResult.rows[0];
  const sampledPeerCount = Number(peerData.peer_count || 0);

  // Build peer group info
  const peerGroup: PeerGroupInfo = {
    peerCount: useSampling ? totalPeerCount : sampledPeerCount, // Total peer count in the group
    totalPeerDays: Number(peerData.total_peer_days),
    lowConfidence: sampledPeerCount < 10, // Based on actual sample size used for statistics
    sampled: useSampling,
    sampleSize: useSampling ? PEER_SAMPLE_SIZE : undefined,
    groupCriteria: {
      orgUnitCode: subject.org_unit_code,
      segment: subject.segment,
      subjectType: subject.subject_type,
    },
  };

  // Build peer benchmarks
  const peerBenchmarks: PeerBenchmarks = {};

  if (includeRaw) {
    peerBenchmarks.raw = {
      totalTransactions: buildStatisticalSummary(
        Number(peerData.total_transactions_mean),
        Number(peerData.total_transactions_stddev),
        Number(peerData.total_transactions_median),
        Number(peerData.total_transactions_min),
        Number(peerData.total_transactions_max),
        peerData.total_transactions_percentiles
      ),
      debitTransactions: buildStatisticalSummary(
        Number(peerData.debit_transactions_mean),
        Number(peerData.debit_transactions_stddev),
        Number(peerData.debit_transactions_median),
        Number(peerData.debit_transactions_min),
        Number(peerData.debit_transactions_max),
        {} as any // Note: We didn't aggregate debit_transactions_percentiles in the query
      ),
      creditTransactions: buildStatisticalSummary(
        Number(peerData.credit_transactions_mean),
        Number(peerData.credit_transactions_stddev),
        Number(peerData.credit_transactions_median),
        Number(peerData.credit_transactions_min),
        Number(peerData.credit_transactions_max),
        {} as any // Note: We didn't aggregate credit_transactions_percentiles in the query
      ),
      totalDebitAmount: buildStatisticalSummary(
        Number(peerData.total_debit_amount_mean),
        Number(peerData.total_debit_amount_stddev),
        Number(peerData.total_debit_amount_median),
        Number(peerData.total_debit_amount_min),
        Number(peerData.total_debit_amount_max),
        peerData.total_debit_amount_percentiles
      ),
      totalCreditAmount: buildStatisticalSummary(
        Number(peerData.total_credit_amount_mean),
        Number(peerData.total_credit_amount_stddev),
        Number(peerData.total_credit_amount_median),
        Number(peerData.total_credit_amount_min),
        Number(peerData.total_credit_amount_max),
        peerData.total_credit_amount_percentiles
      ),
      distinctCounterparties: buildStatisticalSummary(
        Number(peerData.distinct_counterparties_mean),
        Number(peerData.distinct_counterparties_stddev),
        Number(peerData.distinct_counterparties_median),
        Number(peerData.distinct_counterparties_min),
        Number(peerData.distinct_counterparties_max),
        peerData.distinct_counterparties_percentiles
      ),
      distinctCountries: buildStatisticalSummary(
        Number(peerData.distinct_countries_mean),
        Number(peerData.distinct_countries_stddev),
        Number(peerData.distinct_countries_median),
        Number(peerData.distinct_countries_min),
        Number(peerData.distinct_countries_max),
        {} as any
      ),
      distinctProducts: buildStatisticalSummary(
        Number(peerData.distinct_products_mean),
        Number(peerData.distinct_products_stddev),
        Number(peerData.distinct_products_median),
        Number(peerData.distinct_products_min),
        Number(peerData.distinct_products_max),
        {} as any
      ),
    };
  }

  if (includeLog) {
    peerBenchmarks.log = {
      totalDebitAmount: buildStatisticalSummary(
        Number(peerData.log_total_debit_amount_mean),
        Number(peerData.log_total_debit_amount_stddev),
        0, // No median for log
        0,
        0,
        peerData.log_total_debit_amount_percentiles
      ),
      totalCreditAmount: buildStatisticalSummary(
        Number(peerData.log_total_credit_amount_mean),
        Number(peerData.log_total_credit_amount_stddev),
        0, // No median for log
        0,
        0,
        peerData.log_total_credit_amount_percentiles
      ),
    };
  }

  // Build comparison metrics
  const comparison: ComparisonMetrics = {
    totalTransactions: buildMetricComparison(
      subjectMetrics.totalTransactions,
      {
        mean: Number(peerData.total_transactions_mean),
        stddev: Number(peerData.total_transactions_stddev),
        median: Number(peerData.total_transactions_median),
        min: Number(peerData.total_transactions_min),
        max: Number(peerData.total_transactions_max),
        percentiles: peerData.total_transactions_percentiles,
      }
    ),
    debitTransactions: buildMetricComparison(
      subjectMetrics.debitTransactions,
      {
        mean: Number(peerData.debit_transactions_mean),
        stddev: Number(peerData.debit_transactions_stddev),
        median: Number(peerData.debit_transactions_median),
        min: Number(peerData.debit_transactions_min),
        max: Number(peerData.debit_transactions_max),
        percentiles: { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 },
      }
    ),
    creditTransactions: buildMetricComparison(
      subjectMetrics.creditTransactions,
      {
        mean: Number(peerData.credit_transactions_mean),
        stddev: Number(peerData.credit_transactions_stddev),
        median: Number(peerData.credit_transactions_median),
        min: Number(peerData.credit_transactions_min),
        max: Number(peerData.credit_transactions_max),
        percentiles: { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 },
      }
    ),
    totalDebitAmount: buildMetricComparison(
      subjectMetrics.totalDebitAmount,
      {
        mean: Number(peerData.total_debit_amount_mean),
        stddev: Number(peerData.total_debit_amount_stddev),
        median: Number(peerData.total_debit_amount_median),
        min: Number(peerData.total_debit_amount_min),
        max: Number(peerData.total_debit_amount_max),
        percentiles: peerData.total_debit_amount_percentiles,
      },
      includeLog,
      includeLog ? Math.log(subjectMetrics.totalDebitAmount + 1) : undefined,
      includeLog
        ? {
            mean: Number(peerData.log_total_debit_amount_mean),
            stddev: Number(peerData.log_total_debit_amount_stddev),
            percentiles: peerData.log_total_debit_amount_percentiles,
          }
        : undefined
    ),
    totalCreditAmount: buildMetricComparison(
      subjectMetrics.totalCreditAmount,
      {
        mean: Number(peerData.total_credit_amount_mean),
        stddev: Number(peerData.total_credit_amount_stddev),
        median: Number(peerData.total_credit_amount_median),
        min: Number(peerData.total_credit_amount_min),
        max: Number(peerData.total_credit_amount_max),
        percentiles: peerData.total_credit_amount_percentiles,
      },
      includeLog,
      includeLog ? Math.log(subjectMetrics.totalCreditAmount + 1) : undefined,
      includeLog
        ? {
            mean: Number(peerData.log_total_credit_amount_mean),
            stddev: Number(peerData.log_total_credit_amount_stddev),
            percentiles: peerData.log_total_credit_amount_percentiles,
          }
        : undefined
    ),
    distinctCounterparties: buildMetricComparison(
      subjectMetrics.distinctCounterparties,
      {
        mean: Number(peerData.distinct_counterparties_mean),
        stddev: Number(peerData.distinct_counterparties_stddev),
        median: Number(peerData.distinct_counterparties_median),
        min: Number(peerData.distinct_counterparties_min),
        max: Number(peerData.distinct_counterparties_max),
        percentiles: peerData.distinct_counterparties_percentiles,
      }
    ),
    distinctCountries: buildMetricComparison(
      subjectMetrics.distinctCountries,
      {
        mean: Number(peerData.distinct_countries_mean),
        stddev: Number(peerData.distinct_countries_stddev),
        median: Number(peerData.distinct_countries_median),
        min: Number(peerData.distinct_countries_min),
        max: Number(peerData.distinct_countries_max),
        percentiles: { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 },
      }
    ),
    distinctProducts: buildMetricComparison(subjectMetrics.distinctProducts, {
      mean: Number(peerData.distinct_products_mean),
      stddev: Number(peerData.distinct_products_stddev),
      median: Number(peerData.distinct_products_median),
      min: Number(peerData.distinct_products_min),
      max: Number(peerData.distinct_products_max),
      percentiles: { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 },
    }),
  };

  // Return complete response
  return {
    subjectId,
    subjectIdentifier: subject.identifier,
    subjectType: subject.subject_type,
    segment: subject.segment,
    orgUnitCode: subject.org_unit_code,
    analysisDate,
    timeRange,
    peerGroup,
    subjectMetrics,
    peerBenchmarks,
    comparison,
  };
}
