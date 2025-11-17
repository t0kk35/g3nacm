import { z } from 'zod';
import { AIToolDefinition } from '../types';
import { authorizedPost } from '@/lib/org-filtering';

const filterSchema = z.object({
  field: z.string().describe('Field to filter on'),
  operator: z.enum(['equals', 'not_equals', 'in', 'not_in', 'greater_than', 'less_than']).describe('Filter operator'),
  value: z.union([z.string(), z.number(), z.array(z.string())]).describe('Filter value(s)')
});

const orderBySchema = z.object({
  field: z.enum(['count', 'sum_amount', 'avg_amount', 'min_amount', 'max_amount', 'stddev_amount', 'median_amount']).describe('Field to order by'),
  direction: z.enum(['asc', 'desc']).default('desc').describe('Sort direction')
});

const transactionAggregationSchema = z.object({
  subjectId: z.string().describe('The subject ID to analyze transactions for'),
  contextDate: z.string().optional().describe('The reference date for analysis in ISO format (YYYY-MM-DD). When provided, analysis looks back from this date instead of current date. Useful for investigating historical alerts.'),
  timeRange: z.string().default('90d').describe('Time range for analysis (e.g., "30d", "90d", "1y")'),
  groupBy: z.array(z.enum([
    // Entity fields
    'counter_party_name', 'counter_party_country', 'booking_type', 
    'credit_debit', 'currency_orig', 'currency_base', 'channel', 'product_id',
    // Time fields
    'day', 'week', 'month', 'quarter', 'year', 'hour', 'day_of_week'
  ])).min(1).describe('Fields to group by - can include entity fields and time dimensions'),
  amountField: z.enum(['amount_base', 'amount_orig']).default('amount_base').describe('Amount field to aggregate'),
  filters: z.array(filterSchema).optional().describe('Optional filters to apply'),
  orderBy: orderBySchema.optional().describe('Optional ordering'),
  limit: z.number().optional().describe('Maximum number of results to return')
});

export const transactionAggregationTool: AIToolDefinition = {
  name: 'transaction-aggregation',
  description: 'Perform flexible aggregations on GL transactions. Group by entity fields (counterparty, country, booking type, etc.) and/or time dimensions (day, week, month, etc.). Returns comprehensive metrics for each group including count, sum, average, min, max, standard deviation, and median. Perfect for trend analysis, pattern detection, and comparative analysis. Supports historical analysis by specifying a context date to analyze patterns as they were at a specific point in time.',
  inputSchema: transactionAggregationSchema,
  handler: async (params) => {
    const { subjectId, contextDate, timeRange, groupBy, amountField, filters, orderBy, limit } = params;
    
    try {
      const response = await authorizedPost(`${process.env.DATA_URL}/api/data/transaction/gl/aggregation`, 
        JSON.stringify({
          subjectId,
          contextDate,
          timeRange,
          groupBy,
          amountField,
          filters,
          orderBy,
          limit
        })
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        id: `transaction-aggregation-${subjectId}-${Date.now()}`,
        toolName: 'transaction-aggregation',
        data: {
          aggregation: data,
          analysisParameters: {
            subjectId,
            contextDate,
            timeRange,
            groupBy,
            amountField,
            filters,
            orderBy,
            limit
          },
          summary: {
            totalGroups: data.totalRows,
            groupingDimensions: groupBy,
            timeRange: timeRange,
            amountField: amountField
          }
        }
      };
    } catch (error) {
      console.error('Error fetching transaction aggregation:', error);
      return {
        id: `transaction-aggregation-error-${Date.now()}`,
        toolName: 'transaction-aggregation',
        data: {
          error: 'Failed to fetch transaction aggregation',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
};