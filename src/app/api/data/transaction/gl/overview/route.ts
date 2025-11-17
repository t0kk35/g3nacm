'use server'

import { auth } from "@/auth";
import * as db from "@/db";
import { ErrorCreators } from "@/lib/api-error-handling";
import { NextRequest, NextResponse } from "next/server";
import { type TransactionOverview, type PeriodConfig, convertDailySummaryToTransactionSummary, calculateRiskIndicators } from "./metrics";
import { calculatePeriods, generateDateRanges } from "@/lib/date-time/period-calculator";

const origin = 'api/data/transaction/gl/overview'

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return ErrorCreators.auth.missingSession(origin);
  const user = session.user;
  if (!user?.name) return ErrorCreators.auth.missingUser(origin);

  const searchParams = request.nextUrl.searchParams;
  const subjectId = searchParams.get("subject_id");
  const periodsParam = searchParams.get("periods");
  const contextDate = searchParams.get("context_date");

  if (!subjectId) return ErrorCreators.param.urlMissing(origin, "subject_id");

  // Default periods configuration
  const defaultPeriods: PeriodConfig = {
    daily: "7d",
    weekly: "4w", 
    monthly: "6m"
  };

  const periods: PeriodConfig = periodsParam ? JSON.parse(periodsParam) : defaultPeriods;

  try {
    const overview = await generateMultiFrequencyOverview(
      user.name, 
      subjectId, 
      periods,
      contextDate
    );
    
    return NextResponse.json(overview);

  } catch (error) {
    console.error('Error generating transaction overview:', error);
    return ErrorCreators.db.queryFailed(origin, 'generate transaction overview', error as Error);
  }
}

async function generateMultiFrequencyOverview(
  username: string,
  subjectId: string, 
  periods: PeriodConfig,
  contextDate?: string | null
): Promise<TransactionOverview> {
  
  const referenceDate = contextDate ? new Date(contextDate) : new Date();
  const calculatedPeriods = calculatePeriods(referenceDate, periods);
  
  // Get subject identifier
  const subjectQuery = {
    name: 'get_subject_identifier',
    text: `
      SELECT sb.identifier as subject_identifier
      FROM subject_base sb
      JOIN org_unit ou ON ou.code = sb.org_unit_code
      JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
      JOIN users u ON ouap.user_id = u.id
      WHERE u.name = $1 AND sb.id = $2
    `,
    values: [username, subjectId]
  };
  
  const subjectResult = await db.pool.query(subjectQuery);
  const subjectIdentifier = subjectResult.rows[0]?.subject_identifier || '';
  
  // Process each frequency
  const dailySummaries = await processFrequencyPeriods(username, subjectId, calculatedPeriods.daily);
  const weeklySummaries = await processFrequencyPeriods(username, subjectId, calculatedPeriods.weekly);
  const monthlySummaries = await processFrequencyPeriods(username, subjectId, calculatedPeriods.monthly);
  
  return {
    subjectId,
    subjectIdentifier,
    analysisDate: referenceDate.toISOString(),
    requestedPeriods: periods,
    periods: {
      daily: dailySummaries,
      weekly: weeklySummaries,
      monthly: monthlySummaries
    }
  };
}

async function processFrequencyPeriods(
  username: string,
  subjectId: string,
  periods: Array<{start: Date, end: Date, type: 'complete' | 'partial', label: string}>
) {
  const results = [];
  
  for (const period of periods) {
    const dateRanges = generateDateRanges([period]);
    const startDate = dateRanges[0].start;
    const endDate = dateRanges[0].end;
    
    // Query aggregated data from trx_daily_summary
    const query = {
      name: 'get_period_summary',
      text: `
        SELECT 
          SUM(total_transactions) as total_transactions,
          SUM(debit_transactions) as debit_transactions,
          SUM(credit_transactions) as credit_transactions,
          SUM(total_debit_amount) as total_debit_amount,
          SUM(total_credit_amount) as total_credit_amount,
          MIN(min_debit_amount) as min_debit_amount,
          MAX(max_debit_amount) as max_debit_amount,
          MIN(min_credit_amount) as min_credit_amount,
          MAX(max_credit_amount) as max_credit_amount,
          SUM(distinct_counterparties) as distinct_counterparties,
          SUM(distinct_countries) as distinct_countries,
          SUM(distinct_booking_types) as distinct_booking_types,
          SUM(distinct_products) as distinct_products,
          SUM(distinct_channels) as distinct_channels,
          SUM(high_risk_country_transactions) as high_risk_country_transactions,
          SUM(tax_haven_transactions) as tax_haven_transactions,
          SUM(terrorist_haven_transactions) as terrorist_haven_transactions,
          SUM(fatf_flag_transactions) as fatf_flag_transactions,
          SUM(cross_currency_transactions) as cross_currency_transactions,
          SUM(unusual_hours_transactions) as unusual_hours_transactions,
          SUM(weekend_transactions) as weekend_transactions,
          -- Aggregate top patterns (taking first non-null)
          (
            SELECT top_countries FROM trx_daily_summary tds2
            WHERE tds2.subject_id = $2 
              AND tds2.transaction_date BETWEEN $3 AND $4
              AND tds2.top_countries IS NOT NULL
            ORDER BY tds2.transaction_date DESC
            LIMIT 1
          ) as top_countries,
          (
            SELECT top_booking_types FROM trx_daily_summary tds2
            WHERE tds2.subject_id = $2 
              AND tds2.transaction_date BETWEEN $3 AND $4
              AND tds2.top_booking_types IS NOT NULL
            ORDER BY tds2.transaction_date DESC
            LIMIT 1
          ) as top_booking_types,
          (
            SELECT top_products FROM trx_daily_summary tds2
            WHERE tds2.subject_id = $2 
              AND tds2.transaction_date BETWEEN $3 AND $4
              AND tds2.top_products IS NOT NULL
            ORDER BY tds2.transaction_date DESC
            LIMIT 1
          ) as top_products,
          (
            SELECT top_channels FROM trx_daily_summary tds2
            WHERE tds2.subject_id = $2 
              AND tds2.transaction_date BETWEEN $3 AND $4
              AND tds2.top_channels IS NOT NULL
            ORDER BY tds2.transaction_date DESC
            LIMIT 1
          ) as top_channels
        FROM trx_daily_summary tds
        JOIN org_unit ou ON ou.code = tds.org_unit_code
        JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
        JOIN users u ON ouap.user_id = u.id
        WHERE u.name = $1 
          AND tds.subject_id = $2 
          AND tds.transaction_date BETWEEN $3 AND $4
      `,
      values: [username, subjectId, startDate, endDate]
    };
    
    const result = await db.pool.query(query);
    
    if (result.rows.length > 0 && result.rows[0].total_transactions > 0) {
      const summary = convertDailySummaryToTransactionSummary(
        result.rows[0],
        startDate,
        endDate,
        period.type,
        period.label
      );
      
      // Calculate risk indicators
      const summaryWithRisk = calculateRiskIndicators(summary);
      results.push(summaryWithRisk);
    } else {
      // Return empty summary for periods with no data
      results.push({
        periodStart: startDate,
        periodEnd: endDate,
        periodType: period.type,
        periodLabel: period.label,
        totalTransactions: 0,
        debitTransactions: 0,
        creditTransactions: 0,
        totalDebitAmount: 0,
        totalCreditAmount: 0,
        netPosition: 0,
        avgDebitAmount: 0,
        avgCreditAmount: 0,
        distinctCounterparties: 0,
        distinctCountries: 0,
        distinctBookingTypes: 0,
        distinctProducts: 0,
        distinctChannels: 0,
        highRiskCountryTransactions: 0,
        taxHavenTransactions: 0,
        terroristHavenTransactions: 0,
        fatfFlagTransactions: 0,
        crossCurrencyTransactions: 0,
        unusualHoursTransactions: 0,
        weekendTransactions: 0
      });
    }
  }
  
  return results;
}