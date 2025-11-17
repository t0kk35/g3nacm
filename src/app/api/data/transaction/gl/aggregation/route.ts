'use server'

import { auth } from "@/auth";
import * as db from "@/db";
import { ErrorCreators } from "@/lib/api-error-handling";
import { NextRequest, NextResponse } from "next/server";
import { calculateDailyPeriods, calculateWeeklyPeriods, calculateMonthlyPeriods } from "@/lib/date-time/period-calculator";

const origin = 'api/data/transaction/gl/aggregation'

// Valid grouping fields
const ENTITY_FIELDS = [
  'counter_party_name', 'counter_party_country', 'booking_type', 
  'credit_debit', 'currency_orig', 'currency_base', 'channel', 'product_id'
];

const TIME_FIELDS = [
  'day', 'week', 'month', 'quarter', 'year', 'hour', 'day_of_week'
];

const VALID_GROUP_FIELDS = [...ENTITY_FIELDS, ...TIME_FIELDS];

const VALID_AMOUNT_FIELDS = ['amount_base', 'amount_orig'];

const VALID_ORDER_FIELDS = [
  'count', 'sum_amount', 'avg_amount', 'min_amount', 'max_amount', 'stddev_amount', 'median_amount'
];

const VALID_OPERATORS = ['equals', 'not_equals', 'in', 'not_in', 'greater_than', 'less_than'];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return ErrorCreators.auth.missingSession(origin);
  const user = session.user;
  if (!user?.name) return ErrorCreators.auth.missingUser(origin);

  try {
    const body = await request.json();
    
    // Validate required parameters
    if (!body.subjectId) {
      return ErrorCreators.param.bodyMissing(origin, 'subjectId');
    }
    
    if (!body.groupBy || !Array.isArray(body.groupBy) || body.groupBy.length === 0) {
      return ErrorCreators.param.bodyMissing(origin, 'groupBy');
    }
    
    // Validate groupBy fields
    const invalidGroupFields = body.groupBy.filter((field: string) => !VALID_GROUP_FIELDS.includes(field));
    if (invalidGroupFields.length > 0) {
      return ErrorCreators.param.typeInvalid(origin, 'groupBy', `valid group fields: ${VALID_GROUP_FIELDS.join(', ')}`, invalidGroupFields.join(', '));
    }
    
    // Validate amountField
    const amountField = body.amountField || 'amount_base';
    if (!VALID_AMOUNT_FIELDS.includes(amountField)) {
      return ErrorCreators.param.typeInvalid(origin, 'amountField', `valid amount fields: ${VALID_AMOUNT_FIELDS.join(', ')}`, amountField);
    }
    
    // Validate orderBy
    if (body.orderBy && !VALID_ORDER_FIELDS.includes(body.orderBy.field)) {
      return ErrorCreators.param.typeInvalid(origin, 'orderBy.field', `valid order fields: ${VALID_ORDER_FIELDS.join(', ')}`, body.orderBy.field);
    }
    
    // Validate filters
    if (body.filters) {
      for (const filter of body.filters) {
        if (!VALID_OPERATORS.includes(filter.operator)) {
          return ErrorCreators.param.typeInvalid(origin, 'filter.operator', `valid operators: ${VALID_OPERATORS.join(', ')}`, filter.operator);
        }
      }
    }
    
    const timeRange = body.timeRange || '90d';
    const contextDate = body.contextDate;
    const timeFilter = getTimeRangeFilter(timeRange, contextDate);
    
    const aggregationResult = await generateAggregationViaSQL(
      user.name,
      body.subjectId,
      timeFilter,
      body.groupBy,
      amountField,
      body.filters || [],
      body.orderBy,
      body.limit,
      timeRange
    );
    
    return NextResponse.json(aggregationResult);
    
  } catch (error) {
    console.error('Error generating transaction aggregation:', error);
    return ErrorCreators.db.queryFailed(origin, 'generate transaction aggregation', error as Error);
  }
}

async function generateAggregationViaSQL(
  username: string,
  subjectId: string,
  timeFilter: {start: Date, end: Date},
  groupBy: string[],
  amountField: string,
  filters: any[],
  orderBy: any,
  limit: number | undefined,
  timeRange: string
) {
  // Build base filters with calendar-aligned period boundaries
  const baseFilters = [`u.name = $1`, `tgl.subject_id = $2`, `tgl.submit_date_time >= $3`, `tgl.submit_date_time <= $4`];
  const values: any[] = [username, subjectId, timeFilter.start, timeFilter.end];
  
  // Add custom filters
  filters.forEach(filter => {
    const paramIndex = values.length + 1;
    const fieldName = getFieldMapping(filter.field);
    
    switch (filter.operator) {
      case 'equals':
        baseFilters.push(`${fieldName} = $${paramIndex}`);
        values.push(filter.value);
        break;
      case 'not_equals':
        baseFilters.push(`${fieldName} != $${paramIndex}`);
        values.push(filter.value);
        break;
      case 'in':
        baseFilters.push(`${fieldName} = ANY($${paramIndex})`);
        values.push(Array.isArray(filter.value) ? filter.value : [filter.value]);
        break;
      case 'not_in':
        baseFilters.push(`${fieldName} != ALL($${paramIndex})`);
        values.push(Array.isArray(filter.value) ? filter.value : [filter.value]);
        break;
      case 'greater_than':
        baseFilters.push(`${fieldName} > $${paramIndex}`);
        values.push(filter.value);
        break;
      case 'less_than':
        baseFilters.push(`${fieldName} < $${paramIndex}`);
        values.push(filter.value);
        break;
    }
  });
  
  const whereClause = baseFilters.join(' AND ');
  
  // Build SELECT clause with time expressions and grouping
  const selectFields = groupBy.map(field => {
    if (TIME_FIELDS.includes(field)) {
      return getTimeExpression(field);
    } else {
      return `${getFieldMapping(field)} as ${field}`;
    }
  });
  
  const groupByClause = groupBy.map((field, index) => {
    if (TIME_FIELDS.includes(field)) {
      return `${index + 1}`; // Reference by position for time expressions
    } else {
      return getFieldMapping(field);
    }
  }).join(', ');
  
  // Build ORDER BY clause
  let orderByClause = '';
  if (orderBy) {
    const orderField = orderBy.field;
    const direction = orderBy.direction || 'desc';
    orderByClause = `ORDER BY ${orderField} ${direction}`;
  }
  
  // Build LIMIT clause
  const limitClause = limit ? `LIMIT ${limit}` : '';
  
  const query = {
    name: 'transaction_aggregation',
    text: `
      SELECT 
        ${selectFields.join(', ')},
        COUNT(*) as count,
        COALESCE(SUM(${amountField}), 0) as sum_amount,
        COALESCE(AVG(${amountField}), 0) as avg_amount,
        COALESCE(MIN(${amountField}), 0) as min_amount,
        COALESCE(MAX(${amountField}), 0) as max_amount,
        COALESCE(STDDEV(${amountField}), 0) as stddev_amount,
        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${amountField}), 0) as median_amount
      FROM trx_general_ledger tgl
      JOIN subject_base sb ON tgl.subject_id = sb.id
      JOIN product_base pb ON tgl.product_id = pb.id
      JOIN org_unit ou ON ou.code = tgl.org_unit_code
      JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
      JOIN users u ON ouap.user_id = u.id
      WHERE ${whereClause}
      GROUP BY ${groupByClause}
      ${orderByClause}
      ${limitClause}
    `,
    values
  };
  
  const result = await db.pool.query(query);
  
  return {
    subjectId,
    analysisPeriod: timeRange,
    groupBy,
    amountField,
    results: result.rows,
    totalRows: result.rows.length
  };
}

function getFieldMapping(field: string): string {
  const mappings: Record<string, string> = {
    'counter_party_name': 'tgl.counter_party_name',
    'counter_party_country': 'tgl.counter_party_country',
    'booking_type': 'tgl.booking_type',
    'credit_debit': 'tgl.credit_debit',
    'currency_orig': 'tgl.currency_orig',
    'currency_base': 'tgl.currency_base',
    'channel': 'tgl.channel',
    'product_id': 'tgl.product_id'
  };
  
  return mappings[field] || field;
}

function getTimeExpression(timeField: string): string {
  const expressions: Record<string, string> = {
    'day': `DATE(tgl.submit_date_time) as day`,
    'week': `DATE_TRUNC('week', tgl.submit_date_time)::date as week`,
    'month': `TO_CHAR(tgl.submit_date_time, 'YYYY-MM') as month`,
    'quarter': `TO_CHAR(tgl.submit_date_time, 'YYYY-"Q"Q') as quarter`,
    'year': `TO_CHAR(tgl.submit_date_time, 'YYYY') as year`,
    'hour': `EXTRACT(HOUR FROM tgl.submit_date_time) as hour`,
    'day_of_week': `EXTRACT(DOW FROM tgl.submit_date_time) as day_of_week`
  };
  
  return expressions[timeField] || timeField;
}

function getTimeRangeFilter(timeRange: string, contextDate?: string): {start: Date, end: Date} {
  const referenceDate = contextDate ? new Date(contextDate) : new Date();
  const value = parseInt(timeRange.slice(0, -1));
  const unit = timeRange.slice(-1);
  
  let periods;
  switch (unit) {
    case 'd':
      periods = calculateDailyPeriods(referenceDate, timeRange);
      break;
    case 'w':
      periods = calculateWeeklyPeriods(referenceDate, timeRange);
      break;
    case 'm':
      periods = calculateMonthlyPeriods(referenceDate, timeRange);
      break;
    case 'y':
      // Convert years to months for monthly calculation
      periods = calculateMonthlyPeriods(referenceDate, `${value * 12}m`);
      break;
    default:
      // Default to 90 days
      periods = calculateDailyPeriods(referenceDate, '90d');
  }
  
  // Find the earliest start and latest end across all periods
  const starts = periods.map(p => p.start);
  const ends = periods.map(p => p.end);
  
  return {
    start: new Date(Math.min(...starts.map(d => d.getTime()))),
    end: new Date(Math.max(...ends.map(d => d.getTime())))
  };
}